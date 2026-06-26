# Applying database migrations to Railway Postgres (issue I11)

The first migration (`0000_shiny_alice.sql`) was generated against an
empty Postgres database by issue I10 and applied to the live Railway
Postgres instance by issue I11. This runbook is the operator procedure
for (a) re-applying the first migration or (b) applying future
migrations to the same database.

The migration file is committed at
`apps/api/drizzle/0000_shiny_alice.sql` and is replayed by drizzle-kit's
migrator (`pnpm --filter @printsbytee/api db:migrate`).

## Where this runs

The Drizzle migration runner needs the **source tree** (the SQL file
under `apps/api/drizzle/`) **plus** all dev dependencies (`tsx`,
`drizzle-kit`, `pg`). Both ship in the deployed API image — `railway.toml`
builds via Nixpacks with `--filter @printsbytee/api...`, so the
container at `/app` contains the full monorepo and the API's
`node_modules`.

We run the migration **on the deployed service container** over SSH via
the [Railway CLI](https://docs.railway.com/guides/cli):

```bash
railway ssh --service api -- \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  pnpm --filter @printsbytee/api db:migrate
```

Why not `railway run --service api -- pnpm …db:migrate`? `railway run`
only injects env vars into a **local** process — it does not tunnel TCP.
`DATABASE_URL` on the API service points at `postgres.railway.internal`,
which only resolves inside Railway's network. Running locally would
fail with `ENOTFOUND postgres.railway.internal`. Running on the
deployed container over SSH executes the command **inside** Railway's
network, where that hostname resolves correctly.

This matches the pattern in `docs/deploy/r2-image-upload.md`: secrets
stay on the service, and the operator procedure never exports
`DATABASE_URL` to the local shell, never writes it to disk, and never
has to rotate it independently of Railway.

## Prerequisites

1. The Railway project from issue I02 has been provisioned.
2. The Postgres database is attached to the project and **online**.
3. `DATABASE_URL` is set on the **Railway `api` service** (Railway
   injects this automatically when Postgres is in the same project,
   so it should already be present from I02/I06).
4. The Railway CLI is installed and authenticated.
5. An SSH key is registered with Railway for `railway ssh`:

   ```bash
   ssh-keygen -t ed25519 -N '' -f ~/.ssh/railway_dbmigrate -C 'i11-apply-migration'
   railway ssh keys add ~/.ssh/railway_dbmigrate -n "i11-dbmigrate"
   ```

   One-time per workstation. The CLI can also import keys from GitHub
   via `railway ssh keys github`, but that requires GitHub OAuth scope
   the CLI may not yet have.

## Apply

From a workstation with the repo checked out and linked:

```bash
railway link --project printsbytee --service api
railway ssh --service api -- \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  pnpm --filter @printsbytee/api db:migrate
```

Expected output:

```
> @printsbytee/api@0.1.0 db:migrate /app/apps/api
> tsx node_modules/drizzle-kit/bin.cjs migrate

No config path provided, using default 'drizzle.config.ts'
Reading config file '/app/apps/api/drizzle.config.ts'
Using 'pg' driver for database querying
[⣷] applying migrations...[✓] migrations applied successfully!
```

Exit code is `0` on success.

## Verify

Drizzle-kit does not echo per-statement output, so a clean exit only
proves the runner didn't throw — it does **not** prove every table,
enum, and constraint actually landed. Run a verification pass after
every apply.

A repeatable verification script lives at
`apps/api/scripts/verify-migration.ts` (committed). It introspects the
schema and prints every artefact we care about. On the deployed
container:

```bash
railway ssh --service api -- \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  bash -c 'cd /app/apps/api && ./node_modules/.bin/tsx scripts/verify-migration.ts'
```

Expected output: eight tables under `public`, both enums with their
full value lists, every expected index, all six foreign keys with
their correct delete rule, and exactly one row in
`drizzle.__drizzle_migrations` for `0000_shiny_alice`. The recorded
output from the initial apply lives at
[`docs/deploy/db-migrations-verification.md`](./db-migrations-verification.md).

If `psql` is preferred and the operator can reach a public proxy URL
for the database (Railway exposes one when the Postgres service has a
public domain), the same checks can be issued as `psql` meta-commands:

```bash
railway run --service api -- psql "$DATABASE_URL" -c '\dt'
railway run --service api -- psql "$DATABASE_URL" -c '\dT+'
railway run --service api -- psql "$DATABASE_URL" -c '\d products'
railway run --service api -- psql "$DATABASE_URL" -c '\d waitlist_entries'
railway run --service api -- psql "$DATABASE_URL" -c '\d batch_items'
railway run --service api -- psql "$DATABASE_URL" -c '\d sales'
```

Note: `railway run` only sets env vars locally; this works only when
the operator has a public Postgres proxy URL reachable from their
workstation. `railway ssh` is the path that works in all setups.

## Idempotency

drizzle-kit's migrator maintains `drizzle.__drizzle_migrations` (a
schema separate from `public`) with one row per applied migration.
Re-running `pnpm db:migrate` once a migration is recorded is a **no-op**
on the database: the runner sees the migration is already applied,
emits no further DDL, and exits `0`. (The migrator's stdout still
prints `[✓] migrations applied successfully!` even when there was
nothing to apply — that wording comes from drizzle-kit 0.28 and is
not a reliable "we did work" signal. Verify by re-querying the
ledger, not by reading the message.) Re-running is therefore the
safe default for CI, automation, and the human "I just want to be
sure" reflex. Re-run the verification script (above) — the
`drizzle.__drizzle_migrations` block will still print exactly one
row.

