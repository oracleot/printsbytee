import { eq } from 'drizzle-orm';

import type { RecordSaleRequest } from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import {
  batchItems,
  sales,
  type BatchItem as BatchItemRow,
  type Sale as SaleRow,
} from '../../../db/schema/batches.js';
import { PG_UNIQUE_VIOLATION, isPgError } from '../../products/helpers.js';

import { recordSaleDefaults } from './sale-helpers.js';

// Re-export the pure helpers and wire constants from `sale-helpers.js`
// so the route handler has a single import surface
// (`./record-sale.js`) for everything sale-recording-related. Keeps
// the handler linear and keeps the message constants next to the
// transactional helper that produces them.
export {
  BATCH_ITEM_ALREADY_SOLD_MESSAGE,
  BATCH_ITEM_NOT_FOUND_MESSAGE,
  recordSaleDefaults,
  recordSaleResponse,
} from './sale-helpers.js';

/**
 * Failure modes returned by `recordSaleTx`. Distinct codes so the
 * route handler can map them to the right envelope without
 * inspecting message strings.
 *
 *   BATCH_ITEM_NOT_FOUND         → 404 NOT_FOUND
 *   BATCH_ITEM_ALREADY_SOLD      → 409 CONFLICT (pre-check hit)
 *   BATCH_ITEM_ALREADY_SOLD_RACE → 409 CONFLICT (defensive — see below)
 */
export type RecordSaleFailure =
  | { code: 'BATCH_ITEM_NOT_FOUND' }
  | { code: 'BATCH_ITEM_ALREADY_SOLD' }
  | { code: 'BATCH_ITEM_ALREADY_SOLD_RACE' };

export type RecordSaleResult =
  | { ok: true; sale: SaleRow }
  | { ok: false; failure: RecordSaleFailure };

/**
 * Run the full `POST /batch-items/:id/sale` flow inside a single
 * `db.transaction(...)`. This is the headline guarantee of I25 — a
 * failure cannot leave a `sold` item with no Sale row or a Sale row
 * with a non-`sold` item.
 *
 * Steps (in this order, all on the same `tx`):
 *   1. `SELECT ... FOR UPDATE` on the BatchItem. PK lookup takes a
 *      row-level lock so a concurrent sale attempt for the same
 *      item blocks until this transaction commits/rolls back.
 *      Without the lock, two concurrent callers could both pass the
 *      "not sold yet" check and both INSERT, with the second one
 *      tripping `23505` UNIQUE on `sales_batch_item_id_unique`.
 *   2. If the row does not exist → `BATCH_ITEM_NOT_FOUND`.
 *   3. If the row's `status` is already `sold` →
 *      `BATCH_ITEM_ALREADY_SOLD` (the documented 409 message).
 *   4. Resolve `salePrice` / `soldAt` defaults from the locked row
 *      + request body (see `recordSaleDefaults` in `sale-helpers.ts`).
 *      Defaults MUST be resolved *inside* the transaction against the
 *      locked row — otherwise a concurrent UPDATE on
 *      `plannedSalePrice` between the read and the insert could
 *      silently use a stale snapshot price.
 *   5. INSERT the Sale row. If the INSERT trips `23505` UNIQUE on
 *      `sales_batch_item_id_unique` despite the lock (e.g. a manual
 *      DB edit or a future regression that drops the lock), surface
 *      as `BATCH_ITEM_ALREADY_SOLD_RACE` with the same 409 envelope.
 *   6. UPDATE the BatchItem to `status: 'sold'`, bumping
 *      `updatedAt`. `updatedAt` has a SQL `defaultNow()` but Drizzle
 *      does NOT auto-bump on UPDATE — set it explicitly.
 *   7. Return the inserted Sale row.
 *
 * Customer fields (`customerName`, `customerContact`) are stored
 * verbatim (after trimming) when provided; `null` when omitted.
 */
export async function recordSaleTx(
  batchItemId: string,
  body: RecordSaleRequest,
  now: Date,
): Promise<RecordSaleResult> {
  return await db.transaction(async (tx) => {
    // 1. SELECT ... FOR UPDATE — PK index lookup. The `for('update')`
    //    clause adds a row-level `FOR UPDATE` lock so concurrent
    //    sale attempts for the same item serialize through this
    //    transaction.
    const itemRows: BatchItemRow[] = await tx
      .select()
      .from(batchItems)
      .where(eq(batchItems.id, batchItemId))
      .for('update')
      .limit(1);

    const item = itemRows[0];

    // 2. 404 — id is well-formed but unknown.
    if (!item) {
      return {
        ok: false,
        failure: { code: 'BATCH_ITEM_NOT_FOUND' as const },
      };
    }

    // 3. 409 — already sold.
    if (item.status === 'sold') {
      return {
        ok: false,
        failure: { code: 'BATCH_ITEM_ALREADY_SOLD' as const },
      };
    }

    // 4. Resolve defaults INSIDE the transaction against the locked
    //    row, so `salePrice` reflects the current `plannedSalePrice`
    //    snapshot (ADR-0002).
    const { salePrice, soldAt } = recordSaleDefaults(item, body, now);

    // 5. INSERT the Sale row.
    let inserted: SaleRow[];
    try {
      inserted = await tx
        .insert(sales)
        .values({
          batchItemId: item.id,
          salePrice,
          soldAt,
          customerName: body.customerName?.trim() ?? null,
          customerContact: body.customerContact?.trim() ?? null,
        })
        .returning();
    } catch (err: unknown) {
      // Defensive — the row lock from step 1 should make a `23505`
      // UNIQUE on `sales_batch_item_id_unique` unreachable in
      // practice. Surface as the same 409 envelope if it ever fires
      // so the client cannot distinguish the race from the
      // pre-check hit.
      if (isPgError(err) && err.code === PG_UNIQUE_VIOLATION) {
        return {
          ok: false,
          failure: { code: 'BATCH_ITEM_ALREADY_SOLD_RACE' as const },
        };
      }
      throw err;
    }

    const sale = inserted[0];
    if (!sale) {
      // Defensive — `.returning()` either returns the row or throws.
      throw new Error('Sale insert returned no row');
    }

    // 6. Flip the BatchItem to `sold` and bump `updatedAt`.
    await tx
      .update(batchItems)
      .set({ status: 'sold', updatedAt: now })
      .where(eq(batchItems.id, item.id));

    // 7. Return the inserted Sale row.
    return { ok: true, sale };
  });
}