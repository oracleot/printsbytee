import { Hono } from 'hono';

import { requireSession } from '../../middleware/requireSession.js';
import type { AppEnv } from '../../types.js';

import { undoSale } from './handlers/undo.js';

/**
 * Sales endpoints (I25).
 *
 * All endpoints are owner-only — mounted behind `requireSession`
 * inline below. The recording counterpart (`POST /batch-items/:id/sale`)
 * lives on the existing `batchItemsRouter` because the path uses
 * the item id, not the sale id.
 *
 *   DELETE /sales/:id  — undo a sale. 204 on success. The owning
 *                        BatchItem is restored to `sellable` in the
 *                        same transaction (see
 *                        `./handlers/undo.ts` and
 *                        `./_shared/undo-sale.ts`). 404 if the id is
 *                        well-formed but unknown.
 *
 * The `POST /batch-items/:id/sale` route is mounted on
 * `batchItemsRouter` at `/batch-items/:id/sale` — see
 * `apps/api/src/routes/batch-items/index.ts`.
 *
 * Error envelopes follow the canonical shape from
 * `docs/api-surface.md`. All 4xx paths use `ErrorResponseSchema.parse`
 * so a future drift between the route and the shared contract fails
 * at the edge instead of leaking bad JSON.
 */
const salesRouter = new Hono<AppEnv>();

salesRouter.delete('/:id', requireSession, undoSale);

export { salesRouter };