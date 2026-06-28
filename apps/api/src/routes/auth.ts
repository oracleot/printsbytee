import { Hono } from 'hono';
import { eq } from 'drizzle-orm';

import {
  AuthMeResponseSchema,
  ErrorResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  type User,
} from '@printsbytee/shared';

import { db } from '../db/client.js';
import { users } from '../db/schema/auth.js';
import type { AppEnv } from '../types.js';
import { requireSession } from '../middleware/requireSession.js';
import { verifyPassword } from '../services/passwords.js';
import { rateLimitLogin } from '../middleware/rateLimitLogin.js';
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  setSessionCookie,
} from '../services/sessions.js';

/**
 * Auth endpoints for the single owner account.
 *
 *   POST /auth/login    — none (creates a session)
 *   POST /auth/logout   — session (destroys the session)
 *   GET  /auth/me       — session (returns the current user)
 *
 * Session model: opaque random token stored as `sessions.id` and
 * delivered to the browser as an HttpOnly cookie. See
 * `src/services/sessions.ts` for token generation and cookie
 * attributes, and `src/middleware/requireSession.ts` for the
 * reusable auth gate that future write endpoints (I21–I25) will
 * mount.
 *
 * Security notes:
 *   - Failed-login responses are deliberately generic ("Invalid
 *     email or password") so probing clients cannot enumerate which
 *     emails have accounts. The internal `verifyPassword` is
 *     constant-time at the bcrypt layer regardless of match.
 *   - All three endpoints emit the canonical error envelope from
 *     `docs/api-surface.md`. No route returns the raw DB error
 *     string to the client.
 *   - Rate limiting is intentionally out of scope for I20 — the
 *     single-owner audience makes brute-force unrealistic. If a
 *     later issue introduces multi-user accounts or staff roles,
 *     per-IP and per-account throttling belongs in a separate
 *     middleware before this file.
 */

export const authApp = new Hono<AppEnv>();

/**
 * Shared 401 response shape used by both `/auth/login` (invalid
 * credentials) and `requireSession` (missing/expired token). Kept
 * as a single source so the message and code never drift.
 */
function unauthorized(message = 'Invalid email or password') {
  return {
    error: {
      code: 'UNAUTHORIZED' as const,
      message,
    },
  };
}

/** Map a `users` row to the wire-shape `User`. */
function toUserDto(row: { id: string; email: string; createdAt: Date }): User {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
  };
}

// ── POST /auth/login ────────────────────────────────────────────────────

authApp.post('/login', rateLimitLogin, async (c) => {
  // ── Parse body ────────────────────────────────────────────────────────
  // Hono throws a `SyntaxError` from `c.req.json()` when the body is
  // not valid JSON. Surface that as a 400 with the same envelope the
  // schema-parse path uses so clients only have to handle one shape.
  let body: unknown;
  try {
    body = await c.req.json();
  } catch (err: unknown) {
    if (!(err instanceof SyntaxError)) throw err;
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body must be valid JSON',
        },
      }),
      400,
    );
  }

  const parsed = LoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      }),
      400,
    );
  }

  // Normalise email to lowercase so the unique index on `users.email`
  // and the login lookup both treat `Owner@…` and `owner@…` as the
  // same account. Password is left as the user supplied it — bcrypt
  // comparison is exact-byte.
  const { email, password } = parsed.data;
  const normalisedEmail = email.trim().toLowerCase();

  // ── Look up the user ──────────────────────────────────────────────────
  // Indexed lookup on the unique `users.email` btree.
  const userRow = (
    await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.email, normalisedEmail))
      .limit(1)
  )[0];

  // ── Verify credentials ───────────────────────────────────────────────
  // When the user does not exist, we still call `verifyPassword`
  // against a known-bad hash so the request takes roughly the same
  // wall-clock time as a real mismatch. This makes timing-based
  // enumeration of which emails are registered harder.
  const passwordHash =
    userRow?.passwordHash ??
    // "$2a$12$" prefix + 22-char salt + 31-char hash = 60-char bcrypt
    // string. Using a static, deliberately invalid hash keeps the
    // fake-compare path realistic without ever matching.
    '$2a$12$abcdefghijklmnopqrstuuP9wLkH7VpZqZqvW8yqJqZqvW8yqJqZqv';
  const passwordOk = await verifyPassword(password, passwordHash);

  if (!userRow || !passwordOk) {
    return c.json(ErrorResponseSchema.parse(unauthorized()), 401);
  }

  // ── Issue session + cookie ────────────────────────────────────────────
  // The session row is written first; only after it commits do we set
  // the cookie. If the insert fails (e.g. DB outage) the global error
  // handler returns 500 and the client never sees a half-set cookie.
  const session = await createSession(userRow.id);
  setSessionCookie(c, session.id);

  return c.json(LoginResponseSchema.parse(toUserDto(userRow)), 200);
});

// ── POST /auth/logout ───────────────────────────────────────────────────
//
// Mounted behind `requireSession` so we know the cookie value points
// at a real row before we DELETE it. Without the middleware, a stale
// cookie would 204 with no DB action, which leaks no information but
// also lets attackers probe whether a session id is "still valid"
// just by hitting `/auth/logout` repeatedly. Behind the middleware,
// any unknown/expired token gets the same 401 as every other
// protected route, which is the documented contract.

authApp.post('/logout', requireSession, async (c) => {
  const sessionId = c.get('sessionId');
  // Delete the session row, then clear the cookie. Order matters:
  // clearing the cookie first would leave an orphaned session row
  // until the next sweep; deleting first leaves the cookie valid on
  // the client until the next page render, which is harmless because
  // the next request will hit `/auth/me`, fail, and the client will
  // discard the cookie then.
  await deleteSession(sessionId);
  clearSessionCookie(c);
  return c.body(null, 204);
});

// ── GET /auth/me ────────────────────────────────────────────────────────

authApp.get('/me', requireSession, async (c) => {
  // `requireSession` already populated `user` after verifying the
  // cookie against the DB. Re-validate the wire shape so a future
  // schema drift between DB row and shared contract fails loudly at
  // the edge instead of leaking bad JSON.
  const user = c.get('user');
  return c.json(AuthMeResponseSchema.parse(user), 200);
});