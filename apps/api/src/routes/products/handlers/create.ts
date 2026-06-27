import type { Context } from 'hono';

import {
  CreateProductRequestSchema,
  ErrorResponseSchema,
  ProductSchema,
} from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import { products } from '../../../db/schema/products.js';
import type { AppEnv } from '../../../types.js';

import {
  PG_UNIQUE_VIOLATION,
  isPgError,
  parseJsonBody,
  toProductDto,
} from '../helpers.js';

/**
 * `POST /products` — create a product.
 *
 * Owner-only. Validates the body against `CreateProductRequestSchema`,
 * inserts the row, and returns the freshly-created product (201).
 *
 *   201 { Product }                       — created
 *   400 { error: VALIDATION_ERROR }      — invalid JSON or schema mismatch
 *   401 { error: UNAUTHORIZED }          — from requireSession
 *   409 { error: CONFLICT }              — slug already exists
 *
 * The session is mounted inline by the router (see `index.ts`); this
 * handler does not need to read `c.get('user')` — the session is
 * purely a gate.
 *
 * Returns the base `Product` shape (not `ProductWithStock`) because
 * stock is a derived read-side concept and a freshly created product
 * has zero stock, so the response is the same shape as the request
 * body plus server-generated `id`/`createdAt`/`updatedAt`.
 */
export async function createProduct(c: Context<AppEnv>): Promise<Response> {
  const json = await parseJsonBody(c);
  if (!json.ok) return json.response;

  const parsed = CreateProductRequestSchema.safeParse(json.body);
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

  try {
    const [row] = await db
      .insert(products)
      .values(parsed.data)
      .returning();

    if (!row) {
      // `.returning()` either returns the row or throws — defensive
      // guard for a future driver change. Surface as 500 via the
      // global error handler rather than a confusing 201 with no body.
      throw new Error('Insert returned no row');
    }

    return c.json(ProductSchema.parse(toProductDto(row)), 201);
  } catch (err: unknown) {
    // Unique violation on `products_slug_unique` → 409 CONFLICT.
    // Slug is the only unique constraint on the products table.
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