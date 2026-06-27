import { eq, inArray } from 'drizzle-orm';

import { db } from '../../../db/client.js';
import {
  batchItems,
  productionBatches,
  type BatchItem as BatchItemRow,
} from '../../../db/schema/batches.js';
import { products } from '../../../db/schema/products.js';

/**
 * Failure modes returned by `bulkCreateItems`. Distinct codes so the
 * route handler can map them to the right 404 envelope without
 * inspecting message strings.
 */
export type BulkCreateItemsFailure =
  | { code: 'BATCH_NOT_FOUND' }
  | { code: 'PRODUCT_NOT_FOUND'; productIds: string[] };

export type BulkCreateItemsResult =
  | { ok: true; rows: BatchItemRow[] }
  | { ok: false; failure: BulkCreateItemsFailure };

/**
 * Bulk-create batch items with the ADR-0002 price-snapshot rule
 * enforced in the same transaction:
 *
 *   - For each item, if the request body provided `plannedSalePrice`
 *     use it verbatim (already validated by Zod's `penceSchema`).
 *   - Otherwise copy `products.price` from the product row fetched
 *     inside this transaction. The "frozen for the batch" snapshot
 *     (`docs/adr/0002-product-price-master.md`) is preserved by
 *     pinning the price read to the same transaction as the insert.
 *
 * Atomicity contract:
 *   - The transaction holds a `LIMIT 1` lookup of the batch, a
 *     `SELECT id, price FROM products WHERE id IN (...)` over the
 *     distinct referenced ids, and a single multi-row INSERT into
 *     `batch_items`. Any failure rolls the whole thing back.
 *   - Pre-validation against the product lookup ensures no partial
 *     insert when any referenced productId is unknown — we surface
 *     as 404 with the offending ids before issuing the INSERT.
 *
 *   - The batch is verified first so a malformed batch id surfaces a
 *     single clean error rather than a confusing FK violation on
 *     `batch_items_batch_id_fk`.
 */
export async function bulkCreateItems(
  batchId: string,
  items: ReadonlyArray<{ productId: string; plannedSalePrice?: number }>,
): Promise<BulkCreateItemsResult> {
  const uniqueProductIds = [...new Set(items.map((i) => i.productId))];

  // Verify batch + look up product prices inside the same
  // transaction so the snapshot price is consistent with the row
  // we'll insert against.
  const { batchExists, productPrices } = await db.transaction(async (tx) => {
    const batchRows = await tx
      .select({ id: productionBatches.id })
      .from(productionBatches)
      .where(eq(productionBatches.id, batchId))
      .limit(1);

    const priceMap = new Map<string, number>();
    if (uniqueProductIds.length > 0) {
      const productRows = await tx
        .select({ id: products.id, price: products.price })
        .from(products)
        .where(inArray(products.id, uniqueProductIds));
      for (const row of productRows) {
        priceMap.set(row.id, row.price);
      }
    }
    return {
      batchExists: batchRows.length > 0,
      productPrices: priceMap,
    };
  });

  if (!batchExists) {
    return { ok: false, failure: { code: 'BATCH_NOT_FOUND' } };
  }

  const unknownProductIds = uniqueProductIds.filter(
    (id) => !productPrices.has(id),
  );
  if (unknownProductIds.length > 0) {
    return {
      ok: false,
      failure: { code: 'PRODUCT_NOT_FOUND', productIds: unknownProductIds },
    };
  }

  // Build values: use request body `plannedSalePrice` when present,
  // otherwise snapshot from the price we just read inside the
  // transaction.
  const values = items.map((item) => ({
    batchId,
    productId: item.productId,
    plannedSalePrice: item.plannedSalePrice ?? productPrices.get(item.productId)!,
  }));

  const inserted = await db.insert(batchItems).values(values).returning();
  return { ok: true, rows: inserted };
}
