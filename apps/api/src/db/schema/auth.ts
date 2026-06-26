import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Owner-only user account. Single-user today (the business owner), but
 * modeled as a real table so password hashing, sessions, and any
 * future read-only staff accounts share one auth shape.
 *
 * `passwordHash` is the bcrypt/argon2 digest — never the plaintext.
 * The comparison happens at the API layer; this column is opaque to
 * SQL.
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Login identifier. The `.unique()` declaration creates a btree
  // unique index, which is the index used for login lookups. Emails
  // should be normalized to lowercase at the API layer so a single
  // btree covers all case combinations.
  email: text('email').notNull().unique(),

  passwordHash: text('password_hash').notNull(),

  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
});

/**
 * Server-side session row keyed by an opaque random token.
 *
 * The token IS the primary key (and the cookie value), so:
 *   - `id` is text, not uuid — opaque bytes encoded as text.
 *   - Lookup on every authenticated request is the PK lookup itself
 *     (single index seek).
 *
 * `expiresAt` is sliding — extended on each authenticated use by the
 * API. Sessions are deleted on logout and CASCADE-deleted when the
 * owning user is removed.
 */
export const sessions = pgTable(
  'sessions',
  {
    // Opaque random token (cookie value). Generated server-side; no
    // client meaning.
    id: text('id').primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' })
      .notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Joins sessions → users on every authed request.
    userIdIdx: index('sessions_user_id_idx').on(table.userId),

    // Sweep job queries ("delete where expiresAt < now()") use this.
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
