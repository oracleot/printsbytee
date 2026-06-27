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
 * Owner-only. Hard-deletes a product. Refuses with 409 if any
 * `batch_items` row references the product — the FK is declared
 * `ON DELETE RESTRICT` in `db/schema/batches.ts`, so Postgres rejects
 * the DELETE before any row is removed and we surface that as a
 * canonical 409 envelope instead of letting the driver throw a 500.
 *
 *   204                                — deleted, no body
 *   400 { error: VALIDATION_ERROR }   — malformed id
 *   401 { error: UNAUTHORIZED }       — from requireSession
 *   404 { error: NOT_FOUND }          — id is well-formed but unknown
 *   409 { error: CONFLICT }           — batch_items reference the product
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
    // FK violation from `batch_items.product_id` (ON DELETE RESTRICT).
    // The error's `constraint` field names the FK, but the message
    // we return is the canonical English copy — clients should match
    // on the error code, not the message.
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