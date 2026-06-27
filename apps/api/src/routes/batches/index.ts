import { Hono } from 'hono';

import { requireSession } from '../../middleware/requireSession.js';
import type { AppEnv } from '../../types.js';

import { createBatch } from './handlers/create.js';
import { deleteBatch } from './handlers/delete.js';
import { getBatchById, listBatches } from './handlers/list.js';
import { updateBatch } from './handlers/update.js';

/**
 * Production batch endpoints (I23).
 *
 * All five endpoints are owner-only — mounted behind `requireSession`
 * inline below. The public read counterpart lives in
 * `apps/api/src/routes/products/index.ts`; batches are an
 * internal-only resource.
 *
 *   GET    /batches       — list with optional `?from=&to=` ISO date
 *                            inclusive filter on `created_at`. Order
 *                            is by `created_at` ascending (oldest
 *                            first) so the timeline is stable across
 *                            requests.
 *   POST   /batches       — create. 201 with the new batch. Body
 *                            validates against `CreateBatchRequestSchema`.
 *   GET    /batches/:id   — single batch plus computed `totals` per
 *                            ADR-0003 / `docs/api-surface.md`.
 *                            404 if the id is unknown.
 *   PATCH  /batches/:id   — update mutable fields
 *                            (`name`, `productionCost`, `marketingCost`).
 *                            `id`, `createdAt`, and `updatedAt` are
 *                            immutable; a body containing them returns
 *                            400. Empty body returns 400.
 *   DELETE /batches/:id   — hard delete. 204 on success. 409 if any
 *                            item in the batch has status `sold`.
 *                            Items and their sales CASCADE-delete
 *                            with the batch.
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

export { batchesRouter };