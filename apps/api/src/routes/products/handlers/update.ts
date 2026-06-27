import type { Context } from 'hono';
import { eq } from 'drizzle-orm';

import {
  ErrorResponseSchema,
  ProductSchema,
  UpdateProductRequestSchema,
} from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import { products } from '../../../db/schema/products.js';
import type { AppEnv } from '../../../types.js';

import {
  PG_UNIQUE_VIOLATION,
  isPgError,
  parseIdParam,
  parseJsonBody,
  toProductDto,
} from '../helpers.js';

/**
 * `PATCH /products/:id` — update mutable fields of a product.
 *
 * Owner-only. `id` and `slug` are immutable per `docs/api-surface.md`;
 * a body that contains either key returns 400 even though Zod would
 * silently strip them under default behaviour — the documented contract
 * is a 400 so a misbehaving client gets a clear signal instead of a
 * "successful" no-op PATCH.
 *
 *   200 { Product }                       — updated
 *   400 { error: VALIDATION_ERROR }      — malformed id, invalid JSON,
 *                                          id/slug in body, schema
 *                                          mismatch, or empty body
 *   401 { error: UNAUTHORIZED }          — from requireSession
 *   404 { error: NOT_FOUND }             — id is well-formed but unknown
 *   409 { error: CONFLICT }              — slug uniqueness (defensive;
 *                                          the body-level guard above
 *                                          should make this unreachable)
 */
export async function updateProduct(c: Context<AppEnv>): Promise<Response> {
  // Validate the path id is a UUID before doing any DB work — a
  // malformed id is the client's fault and surfaces as 400, not 404.
  const idResult = parseIdParam(c);
  if (!idResult.ok) return idResult.response;
  const id = idResult.id;

  const json = await parseJsonBody(c);
  if (!json.ok) return json.response;

  // Reject id/slug in the request body. `UpdateProductRequestSchema`
  // omits both fields, so Zod would silently strip them — but the
  // documented contract is a 400 so a typo doesn't masquerade as a
  // successful no-op PATCH.
  if (
    typeof json.body === 'object' &&
    json.body !== null &&
    !Array.isArray(json.body)
  ) {
    const candidate = json.body as Record<string, unknown>;
    const forbidden: string[] = [];
    if ('id' in candidate) forbidden.push('id');
    if ('slug' in candidate) forbidden.push('slug');
    if (forbidden.length > 0) {
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'id and slug are immutable',
            details: { fields: forbidden },
          },
        }),
        400,
      );
    }
  }

  const parsed = UpdateProductRequestSchema.safeParse(json.body);
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

  try {
    const [row] = await db
      .update(products)
      // `updatedAt` is a column with a SQL `defaultNow()`, but Drizzle
      // does NOT auto-bump it on UPDATE — only on INSERT. Set it
      // explicitly so the response timestamp reflects the change.
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    if (!row) {
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
          },
        }),
        404,
      );
    }

    return c.json(ProductSchema.parse(toProductDto(row)), 200);
  } catch (err: unknown) {
    // Unique-violation mapping is defensive: the body-level guard
    // already rejects `slug`, and `id` is the PK so an UPDATE can't
    // conflict on it. Kept so a future schema change (e.g. a unique
    // on `name`) surfaces as a clear 409 instead of a 500.
    if (isPgError(err) && err.code === PG_UNIQUE_VIOLATION) {
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'CONFLICT',
            message: 'A product with this slug already exists',
          },
        }),
        409,
      );
    }
    throw err;
  }
}