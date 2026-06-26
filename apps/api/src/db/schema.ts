/**
 * Drizzle schema for the PrintsbyTee API.
 *
 * This file is the single entry point that `drizzle-kit` and `db/client.ts`
 * import. The tables, enums, and relations themselves are split per concern
 * under `./schema/` so each file stays under the repo's 200-line cap while
 * remaining cohesive:
 *
 *   - `./schema/enums.ts`     — `product_category`, `batch_item_status`
 *   - `./schema/products.ts`  — `products`
 *   - `./schema/batches.ts`   — `production_batches`, `batch_items`, `sales`
 *   - `./schema/leads.ts`     — `enquiries`, `waitlist_entries`
 *   - `./schema/auth.ts`      — `users`, `sessions`
 *   - `./schema/relations.ts` — Drizzle `relations(...)` declarations
 *
 * The schema is the canonical translation of `docs/data-model.md`. If
 * anything here drifts from that document, this file is wrong and the
 * document is right — fix the schema, not the doc.
 *
 * Consumers:
 *   - `db/client.ts` builds the Drizzle client from this module.
 *   - `drizzle.config.ts` points `drizzle-kit generate` here so the
 *     generated migration SQL reflects the whole graph at once.
 */

export * from './schema/enums.js';
export * from './schema/products.js';
export * from './schema/batches.js';
export * from './schema/leads.js';
export * from './schema/auth.js';
export * from './schema/relations.js';
