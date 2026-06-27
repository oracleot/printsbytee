import type { Context } from 'hono';
import { z } from 'zod';

import {
  ErrorResponseSchema,
  ProductCategorySchema,
  uuidSchema,
  type ProductWithStock,
} from '@printsbytee/shared';

import type { Product } from '../../db/schema/products.js';
import type { AppEnv } from '../../types.js';

// ── Postgres error codes ───────────────────────────────────────────────
//
// The dictionary of `err.code` values from `node-postgres`. Kept as
// module constants so the routes read declaratively and a future drift
// from PG versions surfaces in one place.
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FK_VIOLATION = '23503';

/** Narrow a caught error to a Postgres-dictionary error object. */
export function isPgError(e: unknown): e is { code: string; constraint?: string } {
  if (typeof e !== 'object' || e === null) return false;
  const code = (e as Record<string, unknown>).code;
  if (typeof code !== 'string') return false;
  const constraint = (e as Record<string, unknown>).constraint;
  if (constraint !== undefined && typeof constraint !== 'string') return false;
  return true;
}

// ── FK constraint → user-facing 409 message map ─────────────────────────
//
// `db/schema/batches.ts` and `db/schema/leads.ts` both declare FKs to
// `products.id` with `ON DELETE RESTRICT`. Postgres surfaces a 23503 on
// the parent DELETE; we discriminate by `err.constraint` so the message
// tells the client *why* the delete was refused.
//
//   batch_items_product_id_products_id_fk    → batch_items reference it
//   waitlist_entries_product_id_products_id_fk → waitlist entries
//
// `enquiries_product_id_products_id_fk` uses `ON DELETE SET NULL`, so a
// parent DELETE never trips 23503 on it — no entry needed here. The
// default branch covers future FKs that may be added with RESTRICT.
export const FK_CONSTRAINT_MESSAGES: Record<string, string> = {
  batch_items_product_id_products_id_fk:
    'Product has batch items and cannot be deleted',
  waitlist_entries_product_id_products_id_fk:
    'Product has waitlist entries and cannot be deleted',
};

export const GENERIC_FK_MESSAGE = 'Product cannot be deleted while referenced by other records';

/**
 * Look up the user-facing 409 message for a `23503` FK violation.
 *
 * Exported so a unit test can exercise the mapping without standing up
 * a live Postgres — see `scripts/test-product-delete-fk-mapping.ts`.
 */
export function fkViolationMessage(constraint: string | undefined): string {
  if (!constraint) return GENERIC_FK_MESSAGE;
  return FK_CONSTRAINT_MESSAGES[constraint] ?? GENERIC_FK_MESSAGE;
}

// ── Query-string coercion helpers ───────────────────────────────────────

/**
 * Booleans arrive as strings from the URL (`?inStock=true`). Explicit
 * coerce — `z.coerce.boolean()` would treat any non-empty string as
 * `true`, which silently accepts garbage.
 */
export const booleanFromQuery = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean());

export const ProductListQuerySchema = z.object({
  category: ProductCategorySchema.optional(),
  inStock: booleanFromQuery.optional(),
  featured: booleanFromQuery.optional(),
});

/** Convert a `Product` row from the DB layer to the wire shape (dates → ISO). */
export function toProductDto(
  row: Product,
): Omit<ProductWithStock, 'inStock' | 'stockCount' | 'stockLabel'> {
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
export function parseIdParam(
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
export async function parseJsonBody(
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