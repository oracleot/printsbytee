import { Hono } from 'hono';

import { requireSession } from '../../middleware/requireSession.js';
import type { AppEnv } from '../../types.js';

import { createProduct } from './handlers/create.js';
import { deleteProduct } from './handlers/delete.js';
import { getProductBySlug, listProducts } from './handlers/list.js';
import { updateProduct } from './handlers/update.js';

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
 * product has zero stock. Stock is computed by joining against
 * `batch_items WHERE status = 'sellable'` — see
 * `./_shared/stock.ts`.
 *
 * Error envelopes follow the canonical shape from
 * `docs/api-surface.md`. All 4xx paths use `ErrorResponseSchema.parse`
 * so a future drift between the route and the shared contract fails
 * at the edge instead of leaking bad JSON.
 */

const productsRouter = new Hono<AppEnv>();

productsRouter.get('/', listProducts);
productsRouter.get('/:slug', getProductBySlug);

productsRouter.post('/', requireSession, createProduct);
productsRouter.patch('/:id', requireSession, updateProduct);
productsRouter.delete('/:id', requireSession, deleteProduct);

export { productsRouter };