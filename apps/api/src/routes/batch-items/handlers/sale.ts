import type { Context } from 'hono';

import {
  ErrorResponseSchema,
  RecordSaleRequestSchema,
  SaleSchema,
} from '@printsbytee/shared';

import type { AppEnv } from '../../../types.js';

import {
  recordSaleTx,
} from '../../sales/_shared/record-sale.js';
import {
  BATCH_ITEM_ALREADY_SOLD_MESSAGE,
  BATCH_ITEM_NOT_FOUND_MESSAGE,
  toSaleDto,
} from '../../sales/_shared/sale-helpers.js';
import { parseIdParam, parseJsonBody } from '../helpers.js';

/**
 * `POST /batch-items/:id/sale` — record a sale.
 *
 * Owner-only (mounted behind `requireSession` in
 * `apps/api/src/routes/batch-items/index.ts`). Returns 201 with the
 * new `Sale` row on success.
 *
 * Body (`RecordSaleRequestSchema` in `packages/shared`):
 *   `{ salePrice?, soldAt?, customerName?, customerContact? }`
 *
 * Defaults (resolved INSIDE the transaction by `recordSaleTx`,
 * against the locked BatchItem row):
 *   - `salePrice` defaults to `item.plannedSalePrice`
 *     (ADR-0002 — frozen for the batch).
 *   - `soldAt` defaults to the wall-clock time captured before
 *     entering the transaction.
 *
 * Atomicity contract (`recordSaleTx` in `sales/_shared/record-sale.ts`):
 *   - The transaction takes a `SELECT ... FOR UPDATE` lock on the
 *     BatchItem (PK index), inserts the Sale row, then flips the
 *     BatchItem to `status: 'sold'`. Any failure rolls the whole
 *     thing back — a partial state (`sold` item with no Sale, or
 *     Sale with a non-`sold` item) is impossible.
 *
 *   201 { Sale }                        — recorded
 *   400 { error: VALIDATION_ERROR }    — malformed id, invalid JSON,
 *                                        or schema mismatch
 *   401 { error: UNAUTHORIZED }        — from requireSession
 *   404 { error: NOT_FOUND }           — id is well-formed but unknown
 *   409 { error: CONFLICT }            — item is already sold (both
 *                                        the pre-check hit and the
 *                                        defensive 23505 UNIQUE race
 *                                        surface with the same wire
 *                                        copy: `BATCH_ITEM_ALREADY_SOLD_MESSAGE`)
 */
export async function recordBatchItemSale(
  c: Context<AppEnv>,
): Promise<Response> {
  const idResult = parseIdParam(c);
  if (!idResult.ok) return idResult.response;
  const batchItemId = idResult.id;

  const json = await parseJsonBody(c);
  if (!json.ok) return json.response;

  const parsed = RecordSaleRequestSchema.safeParse(json.body);
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

  // Resolve `now` once, before entering the transaction, so the same
  // timestamp flows to `sales.sold_at` (when omitted) and to
  // `batch_items.updated_at` set inside the transaction.
  const now = new Date();

  const result = await recordSaleTx(batchItemId, parsed.data, now);
  if (!result.ok) {
    if (result.failure.code === 'BATCH_ITEM_NOT_FOUND') {
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'NOT_FOUND',
            message: BATCH_ITEM_NOT_FOUND_MESSAGE,
          },
        }),
        404,
      );
    }
    // Both `BATCH_ITEM_ALREADY_SOLD` (pre-check hit) and
    // `BATCH_ITEM_ALREADY_SOLD_RACE` (defensive 23505 catch) surface
    // with the same 409 envelope so the client cannot distinguish the
    // race from the pre-check hit.
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'CONFLICT',
          message: BATCH_ITEM_ALREADY_SOLD_MESSAGE,
        },
      }),
      409,
    );
  }

  return c.json(SaleSchema.parse(toSaleDto(result.sale)), 201);
}