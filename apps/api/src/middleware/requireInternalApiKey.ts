import { timingSafeEqual as timingSafeEqualBuf } from 'crypto';
import { createMiddleware } from 'hono/factory';

import { ErrorResponseSchema } from '@printsbytee/shared';

/**
 * Constant for the Authorization header Bearer prefix.
 * RFC 6750 — The Bearer Token Type for OAuth 2.0.
 */
const BEARER_PREFIX = 'Bearer ';

/**
 * Hono middleware that enforces a shared INTERNAL_API_KEY on the
 * request Authorization header.
 *
 * This is the runtime enforcement for the trust boundary documented in
 * env.ts and the api-surface.md.  The key is required on cross-service
 * write endpoints that the website's proxies call — it prevents direct
 * public access to those routes while allowing the proxies (which
 * carry the key) to reach them.
 *
 * Security properties:
 *   - Fail-closed on every branch: missing header, malformed header,
 *     empty token, length mismatch, value mismatch — all return 401.
 *   - No information leak: error messages are deliberately generic
 *     ("Invalid API key") so a probing client cannot distinguish
 *     "missing" from "wrong" from "wrong-length".
 *   - Constant-time comparison via `crypto.timingSafeEqual` after a
 *     length pre-check (timingSafeEqual throws on length mismatch, so
 *     the pre-check is required and acceptable — the length itself
 *     does not leak the secret because it is a known constant).
 *   - No logging of the key value anywhere.
 *
 * @param expected - The valid INTERNAL_API_KEY loaded from env.
 */
export function requireInternalApiKey(expected: string) {
  return createMiddleware(async (c, next) => {
    const header = c.req.header('Authorization') ?? '';

    if (!header.startsWith(BEARER_PREFIX)) {
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid API key',
          },
        }),
        401,
      );
    }

    const provided = header.slice(BEARER_PREFIX.length);

    if (!provided) {
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid API key',
          },
        }),
        401,
      );
    }

    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(provided, 'utf8');

    // timingSafeEqual throws on length mismatch, so check lengths first.
    if (expectedBuf.length !== providedBuf.length) {
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid API key',
          },
        }),
        401,
      );
    }

    if (!timingSafeEqualBuf(expectedBuf, providedBuf)) {
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid API key',
          },
        }),
        401,
      );
    }

    return next();
  });
}