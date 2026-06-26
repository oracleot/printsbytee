import { and, count, eq, inArray } from 'drizzle-orm';

import { db } from '../../db/client.js';
import { batchItems } from '../../db/schema/batches.js';

import type { ProductWithStock, StockLabel } from '@printsbytee/shared';

/**
 * Upper bound of the "low-stock" band per `docs/data-model.md`:
 *   `stockLabel` is `'low-stock'` when `stockCount ∈ [1, 3]`.
 * `0` is not low-stock — it is "out of stock" (`inStock === false`).
 * Anything above 3 is healthy stock and gets `null`.
 */
const LOW_STOCK_MAX = 3;

/**
 * Derive the `stockLabel` shown next to a product on the public site.
 *
 * Pure function so the rules stay unit-testable and identical regardless
 * of whether the caller is the list endpoint, the by-slug endpoint, or a
 * future server-side render path.
 */
export function computeStockLabel(stockCount: number): StockLabel {
  return stockCount >= 1 && stockCount <= LOW_STOCK_MAX ? 'low-stock' : null;
}

/**
 * Merge a product DTO (the wire shape minus the derived stock fields)
 * with its sellable count to produce the `ProductWithStock` shape that
 * the API contract requires. Derived fields are computed here, never
 * stored — see `docs/data-model.md` ("Stock: derived, never stored").
 *
 * Accepts the DTO rather than the raw Drizzle row so date serialisation
 * happens exactly once, in the caller's row → DTO conversion.
 */
export function withStock(
  product: Omit<ProductWithStock, 'inStock' | 'stockCount' | 'stockLabel'>,
  stockCount: number,
): ProductWithStock {
  return {
    ...product,
    inStock: stockCount > 0,
    stockCount,
    stockLabel: computeStockLabel(stockCount),
  };
}

/**
 * Look up sellable batch-item counts for the given product ids, in one
 * round trip, keyed by productId.
 *
 * Design choice — two-query pattern (this helper + a `select * from products`
 * upstream) is preferred over a single `LEFT JOIN ... GROUP BY`:
 *   - Both queries hit indexes already declared on the schema
 *     (`products_category_idx`, `products_featured_idx`, and the partial
 *     `batch_items_sellable_by_product_idx` on `(product_id) WHERE status='sellable'`).
 *   - Result rows are typed Drizzle objects in both cases — no need to
 *     unpick a join with `sql<...>` casts.
 *   - Adding more optional filters later (e.g. `?priceMin=`) stays a
 *     pure WHERE-chain addition on the products query.
 *
 * Returns an empty map (no DB call) when given an empty id list so
 * callers don't need to special-case the "no rows matched" path.
 */
export async function getSellableCountsByProduct(
  productIds: readonly string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (productIds.length === 0) return counts;

  const rows = await db
    .select({
      productId: batchItems.productId,
      value: count(),
    })
    .from(batchItems)
    .where(
      and(eq(batchItems.status, 'sellable'), inArray(batchItems.productId, [...productIds])),
    )
    .groupBy(batchItems.productId);

  for (const row of rows) {
    counts.set(row.productId, Number(row.value));
  }
  return counts;
}
