import type { Context } from 'hono';
import { eq } from 'drizzle-orm';

import { ErrorResponseSchema } from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import { batchItems } from '../../../db/schema/batches.js';
import type { AppEnv } from '../../../types.js';

import {
  batchItemHasSaleResponse,
  hasSale,
  parseIdParam,
} from '../helpers.js';

/**
 * `DELETE /batch-items/:id` — hard-delete a batch item.
 *
 * Owner-only. Returns 204 on success. Refuses with 409 `CONFLICT` if
 * a `sales` row references the item — this is the only path to
 * `sold` data, so silently cascading the sale away would lose the
 * revenue record.
 *
 * Why a probe instead of catching an FK violation:
 *   - `sales.batch_item_id → batch_items.id` is `ON DELETE CASCADE`,
 *     so the FK never trips on a parent DELETE — we have to detect
 *     the existing sale before issuing the DELETE.
 *   - The probe is a single `LIMIT 1` lookup against
 *     `sales_batch_item_id_idx` (unique btree on `batch_item_id`).
 *
 * The 409 message is intentionally specific ("has a recorded sale")
 * so the operator knows why the delete was refused rather than just
 * "in use" — see `../helpers.ts#BATCH_ITEM_HAS_SALE_MESSAGE`.
 *
 *   204                                — deleted, no body
 *   400 { error: VALIDATION_ERROR }   — malformed id
 *   401 { error: UNAUTHORIZED }       — from requireSession
 *   404 { error: NOT_FOUND }          — id is well-formed but unknown
 *   409 { error: CONFLICT }           — a sale references this item
 */
export async function deleteBatchItem(c: Context<AppEnv>): Promise<Response> {
  const idResult = parseIdParam(c);
  if (!idResult.ok) return idResult.response;
  const id = idResult.id;

  // 404 first so a non-existent id does not masquerade as a conflict.
  // Cheap PK lookup; the sale probe below is index-scoped to this id
  // and would return `false` for a missing item anyway, but a 404
  // gives the client a clearer signal than a misleading 204.
  const existing = await db
    .select({ id: batchItems.id })
    .from(batchItems)
    .where(eq(batchItems.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: 'Batch item not found',
        },
      }),
      404,
    );
  }

  // Refuse if a sale references this item. `hasSale` runs a single
  // indexed lookup; `batchItemHasSaleResponse` turns the boolean into
  // the documented 409 envelope (or returns null to continue).
  const saleResponse = batchItemHasSaleResponse(await hasSale(id));
  if (saleResponse !== null) return saleResponse;

  await db.delete(batchItems).where(eq(batchItems.id, id));

  return c.body(null, 204);
}
