import type { Context } from 'hono';

import { ErrorResponseSchema } from '@printsbytee/shared';

import type { AppEnv } from '../../../types.js';

import {
  undoSaleTx,
} from '../_shared/undo-sale.js';
import {
  SALE_NOT_FOUND_MESSAGE,
} from '../_shared/sale-helpers.js';
import { parseIdParam } from '../helpers.js';

/**
 * `DELETE /sales/:id` — undo a sale.
 *
 * Owner-only (mounted behind `requireSession` in
 * `apps/api/src/routes/sales/index.ts`). Returns 204 on success.
 *
 * Atomicity contract (`undoSaleTx` in `sales/_shared/undo-sale.ts`):
 *   - The transaction takes a `SELECT ... FOR UPDATE` lock on the
 *     Sale row (PK index), flips the owning BatchItem back to
 *     `status: 'sellable'` (bumping `updated_at`), then deletes the
 *     Sale row. Any failure rolls the whole thing back — a partial
 *     state (Sale row with a non-`sellable` item, or a deleted Sale
 *     with an item still flagged `sold`) is impossible.
 *
 *   - Ordering: status flip FIRST, then Sale delete. That way a
 *     concurrent read of the BatchItem sees a `sellable` item
 *     without a sale row (the canonical state), not a `sold` item
 *     with a missing sale row.
 *
 *   204                                — undo succeeded, no body
 *   400 { error: VALIDATION_ERROR }   — malformed id
 *   401 { error: UNAUTHORIZED }       — from requireSession
 *   404 { error: NOT_FOUND }          — id is well-formed but unknown
 */
export async function undoSale(c: Context<AppEnv>): Promise<Response> {
  const idResult = parseIdParam(c);
  if (!idResult.ok) return idResult.response;
  const saleId = idResult.id;

  // Resolve `now` once so the same timestamp flows to
  // `batch_items.updated_at` set inside the transaction.
  const now = new Date();

  const result = await undoSaleTx(saleId, now);
  if (!result.ok) {
    // `undoSaleTx` only fails on the SALE_NOT_FOUND path; map to 404
    // with the documented wire copy.
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: SALE_NOT_FOUND_MESSAGE,
        },
      }),
      404,
    );
  }

  return c.body(null, 204);
}