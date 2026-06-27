import type { Context } from 'hono';

import { ErrorResponseSchema, uuidSchema } from '@printsbytee/shared';

import type { AppEnv } from '../../types.js';

// ── Path / body parsing helpers (local copy, per agents.md) ─────────────

/**
 * Validate a `:id` path parameter as a UUID. Returns the parsed id
 * on success, or a `Response` the caller should `return` directly.
 *
 * Local copy of the same helper in `apps/api/src/routes/products/helpers.ts`,
 * `apps/api/src/routes/batches/helpers.ts`, and
 * `apps/api/src/routes/batch-items/helpers.ts`. The duplication is
 * intentional this iteration — `agents.md` prefers local copies over
 * premature shared-helper refactors (which risk pulling every route
 * module into one large change).
 *
 * Refactor only when the duplication crosses the 200-line/file cap.
 */
export function parseIdParam(
  c: Context<AppEnv>,
): { ok: true; id: string } | { ok: false; response: Response } {
  const parsed = uuidSchema.safeParse(c.req.param('id'));
  if (parsed.success) {
    return { ok: true, id: parsed.data };
  }
  return {
    ok: false,
    response: c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Sale id must be a UUID',
        },
      }),
      400,
    ),
  };
}

/**
 * Parse a JSON request body and translate a `SyntaxError` from
 * `c.req.json()` into the canonical 400 envelope. Other thrown
 * errors (e.g. body-size limits from upstream) are re-thrown so the
 * global error handler sees them.
 *
 * Local copy of the same helper from the products / batches /
 * batch-items route modules — see `parseIdParam` above for the
 * refactor rationale.
 */
export async function parseJsonBody(
  c: Context<AppEnv>,
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  try {
    const body = await c.req.json();
    return { ok: true, body };
  } catch (err: unknown) {
    if (!(err instanceof SyntaxError)) throw err;
    return {
      ok: false,
      response: c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request body must be valid JSON',
          },
        }),
        400,
      ),
    };
  }
}