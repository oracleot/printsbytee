import type { Context } from 'hono';
import { eq } from 'drizzle-orm';

import {
  BatchItemSchema,
  ErrorResponseSchema,
  UpdateBatchItemRequestSchema,
} from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import { batchItems } from '../../../db/schema/batches.js';
import type { AppEnv } from '../../../types.js';

import {
  batchItemStatusSoldGuardResponse,
  parseIdParam,
  parseJsonBody,
  toBatchItemDto,
} from '../helpers.js';

/**
 * `PATCH /batch-items/:id` — update mutable fields of a batch item.
 *
 * Owner-only. Mutable fields: `plannedSalePrice`, `status`. The
 * schema deliberately omits `id`, `batchId`, `productId`, `createdAt`,
 * and `updatedAt` — Zod would silently strip them, so we additionally
 * reject them with a 400 to give misbehaving clients a clear signal.
 *
 * The `status: 'sold'` guard is API-layer policy on top of Zod — see
 * `../helpers.ts#batchItemStatusSoldGuardResponse` for rationale.
 * Keeping the policy out of Zod means the `BatchItemStatusSchema`
 * enum remains the source of truth for valid values while the
 * policy lives next to the route.
 *
 *   200 { BatchItem }                — updated
 *   400 { error: VALIDATION_ERROR } — malformed id, invalid JSON,
 *                                      `status: 'sold'`, immutable
 *                                      fields in body, schema
 *                                      mismatch, or empty body
 *   401 { error: UNAUTHORIZED }     — from requireSession
 *   404 { error: NOT_FOUND }        — id is well-formed but unknown
 */
export async function updateBatchItem(c: Context<AppEnv>): Promise<Response> {
  const idResult = parseIdParam(c);
  if (!idResult.ok) return idResult.response;
  const id = idResult.id;

  const json = await parseJsonBody(c);
  if (!json.ok) return json.response;

  // Policy guard: refuse `status: 'sold'` BEFORE Zod parse so the
  // client gets the most specific message (the enum accepts the
  // value, so Zod would happily pass it through).
  const soldGuard = batchItemStatusSoldGuardResponse(json.body);
  if (soldGuard !== null) return soldGuard;

  // Reject server-generated / FK-bound fields in the request body.
  // `UpdateBatchItemRequestSchema` omits them, so Zod would silently
  // strip them — but the documented contract is a 400 so a typo
  // doesn't masquerade as a successful no-op PATCH.
  if (
    typeof json.body === 'object' &&
    json.body !== null &&
    !Array.isArray(json.body)
  ) {
    const candidate = json.body as Record<string, unknown>;
    const forbidden: string[] = [];
    if ('id' in candidate) forbidden.push('id');
    if ('batchId' in candidate) forbidden.push('batchId');
    if ('productId' in candidate) forbidden.push('productId');
    if ('createdAt' in candidate) forbidden.push('createdAt');
    if ('updatedAt' in candidate) forbidden.push('updatedAt');
    if (forbidden.length > 0) {
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'id, batchId, productId, createdAt, and updatedAt are immutable',
            details: { fields: forbidden },
          },
        }),
        400,
      );
    }
  }

  const parsed = UpdateBatchItemRequestSchema.safeParse(json.body);
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

  // After both guards, an empty body would result in a no-op UPDATE
  // that does not even bump `updatedAt`. Reject it as a 400 so the
  // client gets a clear signal instead of a misleading 200.
  if (Object.keys(parsed.data).length === 0) {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Update body must contain at least one mutable field',
        },
      }),
      400,
    );
  }

  const [row] = await db
    .update(batchItems)
    // `updatedAt` has a SQL `defaultNow()` but Drizzle does NOT
    // auto-bump it on UPDATE — only on INSERT. Set it explicitly so
    // the response timestamp reflects the change.
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(batchItems.id, id))
    .returning();

  if (!row) {
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

  return c.json(BatchItemSchema.parse(toBatchItemDto(row)), 200);
}
