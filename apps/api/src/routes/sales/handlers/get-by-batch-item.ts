import type { Context } from 'hono';

/**
 * `GET /sales/by-batch-item/:id` — get the sale for a batch item (requires session).
 *
 * Returns the Sale record for a sold batch item, or 404 if the item is not sold.
 * This endpoint is used by the business-app to display sale details (price, date,
 * customer) on sold items in the batch detail table.
 *
 *   200 { Sale }                     — found
 *   400 { error: VALIDATION_ERROR }  — malformed id
 *   401 { error: UNAUTHORIZED }      — from requireSession
 *   404 { error: NOT_FOUND }         — no sale for this batch item
 */

import { eq } from 'drizzle-orm';

import { ErrorResponseSchema, SaleSchema } from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import { sales } from '../../../db/schema/batches.js';
import type { AppEnv } from '../../../types.js';

import { parseIdParam } from '../helpers.js';

export async function getSaleByBatchItem(c: Context<AppEnv>): Promise<Response> {
  const idResult = parseIdParam(c);
  if (!idResult.ok) return idResult.response;

  const batchItemId = idResult.id;

  const rows = await db
    .select()
    .from(sales)
    .where(eq(sales.batchItemId, batchItemId))
    .limit(1);

  if (rows.length === 0) {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: 'No sale found for this batch item',
        },
      }),
      404,
    );
  }

  const sale = SaleSchema.parse(rows[0]);
  return c.json(sale);
}