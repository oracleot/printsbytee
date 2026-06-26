import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { productCategoryEnum } from './enums.js';

/**
 * Catalogue row. One row per colour/style combo, e.g. `Lora Set — Red`.
 *
 * Stock fields (`inStock`, `stockCount`, `stockLabel`) are derived in
 * SQL and never stored — see `docs/data-model.md` ("Stock: derived,
 * never stored").
 *
 * Conventions:
 *   - IDs are server-generated UUIDv4 (`defaultRandom()` →
 *     `gen_random_uuid()`).
 *   - Prices are integer pence (`£40 = 4000`).
 *   - Timestamps are `timestamptz` stored in UTC; the UI converts to
 *     Europe/London at the edge.
 *   - `slug` is the human-readable URL key and is unique + indexed so
 *     `GET /products/:slug` is a single index lookup.
 */
export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Human-readable URL slug. Stable after creation (see api-surface.md
    // "id and slug are immutable" on PATCH /products/:id).
    slug: text('slug').notNull(),

    name: text('name').notNull(),
    category: productCategoryEnum('category').notNull(),

    // Marketing copy. Empty string allowed but discouraged; callers
    // can treat blank as "no description" at the UI layer.
    description: text('description').notNull().default(''),

    // GBP master price in pence per ADR-0002. Snapshotted onto
    // `batch_items.planned_sale_price` at item creation.
    price: integer('price').notNull(),

    // Available sizes (e.g. ['S', 'M', 'L']); empty array means N/A.
    // Stored as `text[]` per docs/data-model.md.
    sizes: text('sizes').array().notNull().default(sql`'{}'::text[]`),

    // Absolute R2 URLs (per docs/architecture.md "Images → Cloudflare R2").
    // Empty array allowed.
    images: text('images').array().notNull().default(sql`'{}'::text[]`),

    // Whether the "Notify Me" CTA shows on the public PDP.
    notifyMeEnabled: boolean('notify_me_enabled').notNull().default(false),

    // Whether featured on the home page.
    featured: boolean('featured').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Slug is the public lookup key — enforce uniqueness explicitly so
    // concurrent inserts surface as a DB conflict, not a silent dup.
    slugUnique: uniqueIndex('products_slug_unique').on(table.slug),

    // Btree on category powers `?category=` filtering on GET /products.
    categoryIdx: index('products_category_idx').on(table.category),

    // Partial index for the home page: only featured rows ever serve
    // that query, so an index over a tiny subset is cheap to maintain
    // and fast to scan.
    featuredIdx: index('products_featured_idx')
      .on(table.featured)
      .where(sql`${table.featured} = true`),
  }),
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
