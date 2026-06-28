import { Hono } from 'hono';

import { requireSession } from '../../middleware/requireSession.js';
import type { AppEnv } from '../../types.js';

import { createBatch } from './handlers/create.js';
import { deleteBatch } from './handlers/delete.js';
import { getBatchById, listBatches } from './handlers/list.js';
import { getBatchSales } from './handlers/get-sales.js';
import { updateBatch } from './handlers/update.js';
import { createBatchItems } from '../batch-items/handlers/create.js';
import { listBatchItems } from '../batch-items/handlers/list.js';

/**
 * Production batch endpoints (I23) + batch-scoped batch-item
 * endpoints (I24).
 *
 * All seven endpoints are owner-only — mounted behind `requireSession`
 * inline below. The public read counterpart lives in
 * `apps/api/src/routes/products/index.ts`; batches are an
 * internal-only resource.
 *
 *   GET    /batches            — list with optional `?from=&to=` ISO
 *                                 date inclusive filter on
 *                                 `created_at`. Order is by
 *                                 `created_at` ascending (oldest
 *                                 first) so the timeline is stable
 *                                 across requests.
 *   POST   /batches            — create. 201 with the new batch.
 *                                 Body validates against
 *                                 `CreateBatchRequestSchema`.
 *   GET    /batches/:id        — single batch plus computed
 *                                 `totals` per ADR-0003 /
 *                                 `docs/api-surface.md`. 404 if the
 *                                 id is unknown.
 *   PATCH  /batches/:id        — update mutable fields
 *                                 (`name`, `productionCost`,
 *                                 `marketingCost`). `id`,
 *                                 `createdAt`, and `updatedAt` are
 *                                 immutable; a body containing them
 *                                 returns 400. Empty body returns
 *                                 400.
 *   DELETE /batches/:id        — hard delete. 204 on success. 409
 *                                 if any item in the batch has
 *                                 status `sold`. Items and their
 *                                 sales CASCADE-delete with the
 *                                 batch.
 *   GET    /batches/:id/items  — list items in the batch (I24).
 *                                 Ordered by `created_at` asc.
 *                                 404 if the batch is unknown.
 *   POST   /batches/:id/items  — bulk-create items (I24).
 *                                 `plannedSalePrice` defaults to
 *                                 the referenced product's current
 *                                 `price` per ADR-0002. 404 if
 *                                 the batch or any referenced
 *                                 product is unknown. Empty
 *                                 `items` array returns 400.
 *
 * The by-item routes (`PATCH /batch-items/:id` and
 * `DELETE /batch-items/:id`) live on a separate `batchItemsRouter`
 * mounted at `/batch-items` in `routes/index.ts` so the path
 * namespace is flat (no batch id in the path).
 *
 * Error envelopes follow the canonical shape from
 * `docs/api-surface.md`. All 4xx paths use `ErrorResponseSchema.parse`
 * so a future drift between the route and the shared contract fails
 * at the edge instead of leaking bad JSON.
 */
const batchesRouter = new Hono<AppEnv>();

batchesRouter.get('/', requireSession, listBatches);
batchesRouter.post('/', requireSession, createBatch);
batchesRouter.get('/:id', requireSession, getBatchById);
batchesRouter.patch('/:id', requireSession, updateBatch);
batchesRouter.delete('/:id', requireSession, deleteBatch);

// Batch-scoped batch-item routes (I24). The `:id` here is the batch
// id, not the item id — same shape as the existing `/batches/:id`
// routes. Mounted inline so the path stays grouped under one router.
batchesRouter.get('/:id/items', requireSession, listBatchItems);
batchesRouter.post('/:id/items', requireSession, createBatchItems);

// Batch-scoped sales (I32) — replaces the N+1 /sales/by-batch-item/:id fetches.
batchesRouter.get('/:id/sales', requireSession, getBatchSales);

export { batchesRouter };