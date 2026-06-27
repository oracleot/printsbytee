import { eq, sql } from 'drizzle-orm';
import type { BatchTotals } from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import { batchItems, productionBatches, sales } from '../../../db/schema/batches.js';

import { productionCostTotal } from '../helpers.js';

/**
 * Compute the batch totals documented in `docs/api-surface.md` and
 * ADR-0003 in two SQL round trips (both index-backed) plus a small
 * arithmetic step:
 *
 *   itemCount        — count(batch_items where batch_id = batchId)
 *   expectedRevenue  — sum(planned_sale_price) where status ∈ {sellable, sold}
 *   loss             — sum(planned_sale_price) where status = faulty
 *   actualRevenue    — sum(sale.sale_price) where batch_items.batch_id = batchId
 *   expectedProfit   — expectedRevenue − productionCost.total − marketingCost
 *   profitSoFar      — actualRevenue   − productionCost.total − marketingCost
 *
 * SQL aggregation strategy:
 *   - One scan over `batch_items` filtered by `batch_id` (uses
 *     `batch_items_batch_id_idx`) computes itemCount, expectedRevenue,
 *     and loss in a single query using `SUM(...) FILTER (WHERE ...)`.
 *   - One inner join `sales → batch_items` filtered by `batch_items.batch_id`
 *     sums `sales.sale_price`. The join uses
 *     `sales_batch_item_id_idx` and `batch_items_batch_id_idx`.
 *
 * Why two queries instead of one CTE: both queries hit the same
 * batch-scoped index and the result rows are tiny (six numbers).
 * Splitting them keeps the SQL linear and reviewable, and avoids the
 * CTE maintenance overhead on future schema tweaks.
 *
 * The function reads the batch row itself (cheap PK lookup) so the
 * caller does not need to pass production_cost / marketing_cost
 * separately. Callers should still 404 first if the batch id might
 * be unknown — this helper assumes the batch exists.
 */
export async function computeBatchTotals(batchId: string): Promise<BatchTotals> {
  // 1. batch_items aggregation. `FILTER (WHERE ...)` lets Postgres push
  //    the three partial predicates into the same index scan instead of
  //    three separate queries.
  const itemAggRows = await db
    .select({
      itemCount: sql<number>`COUNT(*)::int`,
      expectedRevenue: sql<number>`COALESCE(SUM(${batchItems.plannedSalePrice}) FILTER (WHERE ${batchItems.status} IN ('sellable', 'sold')), 0)::int`,
      loss: sql<number>`COALESCE(SUM(${batchItems.plannedSalePrice}) FILTER (WHERE ${batchItems.status} = 'faulty'), 0)::int`,
    })
    .from(batchItems)
    .where(eq(batchItems.batchId, batchId));

  const itemAgg = itemAggRows[0] ?? { itemCount: 0, expectedRevenue: 0, loss: 0 };
  const itemCount = Number(itemAgg.itemCount);
  const expectedRevenue = Number(itemAgg.expectedRevenue);
  const loss = Number(itemAgg.loss);

  // 2. sales aggregation joined through batch_items so the SUM is
  //    naturally scoped to this batch. INNER JOIN is safe: a Sale can
  //    only exist for a BatchItem, and the FK is ON DELETE CASCADE, so
  //    orphans are impossible.
  const saleAggRows = await db
    .select({
      actualRevenue: sql<number>`COALESCE(SUM(${sales.salePrice}), 0)::int`,
    })
    .from(sales)
    .innerJoin(batchItems, eq(batchItems.id, sales.batchItemId))
    .where(eq(batchItems.batchId, batchId));

  const actualRevenue = Number(saleAggRows[0]?.actualRevenue ?? 0);

  // 3. Pull the batch row for productionCost + marketingCost. Caller is
  //    expected to have 404'd already, so a missing row here is a 500.
  const batchRows = await db
    .select({
      productionCost: productionBatches.productionCost,
      marketingCost: productionBatches.marketingCost,
    })
    .from(productionBatches)
    .where(eq(productionBatches.id, batchId))
    .limit(1);

  const batch = batchRows[0];
  if (!batch) {
    throw new Error(`computeBatchTotals: batch ${batchId} not found`);
  }

  const productionTotal = productionCostTotal(batch.productionCost);
  const expectedProfit = expectedRevenue - productionTotal - batch.marketingCost;
  const profitSoFar = actualRevenue - productionTotal - batch.marketingCost;

  return {
    itemCount,
    expectedRevenue,
    actualRevenue,
    loss,
    expectedProfit,
    profitSoFar,
  };
}