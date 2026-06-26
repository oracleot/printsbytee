# I11 verification — initial migration applied to Railway Postgres

Captured **2026-06-26** against the Railway `printsbytee` project
(production, Postgres database `db`). Operator: `db` agent.
Migration: `apps/api/drizzle/0000_shiny_alice.sql`.

## Apply command

```bash
railway link --project printsbytee --service api
railway ssh --service api -- \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  pnpm --filter @printsbytee/api db:migrate
```

Exit status: **0**. Output (trimmed):

```
> @printsbytee/api@0.1.0 db:migrate /app/apps/api
> tsx node_modules/drizzle-kit/bin.cjs migrate

No config path provided, using default 'drizzle.config.ts'
Reading config file '/app/apps/api/drizzle.config.ts'
Using 'pg' driver for database querying
[⣷] applying migrations...[✓] migrations applied successfully!
```

drizzle-kit recorded exactly **one** row in
`drizzle.__drizzle_migrations`
(`id=1, hash=b925df1950d862ba23003e28facf43cfcfcce56e0a9a820063ce3e747b8195bf`).
A subsequent re-run produced `No schema changes, nothing to migrate`
and exited `0`, confirming idempotency.

## Verification script

```bash
railway ssh --service api -- \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  bash -c 'cd /app/apps/api && ./node_modules/.bin/tsx scripts/verify-migration.ts'
```

Committed at
[`apps/api/scripts/verify-migration.ts`](../../apps/api/scripts/verify-migration.ts).

## Output

### Tables (`\dt`)

```
batch_items, enquiries, production_batches, products,
sales, sessions, users, waitlist_entries
```

All eight public tables from `docs/data-model.md`. (`__drizzle_migrations`
is in a separate `drizzle` schema, reported at the bottom.)

### Enums (`\dT+`)

```
batch_item_status  = { sellable, sold, faulty }
product_category   = { lora-set, aso-oke-kimono, fringe-bubu,
                       naya-jump-suit, lumi-set, jasmine-set,
                       seline-dress, aso-oke-pant, kora-bubu,
                       mina-set }
```

Both enums from `docs/data-model.md`, all expected values in
documented order, no extras.

### `products` (`\d products`)

Columns: `id uuid PK DEFAULT gen_random_uuid()`, `slug text NOT NULL`,
`name text NOT NULL`, `category product_category NOT NULL`,
`description text NOT NULL DEFAULT ''`, `price integer NOT NULL`,
`sizes text[] NOT NULL DEFAULT '{}'`, `images text[] NOT NULL DEFAULT '{}'`,
`notify_me_enabled boolean NOT NULL DEFAULT false`,
`featured boolean NOT NULL DEFAULT false`,
`created_at timestamptz NOT NULL DEFAULT now()`,
`updated_at timestamptz NOT NULL DEFAULT now()`.

Indexes: `products_pkey` (UNIQUE id), `products_slug_unique` (UNIQUE
slug — enforces the documented slug rule), `products_category_idx`
(btree on category), `products_featured_idx` (btree on featured
WHERE featured = true — partial index for the home-page query path).

### `waitlist_entries`

Indexes: `waitlist_entries_pkey` (UNIQUE id),
`waitlist_product_email_unique` (UNIQUE `(product_id, email)` —
enforces the documented `(productId, email)` rule),
`waitlist_product_id_idx` (btree), `waitlist_email_idx` (btree on
`lower(email)` — case-insensitive lookup).

### `batch_items`

Indexes: `batch_items_pkey`, `batch_items_batch_id_idx` (btree),
`batch_items_product_status_idx` (btree on `(product_id, status)` —
powers the per-product stock-count subquery),
`batch_items_sellable_by_product_idx` (btree on `product_id` WHERE
`status = 'sellable'` — partial index for the hot path).

No `(batch_id, product_id)` unique index exists, matching
`docs/data-model.md` ("a batch can contain many items of the same
product").

### `sales`

Constraints: PK on `id`, NOT NULL on every required column, FK
`sales_batch_item_id_batch_items_id_fk → batch_items.id` (CASCADE),
and **`sales_batch_item_id_unique` UNIQUE on `batch_item_id`** —
enforces the documented "at most one Sale per BatchItem" rule.

### Foreign keys (delete rules)

```
batch_items.batch_id         → production_batches.id  CASCADE
batch_items.product_id       → products.id            RESTRICT
enquiries.product_id         → products.id            SET NULL
sales.batch_item_id          → batch_items.id         CASCADE
sessions.user_id             → users.id               CASCADE
waitlist_entries.product_id  → products.id            RESTRICT
```

Every FK matches `docs/data-model.md` "Relationships" exactly.

### Drizzle migration ledger

```
drizzle.__drizzle_migrations:
  id=1 | hash=b925df1950d862ba23003e28facf43cfcfcce56e0a9a820063ce3e747b8195bf
```

Exactly one row for `0000_shiny_alice`. Hash matches the entry in
`apps/api/drizzle/meta/_journal.json`, so drizzle-kit will recognise
the migration as already applied on the next `db:migrate` invocation.

## Audit summary vs. `docs/data-model.md`

| Entity / rule | data-model.md | Live DB | |
|---|---|---|---|
| `product_category` values | 10 listed | 10, same order | ✅ |
| `batch_item_status` values | 3 listed | 3 | ✅ |
| `products` columns + defaults | 12 | 12 | ✅ |
| `products.slug` unique | yes | `products_slug_unique` | ✅ |
| `batch_items` no `(batch_id, product_id)` unique | yes | confirmed | ✅ |
| `sales` UNIQUE `batch_item_id` | yes | `sales_batch_item_id_unique` | ✅ |
| `waitlist_entries` UNIQUE `(product_id, email)` | yes | `waitlist_product_email_unique` | ✅ |
| `users` UNIQUE `email` | yes | `users_email_unique` | ✅ |
| `sessions.id` text PK | yes | text PK | ✅ |
| All FK delete rules | per diagram | identical | ✅ |
| Timestamps `timestamptz` default `now()` | yes | confirmed | ✅ |
| IDs `gen_random_uuid()` default | yes | confirmed | ✅ |
| No stored stock/totals columns | yes | confirmed | ✅ |

**Result:** the live database matches `docs/data-model.md` exactly. No
deviations. No drift between the generated migration, the Drizzle
schema, and the canonical documentation.

`pnpm --filter @printsbytee/api db:generate` was also run locally and
reported `No schema changes, nothing to migrate` — the checked-in
`0000_shiny_alice.sql` is the canonical representation of the current
Drizzle schema; no further SQL needs to be generated.
