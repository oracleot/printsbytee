import type { Context } from 'hono';

/**
 * `GET /batches/:id/sales` — all sales for a batch (requires session).
 *
 * Returns an array of Sale records for every sold item in the batch.
 * Used by the business-app to eliminate N individual sale-fetches when
 * loading the batch detail page.
 *
 *   200 { Sale[] }                    — always 200, even if empty
 *   400 { error: VALIDATION_ERROR }   — malformed batch id
 *   401 { error: UNAUTHORIZED }       — from requireSession
 */

import { eq } from 'drizzle-orm';

import { ErrorResponseSchema, SaleSchema } from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import { batchItems, sales } from '../../../db/schema/batches.js';
import type { AppEnv } from '../../../types.js';

import { parseIdParam } from '../helpers.js';

export async function getBatchSales(c: Context<AppEnv>): Promise<Response> {
  const idResult = parseIdParam(c);
  if (!idResult.ok) return idResult.response;

  const batchId = idResult.id;

  // Join batch_items → sales on batchItemId to get all sales for this batch.
  // The foreign-key CASCADE handles the case where the batch no longer exists
  // (the DB will return zero rows rather than an error).
  const rows = await db
    .select({ sale: sales })
    .from(sales)
    .innerJoin(batchItems, eq(sales.batchItemId, batchItems.id))
    .where(eq(batchItems.batchId, batchId));

  const parsed = rows.map((r) => SaleSchema.parse(r.sale));
  return c.json(parsed);
}
