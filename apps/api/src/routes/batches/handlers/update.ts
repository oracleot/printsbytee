import type { Context } from 'hono';
import { eq } from 'drizzle-orm';

import {
  ErrorResponseSchema,
  ProductionBatchSchema,
  UpdateBatchRequestSchema,
} from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import { productionBatches } from '../../../db/schema/batches.js';
import type { AppEnv } from '../../../types.js';

import { parseIdParam, parseJsonBody, toBatchDto } from '../helpers.js';

/**
 * `PATCH /batches/:id` — update mutable fields of a production batch.
 *
 * Owner-only. `id`, `createdAt`, and `updatedAt` are immutable per
 * `docs/api-surface.md`; a body that contains any of them returns
 * 400 even though Zod would silently strip them under default
 * behaviour — the documented contract is a 400 so a misbehaving client
 * gets a clear signal instead of a "successful" no-op PATCH.
 *
 * Items are explicitly NOT part of this endpoint — batch items live
 * under `/batches/:id/items` and `/batch-items/:id` in I24.
 *
 *   200 { ProductionBatch }             — updated
 *   400 { error: VALIDATION_ERROR }      — malformed id, invalid JSON,
 *                                          id/createdAt/updatedAt in
 *                                          body, schema mismatch, or
 *                                          empty body
 *   401 { error: UNAUTHORIZED }          — from requireSession
 *   404 { error: NOT_FOUND }             — id is well-formed but unknown
 */
export async function updateBatch(c: Context<AppEnv>): Promise<Response> {
  // Validate the path id is a UUID before doing any DB work — a
  // malformed id is the client's fault and surfaces as 400, not 404.
  const idResult = parseIdParam(c);
  if (!idResult.ok) return idResult.response;
  const id = idResult.id;

  const json = await parseJsonBody(c);
  if (!json.ok) return json.response;

  // Reject server-generated fields in the request body.
  // `UpdateBatchRequestSchema` omits them, so Zod would silently strip
  // them — but the documented contract is a 400 so a typo doesn't
  // masquerade as a successful no-op PATCH. Mirrors the same guard in
  // `apps/api/src/routes/products/handlers/update.ts`.
  if (
    typeof json.body === 'object' &&
    json.body !== null &&
    !Array.isArray(json.body)
  ) {
    const candidate = json.body as Record<string, unknown>;
    const forbidden: string[] = [];
    if ('id' in candidate) forbidden.push('id');
    if ('createdAt' in candidate) forbidden.push('createdAt');
    if ('updatedAt' in candidate) forbidden.push('updatedAt');
    if (forbidden.length > 0) {
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'id, createdAt, and updatedAt are immutable',
            details: { fields: forbidden },
          },
        }),
        400,
      );
    }
  }

  const parsed = UpdateBatchRequestSchema.safeParse(json.body);
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

  // After the immutable-field guard, an empty body would result in a
  // no-op UPDATE that does not even bump `updatedAt`. Reject it as a
  // 400 so the client gets a clear signal instead of a misleading 200.
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
    .update(productionBatches)
    // `updatedAt` is a column with a SQL `defaultNow()`, but Drizzle
    // does NOT auto-bump it on UPDATE — only on INSERT. Set it
    // explicitly so the response timestamp reflects the change.
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(productionBatches.id, id))
    .returning();

  if (!row) {
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

  return c.json(ProductionBatchSchema.parse(toBatchDto(row)), 200);
}