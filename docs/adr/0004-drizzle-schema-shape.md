# Drizzle schema split and index strategy

The first Drizzle schema (`apps/api/src/db/schema.ts`, landed in #10) had to balance three things against the 200-line file cap: cohesion (everything reachable from one entry point), domain separation (different agents will edit different tables), and the schema having to be a single migratable unit. We also had to pick an index strategy that matches the read patterns in `docs/api-surface.md` without over-indexing writes.

## Considered options

- **One file, one table block** — easier to read top-to-bottom but already at ~250 lines for the eight tables + two enums + relations. Hit the 200-line cap immediately.
- **One file per table, no shared `schema.ts`** — keeps each file tiny but breaks the "single entry point" contract that `drizzle-kit` and `db/client.ts` rely on. Forces every consumer to know about every file.
- **One entry `schema.ts` re-exporting from a `schema/` directory, one file per concern (chosen)** — each file stays under 200 lines, every consumer imports a single path (`./schema`), and `drizzle.config.ts` points at one entry. Domain ownership maps cleanly: `products.ts` (catalogue), `batches.ts` (production + sales), `leads.ts` (enquiries + waitlist), `auth.ts` (users + sessions), `enums.ts` (shared enums), `relations.ts` (eager-loading graph).

## Index strategy

The schema adds more indexes than `docs/data-model.md` explicitly requires. The doc is the source of truth for *which* tables and constraints exist; indexes beyond that are an implementation choice driven by the read patterns documented in `docs/api-surface.md` and the derivation rules in `docs/data-model.md`.

| Index | Why |
|---|---|
| `products_slug_unique` | Direct lookup on `GET /products/:slug`. Required by data-model.md. |
| `products_category_idx` | Powers `?category=` filter on `GET /products`. |
| `products_featured_idx` (partial, `WHERE featured = true`) | Home page reads only featured rows; a partial index keeps it tight. |
| `batch_items_batch_id_idx` | `GET /batches/:id/items` and the totals join. |
| `batch_items_product_status_idx` | `stockCount` derivation: `count(...) where productId = ? and status = 'sellable'`. |
| `batch_items_sellable_by_product_idx` (partial, `WHERE status = 'sellable'`) | Same hot read, even smaller and cheaper than the composite. |
| `production_batches_created_at_idx` | `?from=&to=` date filters on `GET /batches`. |
| `sales_batch_item_id_idx` | The unique constraint creates one already, but the explicit index makes the totals join plan obvious in `EXPLAIN`. |
| `sales_sold_at_idx` | Future "sales over time" reports. Cheap to add now while writes are low. |
| `enquiries_created_at_idx` | Recent-first inbox listing. |
| `enquiries_product_id_idx` | Joins for the per-product enquiry view. |
| `waitlist_product_email_unique` | Required by data-model.md. |
| `waitlist_product_id_idx` | Restock notification queries. |
| `waitlist_email_idx` (functional, `lower(email)`) | "You're on the waitlist for…" lookups. Functional so case differences don't bypass it. |
| `sessions_user_id_idx` | Auth check joins sessions → users. |
| `sessions_expires_at_idx` | Sweep job: `delete where expiresAt < now()`. |

Explicit indexes that we considered and dropped:

- **`users_email_lower_idx` (functional on `lower(email)`)** — dropped. The unique constraint on `users.email` already creates a btree on the column. As long as the API normalises email to lowercase before insert (which the `LoginRequestSchema` already enforces via `z.string().email()` and the auth layer can lowercase), the existing unique index covers all lookups. Adding a functional index would duplicate the index without changing the lookup shape.

## Money as `integer` (pence)

`docs/data-model.md` specifies money as `integer (pence)` for every monetary column. We followed it exactly. The supabase `schema-data-types` rule prefers `numeric` for "exact decimal arithmetic" but integer pence is also exact, fits easily in int4 (well under 2³¹ for any realistic GBP price), and matches the doc's wording. The Zod schemas in `packages/shared` also validate with `z.number().int().nonnegative()`, so the wire shape and the column shape agree. If pence ever needs decimals (unlikely), the column swap is a normal migration.

## Timestamps as `timestamp({ withTimezone: true, mode: 'date' })`

The doc says `timestamptz` and the Zod schemas validate `isoTimestampSchema` (`z.string().datetime({ offset: true })`). Drizzle's `mode: 'date'` keeps values as JS `Date` instances in the API layer while the SQL representation is `timestamp with time zone`. This avoids a custom type adapter and keeps `Date`-typed code in routes natural.

## `production_cost` as `jsonb`

The doc specifies `jsonb` and names the four sub-fields. Storing as `jsonb` (rather than four integer columns) keeps the schema flexible if the breakdown ever grows, and matches the Zod `ProductionCostSchema` shape one-for-one. The Drizzle column uses a `$type<ProductionCostJson>()` adapter so TypeScript callers see the typed object without runtime parsing.

## FK delete behaviour

Every FK matches the table in `docs/data-model.md` "Relationships":

| FK | Behaviour |
|---|---|
| `batch_items.batch_id → production_batches.id` | `CASCADE` |
| `batch_items.product_id → products.id` | `RESTRICT` |
| `sales.batch_item_id → batch_items.id` | `CASCADE` (plus `UNIQUE` for at-most-one) |
| `enquiries.product_id → products.id` | `SET NULL` |
| `waitlist_entries.product_id → products.id` | `RESTRICT` |
| `sessions.user_id → users.id` | `CASCADE` |

The RESTRICT constraints are belt-and-braces: the API layer refuses these deletes first, but the DB is the source of truth.

## Out of scope

- Applying the migration to Railway — that's I11.
- Route handlers that consume the schema — that's I12 onwards.
- Seed data / fixtures — I14 will import `data/products.json` separately.
