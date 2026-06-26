import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { batchItemStatusEnum } from './enums.js';
import { products } from './products.js';

/**
 * Production cost shape stored on `production_batches.production_cost`.
 *
 * Every field is integer pence — never decimals. Display formatting
 * belongs to the UI layer; the API returns the raw pence.
 *
 * The breakdown exists because the owner wants to see where the
 * production spend went; it is not per-item and never will be (see
 * ADR-0003).
 */
export interface ProductionCostJson {
  materials: number;
  logistics: number;
  salary: number;
  other: number;
}

/**
 * A single production run containing many `batch_items`.
 *
 * Cost semantics per ADR-0002 / ADR-0003:
 *   - `productionCost` (jsonb) holds the full spend broken down by
 *     category. Total is derived by summing the four fields.
 *   - `marketingCost` is a single integer pence value attached to the
 *     batch — not a business-wide budget (see glossary in CONTEXT.md).
 *
 * Computed totals (`expectedRevenue`, `actualRevenue`, `loss`,
 * `expectedProfit`, `profitSoFar`) live in SQL — never on this row.
 */
export const productionBatches = pgTable(
  'production_batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Human label, e.g. "Spring 2026 — Batch 1". Free-form but
    // required.
    name: text('name').notNull(),

    // Production cost breakdown. Stored as jsonb so the four named
    // sub-fields can be validated at the API layer (Zod) and queried
    // via jsonb operators when reports need them.
    productionCost: jsonb('production_cost')
      .$type<ProductionCostJson>()
      .notNull(),

    // Marketing cost in pence (single integer per docs/data-model.md).
    marketingCost: integer('marketing_cost').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Powers `GET /batches?from=&to=` inclusive date filters.
    createdAtIdx: index('production_batches_created_at_idx').on(
      table.createdAt,
    ),
  }),
);

/**
 * A single physical piece within a `production_batches` row.
 *
 * Lifecycle (`batch_item_status`):
 *   - `sellable` → on the shelf, counted in stock.
 *   - `sold`     → has a corresponding `sales` row.
 *   - `faulty`   → unsellable, contributes 0 to `expectedRevenue`
 *                  (revenue-side loss model — ADR-0003).
 *
 * FK behaviour mirrors `docs/data-model.md` "Relationships":
 *   - `batchId`  CASCADE   — deleting a batch removes its items
 *                            (and their sales, transitively).
 *   - `productId` RESTRICT — a Product with items cannot be deleted.
 *
 * `plannedSalePrice` is snapshotted from `Product.price` at creation
 * (overridable per item) and then frozen for the batch — see ADR-0002.
 */
export const batchItems = pgTable(
  'batch_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    batchId: uuid('batch_id')
      .notNull()
      .references(() => productionBatches.id, { onDelete: 'cascade' }),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),

    // Pence. Copied from `products.price` at create time per ADR-0002.
    plannedSalePrice: integer('planned_sale_price').notNull(),

    status: batchItemStatusEnum('status').notNull().default('sellable'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Drives `GET /batches/:id/items` and the per-batch totals join.
    batchIdIdx: index('batch_items_batch_id_idx').on(table.batchId),

    // The stock-count subquery (`count(batch_items where productId = ?
    // and status = 'sellable')`) needs an index on (product_id, status)
    // to avoid a full scan as the catalogue grows.
    productStatusIdx: index('batch_items_product_status_idx').on(
      table.productId,
      table.status,
    ),

    // Partial index for the most common read: listing sellable items
    // for a given product. Small, hot, fast.
    sellableByProductIdx: index('batch_items_sellable_by_product_idx')
      .on(table.productId)
      .where(sql`${table.status} = 'sellable'`),
  }),
);

/**
 * A recorded sale of a `batch_items` row.
 *
 * Invariants:
 *   - At most one Sale per BatchItem (UNIQUE on `batchItemId`).
 *   - `sales` rows CASCADE-delete with their BatchItem, so undoing
 *     a sale via `DELETE /sales/:id` reverts the BatchItem to
 *     `sellable` at the API layer (see api-surface.md Sales section).
 *
 * The `batchItemId` UNIQUE is the canonical "0..1 sale per item" rule
 * — the API returns CONFLICT when an already-sold item is sold again.
 */
export const sales = pgTable(
  'sales',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    batchItemId: uuid('batch_item_id')
      .notNull()
      .unique()
      .references(() => batchItems.id, { onDelete: 'cascade' }),

    // Actual sale price in pence. May differ from the item's
    // plannedSalePrice (e.g. negotiated or discounted).
    salePrice: integer('sale_price').notNull(),

    // Set by client or `now()`. Stored as timestamptz in UTC.
    soldAt: timestamp('sold_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // Optional denormalised customer fields. Useful when the buyer
    // is not (yet) a user of the system. NULL means "not recorded".
    customerName: text('customer_name'),
    customerContact: text('customer_contact'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Drives the "actual revenue" sum in the per-batch totals query
    // (joins batch_items.id → sales.batch_item_id).
    batchItemIdIdx: index('sales_batch_item_id_idx').on(table.batchItemId),
    soldAtIdx: index('sales_sold_at_idx').on(table.soldAt),
  }),
);

export type ProductionBatch = typeof productionBatches.$inferSelect;
export type NewProductionBatch = typeof productionBatches.$inferInsert;

export type BatchItem = typeof batchItems.$inferSelect;
export type NewBatchItem = typeof batchItems.$inferInsert;

export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
