import { Hono } from 'hono';

import { requireSession } from '../../middleware/requireSession.js';
import type { AppEnv } from '../../types.js';

import { deleteBatchItem } from './handlers/delete.js';
import { updateBatchItem } from './handlers/update.js';

/**
 * Batch-item by-id endpoints (I24).
 *
 * Both endpoints are owner-only — mounted behind `requireSession`
 * inline below. The path-scoped counterparts (`GET /batches/:id/items`
 * and `POST /batches/:id/items`) live on the existing `batchesRouter`
 * because the `:id` is the *batch* there, not the item.
 *
 *   PATCH  /batch-items/:id  — update mutable fields
 *                              (`plannedSalePrice`, `status`).
 *                              `id`, `batchId`, `productId`,
 *                              `createdAt`, and `updatedAt` are
 *                              immutable; a body containing them
 *                              returns 400. A body with
 *                              `status: 'sold'` returns 400 (clients
 *                              must use the sale endpoint). Empty
 *                              body returns 400.
 *   DELETE /batch-items/:id  — hard delete. 204 on success. 409 if a
 *                              `sales` row references the item
 *                              (probe, not FK — `sales.batch_item_id`
 *                              is `ON DELETE CASCADE`).
 *
 * Error envelopes follow the canonical shape from
 * `docs/api-surface.md`. All 4xx paths use `ErrorResponseSchema.parse`
 * so a future drift between the route and the shared contract fails
 * at the edge instead of leaking bad JSON.
 */
const batchItemsRouter = new Hono<AppEnv>();

batchItemsRouter.patch('/:id', requireSession, updateBatchItem);
batchItemsRouter.delete('/:id', requireSession, deleteBatchItem);

export { batchItemsRouter };
