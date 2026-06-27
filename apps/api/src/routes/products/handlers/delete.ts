import type { Context } from 'hono';
import { eq } from 'drizzle-orm';

import { ErrorResponseSchema } from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import { products } from '../../../db/schema/products.js';
import type { AppEnv } from '../../../types.js';

import {
  PG_FK_VIOLATION,
  fkViolationMessage,
  isPgError,
  parseIdParam,
} from '../helpers.js';

/**
 * `DELETE /products/:id` — hard-delete a product.
 *
 * Owner-only. Refuses with 409 if any child row references the product
 * via a `RESTRICT`-mode FK. The mapping from `err.constraint` to the
 * user-facing 409 message lives in `helpers.ts`:
 *
 *   constraint → message
 *   ────────────────────────────────────────────────────────────────
 *   batch_items_product_id_products_id_fk
 *     → "Product has batch items and cannot be deleted"
 *   waitlist_entries_product_id_products_id_fk
 *     → "Product has waitlist entries and cannot be deleted"
 *   (anything else)
 *     → "Product cannot be deleted while referenced by other records"
 *
 * `enquiries_product_id_products_id_fk` is `ON DELETE SET NULL`, so a
 * parent DELETE never trips 23503 on it — no mapping needed.
 *
 * The unit test in `scripts/test-product-delete-fk-mapping.ts`
 * exercises the mapping table directly so the constraint → message
 * association stays correct under refactors.
 *
 *   204                                — deleted, no body
 *   400 { error: VALIDATION_ERROR }   — malformed id
 *   401 { error: UNAUTHORIZED }       — from requireSession
 *   404 { error: NOT_FOUND }          — id is well-formed but unknown
 *   409 { error: CONFLICT }           — child FK references the product
 */
export async function deleteProduct(c: Context<AppEnv>): Promise<Response> {
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
    // FK violation from a child table with `ON DELETE RESTRICT`.
    // Discriminate by `err.constraint` so the message tells the client
    // *which* child table blocked the delete. See method docstring and
    // `FK_CONSTRAINT_MESSAGES` in `helpers.ts` for the full mapping.
    if (isPgError(err) && err.code === PG_FK_VIOLATION) {
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'CONFLICT',
            message: fkViolationMessage(err.constraint),
          },
        }),
        409,
      );
    }
    throw err;
  }
}