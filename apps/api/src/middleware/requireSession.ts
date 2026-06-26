import { and, eq, gt } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import type { User } from '@printsbytee/shared';

import { db } from '../db/client.js';
import { sessions, users } from '../db/schema/auth.js';
import type { AppEnv } from '../types.js';

import { ErrorResponseSchema } from '@printsbytee/shared';

import {
  readSessionCookie,
  slideSessionExpiry,
} from '../services/sessions.js';

/**
 * Hono middleware that requires a valid DB-backed session cookie.
 *
 * On success it:
 *   1. Reads `printsbytee_session` from the request cookie.
 *   2. Joins `sessions` → `users` on the user id, filtering by
 *      `expiresAt > now()` so expired rows are excluded at the DB.
 *   3. Slides the session's `expiresAt` forward (matches the schema
 *      comment: "expiresAt is sliding — extended on each
 *      authenticated use by the API").
 *   4. Attaches the resolved `User` and the session id to
 *      `c.set('user', ...)` / `c.set('sessionId', ...)` so handlers
 *      behind this middleware can read them with `c.get(...)`.
 *
 * On any failure (missing cookie, unknown token, expired session,
 * deleted user, deleted session row), it short-circuits with a
 * canonical `401 UNAUTHORIZED` envelope. The error message is
 * deliberately generic — "Authentication required" — so a probing
 * client cannot tell "no cookie" apart from "expired token".
 *
 * Why a JOIN in one round-trip rather than two queries:
 *   - One indexed lookup on `sessions.id` (PK) + one on `users.id`
 *     (PK via the FK).
 *   - The `expiresAt > now()` predicate uses the
 *     `sessions_expires_at_idx` declared in the schema.
 *   - No "session exists but user was deleted" race because
 *     `sessions.user_id → users.id` is `ON DELETE CASCADE`; a
 *     deleted user also removes their sessions atomically.
 */
export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const sessionId = readSessionCookie(c);
  if (!sessionId) {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      }),
      401,
    );
  }

  // Join sessions → users so we get the user row in the same lookup.
  // The `gt(sessions.expiresAt, now)` predicate lets Postgres reject
  // expired sessions via the expires_at index, instead of pulling the
  // row and re-checking in JS.
  const rows = await db
    .select({
      user: {
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) {
    // Either the session id is unknown, the session expired, or the
    // owning user was deleted. All three surface as the same generic
    // 401 so probing clients cannot distinguish them.
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      }),
      401,
    );
  }

  // Slide the expiry. Awaited so the response cannot race ahead of
  // the DB write — if the slide fails, we fall through to the global
  // error handler (500) rather than silently serving a request
  // against a session that may be considered expired by a subsequent
  // check.
  await slideSessionExpiry(sessionId);

  const user: User = {
    id: row.user.id,
    // Email is stored as-is; the API layer normalises to lowercase
    // before insert so lookups are case-insensitive. Return the
    // stored value as-is for display.
    email: row.user.email,
    createdAt: row.user.createdAt.toISOString(),
  };

  c.set('user', user);
  c.set('sessionId', sessionId);

  await next();
});