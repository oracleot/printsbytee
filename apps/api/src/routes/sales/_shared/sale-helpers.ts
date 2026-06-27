import {
  ErrorResponseSchema,
  type RecordSaleRequest,
  type Sale as SaleDto,
} from '@printsbytee/shared';

import type {
  BatchItem as BatchItemRow,
  Sale as SaleRow,
} from '../../../db/schema/batches.js';

/**
 * Wire-shape + message constants for the I25 sale endpoints.
 *
 * Pinned as module constants so a future typo in the route handler
 * cannot drift the wire string and silently break client error
 * parsers. The unit test in
 * `apps/api/scripts/test-sale-message-pins.ts` asserts the exact
 * strings.
 */

/** Documented 409 message for `POST /batch-items/:id/sale` when the
 *  item already has a sale. Same message is used for the
 *  `SELECT ... FOR UPDATE` pre-check hit and the defensive `23505`
 *  UNIQUE-violation catch on `sales.batch_item_id`. */
export const BATCH_ITEM_ALREADY_SOLD_MESSAGE = 'Batch item is already sold';

/** Documented 404 message for `POST /batch-items/:id/sale` when the
 *  id is well-formed but unknown. */
export const BATCH_ITEM_NOT_FOUND_MESSAGE = 'Batch item not found';

/** Documented 404 message for `DELETE /sales/:id` when the id is
 *  well-formed but unknown. */
export const SALE_NOT_FOUND_MESSAGE = 'Sale not found';

// ── Pure helpers (unit-testable without a DB) ──────────────────────────

/**
 * Resolve the effective sale price and sold-at timestamp from the
 * parsed request body and the locked batch item row. Pure function
 * so a unit test can pin the contract without standing up Postgres.
 *
 * Defaults (per `docs/plan.md` § I25 and `docs/api-surface.md`
 * Sales section):
 *   - `salePrice` defaults to `item.plannedSalePrice` (frozen for
 *     the batch per ADR-0002).
 *   - `soldAt`    defaults to the `now` passed in by the caller.
 *
 * Why the `now` argument is taken by parameter (not via `new Date()`
 * inline):
 *   - The route handler resolves `now` once, BEFORE entering the
 *     transaction, and threads it through. This guarantees the same
 *     timestamp is used for `soldAt`, `batch_items.updatedAt`, and
 *     `sales.created_at` (via SQL `defaultNow()` on the INSERT path).
 *   - It also lets a unit test pin the exact `now` value used for
 *     the comparison.
 *
 * Note on `body.soldAt`: it arrives on the wire as an ISO timestamp
 * string (per `RecordSaleRequestSchema`), so we coerce it through
 * `new Date(...)` here. Postgres rejects invalid datetimes on the
 * INSERT; a route-level Zod parse has already accepted the string,
 * so any failure here is a 500 via the global error handler (which
 * is acceptable — the client sent garbage).
 *
 * Why this lives in `_shared/sale-helpers.ts` rather than the route
 * handler:
 *   - The defaults MUST be resolved *inside* the DB transaction,
 *     against the same row that the SELECT ... FOR UPDATE just
 *     locked. If the handler resolved them outside, a concurrent
 *     UPDATE on `plannedSalePrice` between the read and the
 *     transaction would silently use a stale snapshot price.
 *   - Pulling the resolution into a helper keeps the route handler
 *     linear and the test surface narrow.
 */
export function recordSaleDefaults(
  item: BatchItemRow,
  body: RecordSaleRequest,
  now: Date,
): { salePrice: number; soldAt: Date } {
  return {
    salePrice: body.salePrice ?? item.plannedSalePrice,
    soldAt: body.soldAt ? new Date(body.soldAt) : now,
  };
}

/**
 * Build the documented 409 envelope when an item is already sold.
 * Returns `null` if the item is still sellable so the caller can
 * `if (!response) { /* proceed *\/ }`.
 *
 * Pure function so a unit test can pin the wire shape without a DB.
 * The status code is always 409 — `code: 'CONFLICT'`.
 */
export function recordSaleResponse(
  item: { status: BatchItemRow['status'] },
): Response | null {
  if (item.status !== 'sold') return null;
  return new Response(
    JSON.stringify(
      ErrorResponseSchema.parse({
        error: {
          code: 'CONFLICT',
          message: BATCH_ITEM_ALREADY_SOLD_MESSAGE,
        },
      }),
    ),
    { status: 409, headers: { 'content-type': 'application/json' } },
  );
}

// ── Wire-shape conversion ───────────────────────────────────────────────

/** Convert a `sales` row from the DB layer to the wire shape
 *  (dates → ISO). Mirrors the pattern in
 *  `apps/api/src/routes/batch-items/helpers.ts#toBatchItemDto` and
 *  `apps/api/src/routes/batches/helpers.ts#toBatchDto`. */
export function toSaleDto(row: SaleRow): SaleDto {
  return {
    id: row.id,
    batchItemId: row.batchItemId,
    salePrice: row.salePrice,
    soldAt: row.soldAt.toISOString(),
    customerName: row.customerName,
    customerContact: row.customerContact,
    createdAt: row.createdAt.toISOString(),
  };
}