import { Hono } from 'hono';
import type { Context } from 'hono';
import { and, asc, eq, type SQL } from 'drizzle-orm';
import { z } from 'zod';

import {
  CreateProductRequestSchema,
  ErrorResponseSchema,
  ProductCategorySchema,
  ProductSchema,
  ProductWithStockSchema,
  UpdateProductRequestSchema,
  uuidSchema,
  type ProductWithStock,
} from '@printsbytee/shared';

import { db } from '../db/client.js';
import { products, type Product } from '../db/schema/products.js';
import type { AppEnv } from '../types.js';
import { requireSession } from '../middleware/requireSession.js';

import {
  getSellableCountsByProduct,
  withStock,
} from './_shared/stock.js';

/**
 * Product catalog endpoints.
 *
 * Public reads (no auth):
 *   GET /products          → list with optional filters
 *   GET /products/:slug    → single product or NOT_FOUND
 *
 * Owner writes (require session cookie via `requireSession`):
 *   POST   /products      → create. 201 with the new product.
 *                            409 on slug-uniqueness violation.
 *   PATCH  /products/:id  → update mutable fields. 200 with the
 *                            updated product. `id` and `slug` are
 *                            immutable and a body that contains them
 *                            returns 400. 404 if the id is unknown.
 *   DELETE /products/:id  → hard delete. 204 on success.
 *                            409 if any `batch_items` row references
 *                            the product (FK RESTRICT).
 *
 * Both reads include derived `inStock`, `stockCount`, and `stockLabel`
 * fields per `docs/data-model.md`. Writes return the base `Product`
 * shape — stock is a derived read-side concept and a freshly created
 * product has zero stock, so the response is always the same shape
 * as the request body plus the server-generated `id`/`createdAt`/
 * `updatedAt`. Stock is computed by joining against
 * `batch_items WHERE status = 'sellable'` — see `./_shared/stock.ts`.
 *
 * Error envelopes follow the canonical shape from
 * `docs/api-surface.md`. All 4xx paths use `ErrorResponseSchema.parse`
 * so a future drift between the route and the shared contract fails
 * at the edge instead of leaking bad JSON.
 */

const productsRouter = new Hono<AppEnv>();

// Postgres error codes — the dictionary of `err.code` from `pg`.
// Kept as module constants so the route reads declaratively and a
// future drift from PG versions surfaces in one place.
const PG_UNIQUE_VIOLATION = '23505';
const PG_FK_VIOLATION = '23503';

/** Narrow a caught error to a Postgres-dictionary error object. */
function isPgError(e: unknown): e is { code: string } {
  return typeof e === 'object' && e !== null && typeof (e as Record<string, unknown>).code === 'string';
}

/**
 * Query-string filter schema. Booleans arrive as strings from the URL
 * (`?inStock=true`), so we explicitly coerce — `z.coerce.boolean()`
 * would treat any non-empty string as `true`, which silently accepts
 * garbage.
 */
const booleanFromQuery = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean());

const ProductListQuerySchema = z.object({
  category: ProductCategorySchema.optional(),
  inStock: booleanFromQuery.optional(),
  featured: booleanFromQuery.optional(),
});

/** Convert a `Product` row from the DB layer to the wire shape (dates → ISO). */
function toProductDto(row: Product): Omit<ProductWithStock, 'inStock' | 'stockCount' | 'stockLabel'> {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Validate a `:id` path parameter as a UUID.
 *
 * Returns the parsed id on success, or a `Response` that the caller
 * should `return` directly. Splitting "validation failed" from
 * "validation succeeded" into two return values keeps the route body
 * linear without nested `if` ladders for every error path.
 */
function parseIdParam(
  c: Context<AppEnv>,
): { ok: true; id: string } | { ok: false; response: Response } {
  const parsed = uuidSchema.safeParse(c.req.param('id'));
  if (parsed.success) {
    return { ok: true, id: parsed.data };
  }
  return {
    ok: false,
    response: c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Product id must be a UUID',
        },
      }),
      400,
    ),
  };
}

/**
 * Parse a JSON request body and translate a `SyntaxError` from
 * `c.req.json()` into the canonical 400 envelope. Other thrown errors
 * (e.g. body-size limits from upstream) are re-thrown so the global
 * error handler sees them instead of being masked as a parse failure.
 *
 * Returns the parsed `unknown` body on success, or a `Response` that
 * the caller should `return` directly.
 */
async function parseJsonBody(
  c: Context<AppEnv>,
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  try {
    const body = await c.req.json();
    return { ok: true, body };
  } catch (err: unknown) {
    if (!(err instanceof SyntaxError)) throw err;
    return {
      ok: false,
      response: c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request body must be valid JSON',
          },
        }),
        400,
      ),
    };
  }
}

productsRouter.get('/', async (c) => {
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
  // indexed columns that match the requested filters. Sort by `name` so
  // the list order is stable across pages (the partial indexes above
  // don't define an order).
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

  // Apply the `inStock` filter in-memory AFTER the join, because the
  // stock count is a derived field that Drizzle can't push into the
  // WHERE clause without raw SQL. Doing the join first means the
  // filter sees the same number the response will show.
  const enriched: ProductWithStock[] = productRows
    .map((row) => withStock(toProductDto(row), counts.get(row.id) ?? 0))
    .filter((p) => (filters.inStock === undefined ? true : p.inStock === filters.inStock));

  // Validate the wire shape so a future schema drift between DB and
  // contract fails loudly at the edge instead of leaking bad JSON.
  const response = ProductWithStockSchema.array().parse(enriched);
  return c.json(response);
});

productsRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!slug) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Product slug is required',
        },
      },
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
      {
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
        },
      },
      404,
    );
  }

  const counts = await getSellableCountsByProduct([row.id]);
  const response = ProductWithStockSchema.parse(withStock(toProductDto(row), counts.get(row.id) ?? 0));
  return c.json(response);
});

// ── POST /products ──────────────────────────────────────────────────────
//
// Owner-only. Validates the body against `CreateProductRequestSchema`,
// inserts the row, and returns the freshly-created product (201).
//
// 201 { Product }                       — created
// 400 { error: VALIDATION_ERROR }      — invalid JSON or schema mismatch
// 401 { error: UNAUTHORIZED }          — from requireSession
// 409 { error: CONFLICT }              — slug already exists
//
// `requireSession` populates `c.get('user')` / `c.get('sessionId')`,
// but this handler does not need to read either — the session exists
// purely as a gate. The middleware is mounted inline so the route
// reads as a single unit.
productsRouter.post('/', requireSession, async (c) => {
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
});

// ── PATCH /products/:id ─────────────────────────────────────────────────
//
// Owner-only. Updates the mutable fields of a product. `id` and `slug`
// are immutable per `docs/api-surface.md`; a body that contains either
// key returns 400 even though Zod would silently strip them under
// default behaviour — the documented contract is a 400 so a misbehaving
// client gets a clear signal instead of a "successful" no-op PATCH.
//
// 200 { Product }                       — updated
// 400 { error: VALIDATION_ERROR }      — malformed id, invalid JSON,
//                                         id/slug in body, schema
//                                         mismatch, or empty body
// 401 { error: UNAUTHORIZED }          — from requireSession
// 404 { error: NOT_FOUND }             — id is well-formed but unknown
// 409 { error: CONFLICT }              — slug uniqueness (defensive;
//                                         the body-level guard above
//                                         should make this unreachable)
productsRouter.patch('/:id', requireSession, async (c) => {
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
  if (typeof json.body === 'object' && json.body !== null && !Array.isArray(json.body)) {
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
});

// ── DELETE /products/:id ────────────────────────────────────────────────
//
// Owner-only. Hard-deletes a product. Refuses with 409 if any
// `batch_items` row references the product — the FK is declared
// `ON DELETE RESTRICT` in `db/schema/batches.ts`, so Postgres rejects
// the DELETE before any row is removed and we surface that as a
// canonical 409 envelope instead of letting the driver throw a 500.
//
// 204                                — deleted, no body
// 400 { error: VALIDATION_ERROR }   — malformed id
// 401 { error: UNAUTHORIZED }       — from requireSession
// 404 { error: NOT_FOUND }          — id is well-formed but unknown
// 409 { error: CONFLICT }           — batch_items reference the product
productsRouter.delete('/:id', requireSession, async (c) => {
  const idResult = parseIdParam(c);
  if (!idResult.ok) return idResult.response;
  const id = idResult.id;

  try {
    const deleted = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });

    if (deleted.length === 0) {
      // No row matched — either the id never existed or it was
      // deleted between this request and the previous one. Both look
      // the same to the client.
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

    return c.body(null, 204);
  } catch (err: unknown) {
    // FK violation from `batch_items.product_id` (ON DELETE RESTRICT).
    // The error's `constraint` field names the FK, but the message
    // we return is the canonical English copy — clients should match
    // on the error code, not the message.
    if (isPgError(err) && err.code === PG_FK_VIOLATION) {
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'CONFLICT',
            message: 'Product has batch items and cannot be deleted',
          },
        }),
        409,
      );
    }
    throw err;
  }
});

export { productsRouter };