import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { products } from './products.js';

/**
 * A contact-form submission from the public website.
 *
 * `productId` is optional — enquiries can be general ("I have a
 * question") or product-specific ("Is this available in red?"). The
 * FK uses ON DELETE SET NULL so deleting a product preserves the
 * enquiry as a historical record (rather than cascading and losing the
 * message).
 *
 * SMTP notification is fired by the API on insert (see issue I16);
 * this table is the durable store.
 */
export const enquiries = pgTable(
  'enquiries',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    name: text('name').notNull(),
    email: text('email').notNull(),

    // Optional. Null = "not about a specific product".
    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),

    message: text('message').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Recent-first listing in the business app.
    createdAtIdx: index('enquiries_created_at_idx').on(table.createdAt),

    // Joins to products for the enquiry inbox view.
    productIdIdx: index('enquiries_product_id_idx').on(table.productId),
  }),
);

/**
 * A "Notify Me" signup for a specific Product.
 *
 * Uniqueness: `(productId, email)` — one waitlist entry per product
 * per email. Returning a duplicate to the same product is a no-op,
 * but signing up for two different products is allowed (and expected
 * — people waitlist for multiple items).
 *
 * `productId` is RESTRICT: a Product with active waitlist entries
 * cannot be deleted. The API layer should refuse first, but the DB
 * constraint is the source of truth.
 */
export const waitlistEntries = pgTable(
  'waitlist_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),

    email: text('email').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Enforces the (productId, email) uniqueness rule.
    productEmailUnique: uniqueIndex('waitlist_product_email_unique').on(
      table.productId,
      table.email,
    ),

    // Lookup by product when notifying waitlisted users on restock.
    productIdIdx: index('waitlist_product_id_idx').on(table.productId),

    // Lookup by email for "you are on the waitlist for…" notifications.
    emailIdx: index('waitlist_email_idx').on(
      sql`lower(${table.email})`,
    ),
  }),
);

export type Enquiry = typeof enquiries.$inferSelect;
export type NewEnquiry = typeof enquiries.$inferInsert;

export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type NewWaitlistEntry = typeof waitlistEntries.$inferInsert;
