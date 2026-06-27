/**
 * Smoke-check: print every route registered on the central API app.
 *
 * What this script does:
 *   - Imports Hono's `app` instance and reads its internal router
 *     table to prove every required route (e.g. `/waitlist`,
 *     `/enquiries`) is mounted. No handlers are invoked.
 *
 * Environment:
 *   - Does NOT need a live Postgres or real credentials. `db/client.ts`
 *     only constructs a `pg.Pool` (lazy connection) and the route
 *     handlers are never invoked, so no connection is ever opened.
 *   - DOES need placeholder env vars because `src/env.ts` validates
 *     env on import (zod schema, fail-fast). The following three vars
 *     are required by `env.ts` and must be supplied (any non-empty
 *     placeholder is fine — they are never used to connect anywhere):
 *       - DATABASE_URL     (must start with `postgres://` or `postgresql://`)
 *       - SESSION_SECRET   (any non-blank string)
 *       - INTERNAL_API_KEY (any non-blank string)
 *
 * Usage:
 *   DATABASE_URL=postgres://test:test@localhost:5432/test \
 *     SESSION_SECRET=test-session-secret \
 *     INTERNAL_API_KEY=test-internal-key \
 *     pnpm --filter @printsbytee/api exec tsx scripts/smoke-check-routes.ts
 */
import { app } from '../src/app.js';

// Hono stores its routes internally as a flat array of { method, path }
// entries. There is no public API for this in v4, but the `routes`
// property on the Hono instance is stable across 4.x.
type HonoInternalRoute = { method: string; path: string; handler: unknown };

const appAny = app as unknown as { routes?: HonoInternalRoute[] };

const routes: HonoInternalRoute[] = appAny.routes ?? [];

// Deduplicate by (method,path) since Hono adds an entry per layer.
const seen = new Set<string>();
const flat = routes
  .map((r) => ({ method: r.method, path: r.path }))
  .filter((r) => {
    const key = `${r.method} ${r.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

// eslint-disable-next-line no-console
console.log('Registered routes on @printsbytee/api:');
for (const r of flat) {
  // eslint-disable-next-line no-console
  console.log(`  ${r.method.padEnd(6)} ${r.path}`);
}

// Assert the critical paths exist.
//
// I21 adds three owner-gated write routes for /products. Asserting
// them here catches the case where a future refactor splits the
// products router into a sub-directory and silently drops one of the
// methods (e.g. `patch` becomes a typo for `put`).
//
// I23 adds the full batch CRUD surface (one read-one, one list, one
// create, one update, one delete). Asserting all five guards against
// a future split that silently drops a method.
//
// I24 adds four batch-item routes: two batch-scoped (mounted on
// `batchesRouter` at /batches/:id/items) and two by-id (mounted on
// `batchItemsRouter` at /batch-items/:id). Asserting all four keeps
// the split-handler refactor honest.
//
// I25 adds two sale routes: POST /batch-items/:id/sale (mounted on
// `batchItemsRouter`) and DELETE /sales/:id (mounted on a new
// `salesRouter`). Both must be present, in the documented paths.
//
// I22 adds one owner-gated upload route: POST /uploads (mounted on
// a new `uploadsRouter`). Asserting it here catches the case where
// a future refactor drops the route or renames the mount point.
const required: Array<[string, string]> = [
  ['POST', '/waitlist'],
  ['POST', '/enquiries'],
  ['GET', '/products'],
  ['POST', '/auth/login'],
  ['POST', '/products'],
  ['PATCH', '/products/:id'],
  ['DELETE', '/products/:id'],
  ['GET', '/batches'],
  ['POST', '/batches'],
  ['GET', '/batches/:id'],
  ['PATCH', '/batches/:id'],
  ['DELETE', '/batches/:id'],
  ['GET', '/batches/:id/items'],
  ['POST', '/batches/:id/items'],
  ['PATCH', '/batch-items/:id'],
  ['DELETE', '/batch-items/:id'],
  ['POST', '/batch-items/:id/sale'],
  ['DELETE', '/sales/:id'],
  ['POST', '/uploads'],
];

let failed = 0;
for (const [method, path] of required) {
  const hit = flat.some((r) => r.method === method && r.path === path);
  if (!hit) {
    // eslint-disable-next-line no-console
    console.error(`MISSING: ${method} ${path}`);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log(`OK:      ${method} ${path}`);
  }
}

if (failed > 0) {
  // eslint-disable-next-line no-console
  console.error(`\n${failed} required route(s) missing.`);
  process.exit(1);
} else {
  // eslint-disable-next-line no-console
  console.log('\nAll required routes registered.');
  process.exit(0);
}