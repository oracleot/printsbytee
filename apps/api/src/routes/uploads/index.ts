import { Hono } from 'hono';

import { requireSession } from '../../middleware/requireSession.js';
import type { AppEnv } from '../../types.js';

import { createUpload } from './handlers/create.js';

/**
 * Upload endpoints (I22).
 *
 *   POST /uploads  — owner-only multipart upload to R2. Returns
 *                    `{ url, contentType, size }` on success. The
 *                    file is streamed through busboy into
 *                    `@aws-sdk/lib-storage`'s `Upload` so the API
 *                    never buffers the full body in memory. See
 *                    `./handlers/create.ts` for the full wire
 *                    contract and `./streaming.ts` for the
 *                    busboy + S3 orchestration.
 *
 * Future uploads endpoints (e.g. a signed-URL variant, delete) go
 * here so the mount surface stays a single line in
 * `apps/api/src/routes/index.ts`.
 *
 * Error envelopes follow the canonical shape from
 * `docs/api-surface.md`. All 4xx paths use `ErrorResponseSchema.parse`
 * so a future drift between the route and the shared contract fails
 * at the edge instead of leaking bad JSON.
 */
const uploadsRouter = new Hono<AppEnv>();

uploadsRouter.post('/', requireSession, createUpload);

export { uploadsRouter };