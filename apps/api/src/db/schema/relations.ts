import { relations } from 'drizzle-orm';

import { sessions, users } from './auth.js';
import { batchItems, productionBatches, sales } from './batches.js';
import { enquiries, waitlistEntries } from './leads.js';
import { products } from './products.js';

/**
 * Drizzle relations — power `db.query.products.findMany({ with: { ... } })`
 * and `with: { batchItems: { with: { sale: true } } }` style eager loading.
 *
 * These mirror the relationship diagram in `docs/data-model.md`:
 *
 *   Product 1────* BatchItem *────1 ProductionBatch
 *      │                              │
 *      *────0..1 Enquiry             │
 *      *────1..* WaitlistEntry       │
 *                                     │
 *   User 1────* Session              │
 *                                     │
 *   BatchItem 1────0..1 Sale         │
 *
 * Note: `sales.batchItemId` is also UNIQUE at the column level, so the
 * 1-to-0..1 shape between BatchItem and Sale is enforced by the
 * database, not just by these relation declarations.
 */

export const productsRelations = relations(products, ({ many }) => ({
  batchItems: many(batchItems),
  enquiries: many(enquiries),
  waitlistEntries: many(waitlistEntries),
}));

export const productionBatchesRelations = relations(
  productionBatches,
  ({ many }) => ({
    batchItems: many(batchItems),
  }),
);

export const batchItemsRelations = relations(batchItems, ({ one }) => ({
  batch: one(productionBatches, {
    fields: [batchItems.batchId],
    references: [productionBatches.id],
  }),
  product: one(products, {
    fields: [batchItems.productId],
    references: [products.id],
  }),
  // 0..1 sale: the UNIQUE on sales.batch_item_id guarantees at most
  // one, so `with: { sale: true }` returns either the sale or undefined.
  sale: one(sales, {
    fields: [batchItems.id],
    references: [sales.batchItemId],
  }),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  batchItem: one(batchItems, {
    fields: [sales.batchItemId],
    references: [batchItems.id],
  }),
}));

export const enquiriesRelations = relations(enquiries, ({ one }) => ({
  product: one(products, {
    fields: [enquiries.productId],
    references: [products.id],
  }),
}));

export const waitlistEntriesRelations = relations(
  waitlistEntries,
  ({ one }) => ({
    product: one(products, {
      fields: [waitlistEntries.productId],
      references: [products.id],
    }),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
