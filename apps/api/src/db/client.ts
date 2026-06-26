import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../env.js';

// Eagerly construct the pool so missing/incorrect DATABASE_URL is caught
// on boot rather than on the first query. No queries are issued here, so
// the API still boots in environments where Postgres is not yet attached
// (e.g. a fresh Railway service before provisioning).
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool);