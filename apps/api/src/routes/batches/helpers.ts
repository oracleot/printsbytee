import type { Context } from 'hono';
import { z } from 'zod';

import {
  ErrorResponseSchema,
  type ProductionBatch,
  type ProductionCost,
  uuidSchema,
} from '@printsbytee/shared';

import type { ProductionBatch as ProductionBatchRow } from '../../db/schema/batches.js';
import type { AppEnv } from '../../types.js';

// ── Query-string coercion helpers ───────────────────────────────────────

/**
 * Optional ISO date filter shared by `GET /batches?from=&to=`. Both
 * sides are inclusive and use `production_batches.created_at`.
 *
 * Kept as plain string parsing here — the API surface documents these
 * as ISO dates; Zod's `z.string().datetime()` would over-constrain
 * clients (e.g. `2026-01-31` without a time component). The DB still
 * compares against timestamptz because we coerce at parse time.
 */
export const BatchListQuerySchema = z.object({
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
});

/**
 * Sum the four production-cost sub-fields per
 * `docs/api-surface.md` ("Computed totals returned on GET /batches/:id"):
 *   total = materials + logistics + salary + other
 *
 * Pure function so it stays unit-testable without standing up Postgres.
 * Lives here (not in `_shared/totals.ts`) so the unit test can import
 * it without pulling in the DB / env layer — same pattern as
 * `FK_CONSTRAINT_MESSAGES` in `products/helpers.ts`.
 */
export function productionCostTotal(cost: ProductionCost): number {
  return cost.materials + cost.logistics + cost.salary + cost.other;
}

/**
 * Convert a `production_batches` row from the DB layer to the wire
 * shape (dates → ISO). The `production_cost` jsonb column is returned
 * as-is — Drizzle's typed `$type<ProductionCostJson>()` keeps the
 * object shape stable across the boundary.
 *
 * Takes the Drizzle inferred row type (with `Date` timestamps) rather
 * than the shared Zod wire type so the `.toISOString()` call is
 * type-safe. Mirrors the pattern in
 * `apps/api/src/routes/products/helpers.ts#toProductDto`.
 */
export function toBatchDto(row: ProductionBatchRow): ProductionBatch {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Validate a `:id` path parameter as a UUID.
 *
 * Returns the parsed id on success, or a `Response` that the caller
 * should `return` directly. Splitting "validation failed" from
 * "validation succeeded" into two return values keeps the route body
 * linear without nested `if` ladders for every error path.
 *
 * Mirrors `apps/api/src/routes/products/helpers.ts#parseIdParam`
 * intentionally — see the agents.md rule about preferring local
 * duplication over premature refactors.
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
          message: 'Batch id must be a UUID',
        },
      }),
      400,
    ),
  };
}

/**
 * Parse a JSON request body and translate a `SyntaxError` from
 * `c.req.json()` into the canonical 400 envelope. Other thrown errors
 * (e.g. body-size limits from upstream) are re-thrown so the global
 * error handler sees them instead of being masked as a parse failure.
 *
 * Returns the parsed `unknown` body on success, or a `Response` that
 * the caller should `return` directly.
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