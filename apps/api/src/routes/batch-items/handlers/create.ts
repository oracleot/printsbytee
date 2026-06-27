import type { Context } from 'hono';

import {
  BatchItemSchema,
  CreateBatchItemsBulkRequestSchema,
  ErrorResponseSchema,
} from '@printsbytee/shared';

import type { AppEnv } from '../../../types.js';

import {
  bulkCreateItems,
  parseIdParam,
  parseJsonBody,
  toBatchItemDto,
} from '../helpers.js';

/**
 * `POST /batches/:id/items` — bulk-create batch items.
 *
 * Owner-only. Body: `{ items: [{ productId, plannedSalePrice? }, …] }`.
 * Each item's `plannedSalePrice` is snapshotted from `products.price`
 * at write time per ADR-0002 (`docs/adr/0002-product-price-master.md`)
 * when omitted — the price is captured inside the same DB transaction
 * as the INSERT so a concurrent reprice cannot create a drift.
 *
 * The empty-array case is rejected by `CreateBatchItemsBulkRequestSchema`
 * (`.min(1)`), so it surfaces as 400 `VALIDATION_ERROR` via the Zod
 * parse below.
 *
 *   201 { BatchItem[] }                — created
 *   400 { error: VALIDATION_ERROR }   — invalid JSON, empty `items`,
 *                                        or any item fails Zod
 *                                        (`productId` not a UUID,
 *                                        `plannedSalePrice` negative)
 *   401 { error: UNAUTHORIZED }       — from requireSession
 *   404 { error: NOT_FOUND }          — batch or any referenced
 *                                        product is unknown (the
 *                                        offending ids are in
 *                                        `details.productIds`)
 */
export async function createBatchItems(c: Context<AppEnv>): Promise<Response> {
  // Validate the path id is a UUID before any DB work.
  const idResult = parseIdParam(c);
  if (!idResult.ok) return idResult.response;
  const batchId = idResult.id;

  const json = await parseJsonBody(c);
  if (!json.ok) return json.response;

  const parsed = CreateBatchItemsBulkRequestSchema.safeParse(json.body);
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

  // `bulkCreateItems` runs the batch-existence check, the price
  // snapshot lookup, and the INSERT in a single transaction. It
  // returns a discriminated union so the route handler can map
  // failures to 404 envelopes without inspecting message strings.
  const result = await bulkCreateItems(batchId, parsed.data.items);
  if (!result.ok) {
    if (result.failure.code === 'BATCH_NOT_FOUND') {
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
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: 'One or more referenced products not found',
          details: { productIds: result.failure.productIds },
        },
      }),
      404,
    );
  }

  return c.json(BatchItemSchema.array().parse(result.rows.map(toBatchItemDto)), 201);
}
