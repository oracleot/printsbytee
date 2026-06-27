import type { Context } from 'hono';
import { and, asc, eq, type SQL } from 'drizzle-orm';

import {
  ErrorResponseSchema,
  ProductWithStockSchema,
  type ProductWithStock,
} from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import { products } from '../../../db/schema/products.js';
import type { AppEnv } from '../../../types.js';

import {
  getSellableCountsByProduct,
  withStock,
} from '../../_shared/stock.js';

import { ProductListQuerySchema, toProductDto } from '../helpers.js';

/**
 * `GET /products` — list with optional filters.
 *
 * Public (no auth). Filters:
 *   - `category`  ProductCategory enum
 *   - `inStock`   boolean — applied AFTER the stock join (in JS) so the
 *                   filter sees the same `stockCount` the response will
 *                   show. The stock count is derived and Drizzle can't
 *                   push it into the WHERE clause without raw SQL.
 *   - `featured`  boolean — pushed into the WHERE clause; partial index
 *                   `products_featured_idx` covers it.
 *
 * Returns the `ProductWithStock` array — see `docs/data-model.md` for
 * the derived stock fields. Order is by `name` ascending so list pages
 * are stable across requests.
 *
 * Response is validated against `ProductWithStockSchema.array()` so a
 * future schema drift between DB row and contract fails at the edge.
 */
export async function listProducts(c: Context<AppEnv>): Promise<Response> {
  const parsedQuery = ProductListQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid product filters',
          details: parsedQuery.error.issues,
        },
      },
      400,
    );
  }
  const filters = parsedQuery.data;

  // Build the WHERE clause incrementally so the query only touches the
  // indexed columns that match the requested filters. Sort by `name`
  // so the list order is stable across pages (the partial indexes
  // above don't define an order).
  const conditions: SQL[] = [];
  if (filters.category !== undefined) {
    conditions.push(eq(products.category, filters.category));
  }
  if (filters.featured !== undefined) {
    conditions.push(eq(products.featured, filters.featured));
  }

  const baseQuery = db
    .select()
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(products.name));

  const productRows = await baseQuery;
  const counts = await getSellableCountsByProduct(productRows.map((p) => p.id));

  // Apply the `inStock` filter in-memory AFTER the join. See method
  // docstring for rationale.
  const enriched: ProductWithStock[] = productRows
    .map((row) => withStock(toProductDto(row), counts.get(row.id) ?? 0))
    .filter((p) =>
      filters.inStock === undefined ? true : p.inStock === filters.inStock,
    );

  const response = ProductWithStockSchema.array().parse(enriched);
  return c.json(response);
}

/**
 * `GET /products/:slug` — single product by slug.
 *
 * Public (no auth). 200 with `ProductWithStock` or 404 `NOT_FOUND`.
 * Slug is the indexed lookup key (`products_slug_unique`).
 */
export async function getProductBySlug(c: Context<AppEnv>): Promise<Response> {
  const slug = c.req.param('slug');
  if (!slug) {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Product slug is required',
        },
      }),
      400,
    );
  }

  const row = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1)
    .then((rows) => rows[0]);

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

  const counts = await getSellableCountsByProduct([row.id]);
  const response = ProductWithStockSchema.parse(
    withStock(toProductDto(row), counts.get(row.id) ?? 0),
  );
  return c.json(response);
}