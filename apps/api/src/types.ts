import type { User } from '@printsbytee/shared';

/**
 * Variables that Hono `c.set(...)` can attach to the request context
 * for downstream handlers to read with `c.get(...)`.
 *
 * The middleware in `src/middleware/requireSession.ts` populates
 * `user` and `sessionId`; handlers behind that middleware (the future
 * write endpoints in I21–I25) read them back instead of re-running
 * the cookie → DB lookup.
 *
 * Keeping this in one file means the `AppEnv` type used by every
 * router picks up the same shape automatically — no per-route
 * `Hono<{ Variables: { … } }>` annotations are required.
 */
export type AppVariables = {
  /** The authenticated user, set by `requireSession`. */
  user: User;
  /** The session ID (= the cookie value), set by `requireSession`. */
  sessionId: string;
};

export type AppEnv = {
  Variables: AppVariables;
};