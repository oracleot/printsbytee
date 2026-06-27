import type { Context } from 'hono';
import { asc, eq } from 'drizzle-orm';

import {
  BatchItemSchema,
  ErrorResponseSchema,
} from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import {
  batchItems,
  productionBatches,
} from '../../../db/schema/batches.js';
import type { AppEnv } from '../../../types.js';

import { parseIdParam, toBatchItemDto } from '../helpers.js';

/**
 * `GET /batches/:id/items` — list items in a batch.
 *
 * Owner-only. Returns `BatchItem[]` ordered by `createdAt` ascending
 * (oldest first) so the timeline view inside the batch detail page is
 * stable across requests. The `batch_items_batch_id_idx` index covers
 * the WHERE clause.
 *
 *   200 { BatchItem[] }                — items in the batch
 *   400 { error: VALIDATION_ERROR }   — malformed batch id
 *   401 { error: UNAUTHORIZED }       — from requireSession
 *   404 { error: NOT_FOUND }          — batch is well-formed but
 *                                        unknown. A 404 here is
 *                                        preferable to returning an
 *                                        empty array for a typo'd
 *                                        id.
 */
export async function listBatchItems(c: Context<AppEnv>): Promise<Response> {
  const idResult = parseIdParam(c);
  if (!idResult.ok) return idResult.response;
  const batchId = idResult.id;

  // Verify the batch exists first. A non-existent batch id should
  // 404 even if it has zero items — the typo case is much more
  // useful to surface than a misleading empty array.
  const batchRows = await db
    .select({ id: productionBatches.id })
    .from(productionBatches)
    .where(eq(productionBatches.id, batchId))
    .limit(1);

  if (batchRows.length === 0) {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: 'Batch not found',
        },
      }),
      404,
    );
  }

  const rows = await db
    .select()
    .from(batchItems)
    .where(eq(batchItems.batchId, batchId))
    .orderBy(asc(batchItems.createdAt));

  const response = BatchItemSchema.array().parse(rows.map(toBatchItemDto));
  return c.json(response);
}
