import type { Context } from 'hono';
import { and, eq } from 'drizzle-orm';

import { ErrorResponseSchema } from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import { batchItems, productionBatches } from '../../../db/schema/batches.js';
import type { AppEnv } from '../../../types.js';

import { parseIdParam } from '../helpers.js';

/**
 * `DELETE /batches/:id` — hard-delete a production batch.
 *
 * Owner-only. The batch has CASCADE FKs to `batch_items` and
 * (transitively) `sales`, so deleting the batch removes the items
 * and their sales in the same transaction — no manual ordering
 * needed.
 *
 * The endpoint refuses with `409 CONFLICT` if any item in the batch
 * has status `sold`. The check uses a `LIMIT 1` probe against
 * `batch_items WHERE batch_id = ? AND status = 'sold'`, which rides
 * the existing `batch_items_batch_id_idx`. The 409 message is
 * intentionally specific so the owner knows *why* the delete was
 * refused (rather than just "in use").
 *
 *   204                                — deleted, no body
 *   400 { error: VALIDATION_ERROR }   — malformed id
 *   401 { error: UNAUTHORIZED }       — from requireSession
 *   404 { error: NOT_FOUND }          — id is well-formed but unknown
 *   409 { error: CONFLICT }           — batch has at least one sold item
 */
export async function deleteBatch(c: Context<AppEnv>): Promise<Response> {
  const idResult = parseIdParam(c);
  if (!idResult.ok) return idResult.response;
  const id = idResult.id;

  // 404 first so a non-existent id does not masquerade as a conflict.
  // Cheap PK lookup, runs before the sold-items probe.
  const existing = await db
    .select({ id: productionBatches.id })
    .from(productionBatches)
    .where(eq(productionBatches.id, id))
    .limit(1);

  if (existing.length === 0) {
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

  // Refuse if any item in this batch has already been sold. LIMIT 1 +
  // .length > 0 short-circuits on the first match, mirroring what
  // `EXISTS (...)` would do in raw SQL without depending on Drizzle's
  // subquery-in-WHERE support.
  const soldItems = await db
    .select({ id: batchItems.id })
    .from(batchItems)
    .where(
      and(
        eq(batchItems.batchId, id),
        eq(batchItems.status, 'sold'),
      ),
    )
    .limit(1);

  if (soldItems.length > 0) {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'CONFLICT',
          message: 'Batch has sold items and cannot be deleted',
        },
      }),
      409,
    );
  }

  await db
    .delete(productionBatches)
    .where(eq(productionBatches.id, id));

  return c.body(null, 204);
}