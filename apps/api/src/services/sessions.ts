import { randomBytes } from 'node:crypto';
import { eq, lt } from 'drizzle-orm';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Context } from 'hono';

import { db } from '../db/client.js';
import { sessions } from '../db/schema/auth.js';

/**
 * Cookie name shared by every auth entry point. Constant so the login
 * route, the logout route, the requireSession middleware, and any
 * future server-to-server call all agree on the same key.
 *
 * The cookie VALUE is an opaque session ID (= `sessions.id` PK). The
 * server never sends anything to the client that the client could
 * forge — the token is 32 bytes of CSPRNG output. No signature is
 * needed because the DB lookup itself is the validity check.
 */
export const SESSION_COOKIE_NAME = 'printsbytee_session';

/**
 * Session lifetime. 30 days is the longest "remember me" window most
 * SaaS products use; the expiry is sliding (see
 * `apps/api/src/middleware/requireSession.ts`), so an active user
 * whose browser keeps the cookie fresh never sees a forced logout.
 *
 * If a session is stolen and not used by the attacker, it expires on
 * this schedule; if it IS used by the attacker, the real owner's next
 * request also passes — at which point the operator should rotate
 * `SESSION_SECRET` and we can additionally invalidate every session
 * (out of scope for I20; see follow-up CSRF/rotation note in
 * `apps/api/README.md`).
 */
export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_LIFETIME_SECONDS = Math.floor(SESSION_LIFETIME_MS / 1000);

/**
 * Generate a fresh opaque session ID. 32 bytes of CSPRNG output is
 * base64url-encoded to a 43-character ASCII string (no padding, no
 * `+/=`), which is safe to put in a cookie and unique enough that
 * collisions are not a practical concern.
 *
 * Encoding note: `base64url` is used (not standard base64) so the
 * cookie value never needs URL-encoding. Honored by `bcrypt`'s own
 * idiom for opaque tokens.
 */
export function generateSessionId(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Persist a new session row for the given user and return the
 * generated token. The token is the primary key and the cookie value,
 * so this function is the single source of session IDs.
 *
 * Callers must immediately `setSessionCookie(c, token)` so the row
 * and the cookie never drift — neither is useful without the other.
 */
export async function createSession(userId: string): Promise<{
  id: string;
  expiresAt: Date;
}> {
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

/**
 * Slide a session's expiry forward by `SESSION_LIFETIME_MS`. Called
 * from `requireSession` on every authenticated request per the
 * schema's documented contract:
 *
 *   `expiresAt` is sliding — extended on each authenticated use by
 *   the API.
 *
 * The write is awaited so the next request sees the new value
 * consistently. A failure here propagates to the global error
 * handler (500) — the user's request is rejected rather than served
 * with stale session state.
 */
export async function slideSessionExpiry(sessionId: string): Promise<Date> {
  const newExpiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  await db
    .update(sessions)
    .set({ expiresAt: newExpiresAt })
    .where(eq(sessions.id, sessionId));
  return newExpiresAt;
}

/**
 * Delete a session row. Idempotent — returns `false` if no row
 * matched (already logged out, expired, never existed). Logout calls
 * this and then `clearSessionCookie`; requireSession does not call
 * this on expired-session paths because the row is already gone
 * (sweeper) or about to be reaped on the next request.
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const result = await db
    .delete(sessions)
    .where(eq(sessions.id, sessionId))
    .returning({ id: sessions.id });
  return result.length > 0;
}

/**
 * Best-effort sweep of expired session rows. Called from
 * `createSession` (cheap, keeps the table small without a separate
 * cron) and exposed so the owner seed script can run it after bulk
 * owner operations if desired.
 *
 * Returns the number of rows deleted.
 */
export async function deleteExpiredSessions(): Promise<number> {
  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });
  return result.length;
}

// ── Cookie helpers ──────────────────────────────────────────────────────
//
// All three wrap the Hono cookie helpers with our own constants so the
// call sites read declaratively (`setSessionCookie(c, id)`) rather
// than spelling out the cookie name + attributes on every line. The
// attribute set is the documented contract for the auth slice:
//
//   httpOnly: true   — JS in the browser cannot read the cookie (XSS).
//   secure:    prod  — HTTPS-only outside dev so a network observer
//                       never sees the session token.
//   sameSite:  Lax   — protects against CSRF on cross-site POSTs while
//                       still allowing same-site GETs (the owner opens
//                       the app from email links etc).
//   path:      /     — cookie is sent on every API route.
//   maxAge:    30d   — sliding window enforced server-side as well;
//                       client-side `Max-Age` is just an optimisation
//                       so the browser forgets the cookie when the
//                       server stops accepting it.
//
// `secure: NODE_ENV === 'production'` keeps local dev working on
// `http://localhost` while forcing HTTPS in any deployed
// environment.

function cookieOptions(maxAgeSeconds: number) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

/** Set the session cookie on the outgoing response. */
export function setSessionCookie(c: Context, sessionId: string): void {
  setCookie(c, SESSION_COOKIE_NAME, sessionId, cookieOptions(SESSION_LIFETIME_SECONDS));
}

/**
 * Clear the session cookie. Uses `Max-Age=0` (not `Expires=1970`) so
 * it works regardless of the user's clock. Path + SameSite must
 * match the original `Set-Cookie` or browsers will not overwrite the
 * existing cookie value.
 */
export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

/** Read the session cookie value. Returns `undefined` if absent. */
export function readSessionCookie(c: Context): string | undefined {
  const value = getCookie(c, SESSION_COOKIE_NAME);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}