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
const required: Array<[string, string]> = [
  ['POST', '/waitlist'],
  ['POST', '/enquiries'],
  ['GET', '/products'],
  ['POST', '/auth/login'],
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