import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../env.js';

import * as schema from './schema.js';

// Eagerly construct the pool so missing/incorrect DATABASE_URL is caught
// on boot rather than on the first query. No queries are issued here, so
// the API still boots in environments where Postgres is not yet attached
// (e.g. a fresh Railway service before provisioning).
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

// Passing the schema module enables `db.query.<table>.findMany({ with: ... })`
// typed eager loading (uses the relations declared in `./schema/relations.ts`).
export const db = drizzle(pool, { schema });