## Rollback

This is the **first** migration on an empty database, so rollback for
the initial apply is simply "drop the schema and start over":

```sql
DROP SCHEMA public CASCADE;
DROP SCHEMA drizzle CASCADE;
```

Future migrations need real `down` SQL. drizzle-kit does not generate
`down` SQL automatically — there is no `drizzle-kit migrate --down`. A
follow-up issue should add either:

- Hand-written `down.sql` files tracked alongside each generated
  `up.sql`, run by an explicit `pnpm db:rollback` script.
- Or adopt [`drizzle-migrations`](https://github.com/drizzle-team/drizzle-orm-migrations)
  / a custom migration harness that maintains both directions.

Until that lands, a destructive schema change is rolled back by:

1. Taking a `pg_dump` **before** the migration runs.
2. If the migration goes sideways, `psql < pre-migration.dump` to
   restore.

For non-destructive changes (adding nullable columns, creating
indexes, adding enum values), prefer forward-only fixes — they're
cheaper than rolling back and re-applying.

## Required env vars on the Railway `api` service

The migration runner reads `DATABASE_URL` from `process.env`, which
the Railway CLI injects on the deployed container automatically.
Operators do **not** export it themselves.

| Var | Where set | Why |
|---|---|---|
| `DATABASE_URL` | Railway `api` service (auto-injected from the Postgres database in the same project) | The drizzle-kit migrator connects with this URL. `apps/api/src/env.ts` validates the value on API boot, so an empty/bad value will fail the API deployment with a clear error. |

No other env vars are needed to run migrations. `SESSION_SECRET`,
`INTERNAL_API_KEY`, `R2_*`, and `SMTP_*` are required by the running
API but not by the migration runner.

## Follow-ups

- **Real `down` migrations.** See "Rollback" above — track as a new
  issue.
- **Run migrations on deploy.** Currently migrations are a manual
  step. A safer long-term pattern is to run `db:migrate` as a
  pre-start hook in the Railway deploy (e.g. via a release command or
  a dedicated `migrate` Railway service). Track as a new issue once
  the schema stabilises.
- **Backups.** Add automated `pg_dump` to a Railway cron / R2 bucket
  before the first destructive change lands in a future migration.
