import type { Context } from 'hono';

import {
  CreateBatchRequestSchema,
  ErrorResponseSchema,
  ProductionBatchSchema,
} from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import { productionBatches } from '../../../db/schema/batches.js';
import type { AppEnv } from '../../../types.js';

import { parseJsonBody, toBatchDto } from '../helpers.js';

/**
 * `POST /batches` — create a production batch.
 *
 * Owner-only. Validates the body against `CreateBatchRequestSchema`
 * (which is the base `ProductionBatch` shape minus server-generated
 * `id`/`createdAt`/`updatedAt` per `packages/shared/src/schemas/production.ts`),
 * inserts the row, and returns the freshly-created batch (201).
 *
 *   201 { ProductionBatch }               — created
 *   400 { error: VALIDATION_ERROR }      — invalid JSON or schema mismatch
 *   401 { error: UNAUTHORIZED }          — from requireSession
 *
 * The session is mounted inline by the router (see `../index.ts`);
 * this handler does not need to read `c.get('user')` — the session is
 * purely a gate.
 *
 * Returns the base `ProductionBatch` shape (not `WithTotals`) because
 * a freshly-created batch has zero items and the totals would all be
 * zero. Clients that want the totals follow up with `GET /batches/:id`.
 */
export async function createBatch(c: Context<AppEnv>): Promise<Response> {
  const json = await parseJsonBody(c);
  if (!json.ok) return json.response;

  const parsed = CreateBatchRequestSchema.safeParse(json.body);
  if (!parsed.success) {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      }),
      400,
    );
  }

  const [row] = await db
    .insert(productionBatches)
    .values(parsed.data)
    .returning();

  if (!row) {
    // `.returning()` either returns the row or throws — defensive
    // guard for a future driver change. Surface as 500 via the global
    // error handler rather than a confusing 201 with no body.
    throw new Error('Insert returned no row');
  }

  return c.json(ProductionBatchSchema.parse(toBatchDto(row)), 201);
}