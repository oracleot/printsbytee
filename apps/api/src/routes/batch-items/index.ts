import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';

import { requireSession } from '../../middleware/requireSession.js';
import type { AppEnv } from '../../types.js';

import { deleteBatchItem } from './handlers/delete.js';
import { recordBatchItemSale } from './handlers/sale.js';
import { updateBatchItem } from './handlers/update.js';

/**
 * Batch-item by-id endpoints (I24 + I25).
 *
 * All endpoints are owner-only — mounted behind `requireSession`
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
 *   POST    /batch-items/:id/sale
 *                            — record a sale (I25). 201 with the
 *                              new `Sale` row. 404 if the item id
 *                              is unknown. 409 `CONFLICT` if the
 *                              item is already sold. The
 *                              `SELECT ... FOR UPDATE` lock on the
 *                              BatchItem + the Sale INSERT + the
 *                              BatchItem status flip all run inside
 *                              a single `db.transaction(...)` — see
 *                              `apps/api/src/routes/sales/_shared/record-sale.ts`.
 *
 * Error envelopes follow the canonical shape from
 * `docs/api-surface.md`. All 4xx paths use `ErrorResponseSchema.parse`
 * so a future drift between the route and the shared contract fails
 * at the edge instead of leaking bad JSON.
 */
const batchItemsRouter = new Hono<AppEnv>();

batchItemsRouter.patch('/:id', requireSession, updateBatchItem);
batchItemsRouter.delete('/:id', requireSession, deleteBatchItem);
batchItemsRouter.post('/:id/sale', bodyLimit({ maxSize: 256 * 1024 }), requireSession, recordBatchItemSale);

export { batchItemsRouter };
