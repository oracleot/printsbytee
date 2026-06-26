/**
 * Verification script for the initial Railway migration (issue I11).
 *
 * Connects to `DATABASE_URL`, prints every public table, both enums with
 * their values, the constraints/indexes we care about, the FK delete
 * rules, and the contents of `__drizzle_migrations`. Run via:
 *
 *   railway ssh --service api -- \
 *     -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
 *     bash -c 'cd /app/apps/api && ./node_modules/.bin/tsx scripts/verify-migration.ts'
 *
 * (The deploy image is a snapshot from the commit that closed I11; if
 * you are running this locally against a fresh deploy, the file is
 * already in the image.)
 *
 * Reads `DATABASE_URL` from the environment (Railway injects it on the
 * service). Exits 0 on success, 1 on any error.
 */
import { Client } from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('verify-migration: DATABASE_URL is not set');
  process.exit(1);
}

const c = new Client({ connectionString: url });

const log = (label: string, rows: ReadonlyArray<Record<string, unknown>>) => {
  console.log(`\n=== ${label} ===`);
  for (const row of rows) {
    console.log(
      Object.entries(row)
        .map(([k, v]) => `${k}=${formatValue(v)}`)
        .join(' | '),
    );
  }
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (Array.isArray(v)) return `[${v.join(', ')}]`;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

async function main() {
  await c.connect();
  try {
    // 1. Tables
    const tables = await c.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
         WHERE schemaname = 'public'
         ORDER BY tablename`,
    );
    log('TABLES', tables.rows);

    // 2. Enums
    const enums = await c.query<{ typname: string; labels: string[] }>(
      `SELECT t.typname,
              array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
         FROM pg_type t
         JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typtype = 'e'
        GROUP BY t.typname
        ORDER BY t.typname`,
    );
    log('ENUMS', enums.rows);

    // 3. products details — confirm slug unique, created_at default.
    const productsCols = await c.query<{
      column_name: string;
      data_type: string;
      column_default: string | null;
      is_nullable: string;
    }>(
      `SELECT column_name, data_type, column_default, is_nullable
         FROM information_schema.columns
        WHERE table_name = 'products'
        ORDER BY ordinal_position`,
    );
    log('PRODUCTS COLUMNS', productsCols.rows);

    const productsIndexes = await c.query<{
      indexname: string;
      indexdef: string;
    }>(
      `SELECT indexname, indexdef FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'products'
        ORDER BY indexname`,
    );
    log('PRODUCTS INDEXES', productsIndexes.rows);

    // 4. waitlist_entries unique constraint on (product_id, email)
    const waitlistIndexes = await c.query<{
      indexname: string;
      indexdef: string;
    }>(
      `SELECT indexname, indexdef FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'waitlist_entries'
        ORDER BY indexname`,
    );
    log('WAITLIST INDEXES', waitlistIndexes.rows);

    // 5. batch_items composite index (batch_id, product_id, status)
    const batchItemsIndexes = await c.query<{
      indexname: string;
      indexdef: string;
    }>(
      `SELECT indexname, indexdef FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'batch_items'
        ORDER BY indexname`,
    );
    log('BATCH_ITEMS INDEXES', batchItemsIndexes.rows);

    // 6. sales — UNIQUE on batch_item_id
    const salesConstraints = await c.query<{
      constraint_name: string;
      constraint_type: string;
    }>(
      `SELECT conname AS constraint_name, contype AS constraint_type
         FROM pg_constraint
        WHERE conrelid = 'public.sales'::regclass
        ORDER BY constraint_name`,
    );
    log('SALES CONSTRAINTS', salesConstraints.rows);

    // 7. Foreign keys (for cascade/restrict verification)
    const fks = await c.query<{
      table_name: string;
      constraint_name: string;
      delete_rule: string;
    }>(
      `SELECT conrelid::regclass::text AS table_name,
              conname AS constraint_name,
              CASE confdeltype
                WHEN 'a' THEN 'NO ACTION'
                WHEN 'r' THEN 'RESTRICT'
                WHEN 'c' THEN 'CASCADE'
                WHEN 'n' THEN 'SET NULL'
                WHEN 'd' THEN 'SET DEFAULT'
              END AS delete_rule
         FROM pg_constraint
        WHERE contype = 'f'
        ORDER BY table_name, constraint_name`,
    );
    log('FOREIGN KEYS', fks.rows);

    // 8. __drizzle_migrations — drizzle-kit 0.28 stores this in a
    //    dedicated `drizzle` schema, not `public`.
    const mig = await c.query<{
      id: number;
      hash: string;
      created_at: string;
    }>(
      `SELECT id, hash, created_at FROM drizzle.__drizzle_migrations
        ORDER BY id`,
    );
    log('drizzle.__drizzle_migrations', mig.rows);
  } finally {
    await c.end();
  }
}

main().catch((err) => {
  console.error('verify-migration failed:', err);
  process.exit(1);
});
