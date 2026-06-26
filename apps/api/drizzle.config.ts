import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit configuration for the API service.
 *
 * - `dialect: 'postgresql'` matches the production database.
 * - `schema` is the entry point that re-exports every table and enum
 *   from `./src/db/schema/*.ts`. Splitting per concern keeps each file
 *   under the 200-line cap while letting drizzle-kit see the full graph.
 * - `out` points at `./drizzle`, which is where `pnpm db:generate`
 *   writes generated SQL migrations (issue #11 applies them to Railway).
 *
 * `dbCredentials` is intentionally read from `DATABASE_URL` so the same
 * env var the runtime uses (see `src/env.ts`) drives migrations. Local
 * generation only needs the URL to be present; nothing is connected to
 * during `generate`.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/printsbytee',
  },
  // Snake-case at the database layer matches `docs/data-model.md` and
  // the rest of the SQL world; camelCase stays in TypeScript via the
  // column names declared on each pgTable.
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
