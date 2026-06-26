import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Postgres enum types defined in `docs/data-model.md`.
 *
 * Values must stay in lockstep with:
 *   - the enum types in `docs/data-model.md`
 *   - the Zod schemas in `packages/shared/src/schemas/products.ts`
 *     and `packages/shared/src/schemas/production.ts`
 *
 * Adding or renaming a value here is a breaking change for every layer
 * downstream: the SQL migration, the shared Zod schema, and any code
 * that branches on the enum. Capture the decision in `docs/adr/`.
 */

/** Catalogue groupings for a `Product` (e.g. `lora-set`). */
export const productCategoryEnum = pgEnum('product_category', [
  'lora-set',
  'aso-oke-kimono',
  'fringe-bubu',
  'naya-jump-suit',
  'lumi-set',
  'jasmine-set',
  'seline-dress',
  'aso-oke-pant',
  'kora-bubu',
  'mina-set',
]);

/** Lifecycle status of a single `batch_items` row. */
export const batchItemStatusEnum = pgEnum('batch_item_status', [
  'sellable',
  'sold',
  'faulty',
]);
