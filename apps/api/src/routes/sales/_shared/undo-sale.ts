import { eq } from 'drizzle-orm';

import { db } from '../../../db/client.js';
import { batchItems, sales } from '../../../db/schema/batches.js';

/**
 * Failure modes returned by `undoSaleTx`. Distinct codes so the
 * route handler can map them to the right envelope without
 * inspecting message strings.
 *
 *   SALE_NOT_FOUND → 404 NOT_FOUND
 */
export type UndoSaleFailure = { code: 'SALE_NOT_FOUND' };

export type UndoSaleResult =
  | { ok: true }
  | { ok: false; failure: UndoSaleFailure };

/**
 * Run the full `DELETE /sales/:id` flow inside a single
 * `db.transaction(...)`. The transactional guarantee is the mirror
 * of `recordSaleTx` — a failure cannot leave a Sale row with a
 * `sold` item that no longer has a corresponding sale (the canonical
 * inconsistent state).
 *
 * Steps (in this order, all on the same `tx`):
 *   1. `SELECT ... FOR UPDATE` on the Sale row. PK lookup takes a
 *      row-level lock so two concurrent undo attempts for the same
 *      sale serialize through this transaction. The lock also
 *      implicitly locks the BatchItem via the FK
 *      (`sales.batch_item_id → batch_items.id`) — but we re-fetch
 *      the BatchItem explicitly below for `updatedAt` semantics.
 *   2. If the row does not exist → `SALE_NOT_FOUND`.
 *   3. Flip the owning BatchItem back to `status: 'sellable'`,
 *      bumping `updatedAt`. `updatedAt` has a SQL `defaultNow()` but
 *      Drizzle does NOT auto-bump on UPDATE — set it explicitly.
 *      **Ordering matters:** flip status first, then delete sale —
 *      so a concurrent read of the BatchItem sees a `sellable` item
 *      without a sale row (the canonical state), not a `sold` item
 *      with a missing sale row.
 *   4. DELETE the Sale row.
 *
 * The `now` argument is taken by parameter so the route handler can
 * use the same timestamp for the `204` response that the
 * transactional UPDATE uses for `batch_items.updated_at`. Mirrors
 * `recordSaleTx`.
 */
export async function undoSaleTx(
  saleId: string,
  now: Date,
): Promise<UndoSaleResult> {
  return await db.transaction(async (tx) => {
    // 1. SELECT ... FOR UPDATE on the Sale row.
    const saleRows = await tx
      .select({ id: sales.id, batchItemId: sales.batchItemId })
      .from(sales)
      .where(eq(sales.id, saleId))
      .for('update')
      .limit(1);

    const sale = saleRows[0];

    // 2. 404 — id is well-formed but unknown.
    if (!sale) {
      return { ok: false, failure: { code: 'SALE_NOT_FOUND' as const } };
    }

    // 3. Flip the owning BatchItem back to `sellable`, bumping
    //    `updatedAt`. The FK `sales.batch_item_id → batch_items.id`
    //    guarantees the batch item still exists (ON DELETE CASCADE
    //    means deleting the item also removes its sale, so a sale
    //    row cannot outlive its item).
    await tx
      .update(batchItems)
      .set({ status: 'sellable', updatedAt: now })
      .where(eq(batchItems.id, sale.batchItemId));

    // 4. DELETE the Sale row.
    await tx.delete(sales).where(eq(sales.id, saleId));

    return { ok: true };
  });
}