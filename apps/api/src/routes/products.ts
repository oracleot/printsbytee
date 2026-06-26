import { Hono } from 'hono';
import { and, asc, eq, type SQL } from 'drizzle-orm';
import { z } from 'zod';

import {
  ProductCategorySchema,
  ProductWithStockSchema,
  type ProductWithStock,
} from '@printsbytee/shared';

import { db } from '../db/client.js';
import { products, type Product } from '../db/schema/products.js';

import {
  getSellableCountsByProduct,
  withStock,
} from './_shared/stock.js';

/**
 * Public catalog read endpoints.
 *
 *   GET /products          → list with optional filters
 *   GET /products/:slug    → single product or NOT_FOUND
 *
 * Both responses include derived `inStock`, `stockCount`, and `stockLabel`
 * fields per `docs/data-model.md`. Stock is computed by joining against
 * `batch_items WHERE status = 'sellable'` — see `./_shared/stock.ts`.
 *
 * No auth: these are public catalog reads (api-surface.md "Products").
 * Write-side endpoints land in I21 after I20 ships auth.
 */

const productsRouter = new Hono();

/**
 * Query-string filter schema. Booleans arrive as strings from the URL
 * (`?inStock=true`), so we explicitly coerce — `z.coerce.boolean()` would
 * treat any non-empty string as `true`, which silently accepts garbage.
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

export { productsRouter };
