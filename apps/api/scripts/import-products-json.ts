#!/usr/bin/env node
/**
 * I14 — Import `apps/website/data/products.json` into Postgres.
 *
 * PURPOSE
 *   Migrate the website's current catalogue into the `products` table
 *   (see `apps/api/src/db/schema/products.ts` and `docs/data-model.md`),
 *   rewriting each product's `images[]` entries from on-disk paths
 *   (`/<basename>`) into absolute R2 public URLs.
 *
 * OWNER INVOCATION
 *   The script connects to the live Railway Postgres over the private
 *   `postgres.railway.internal` host, so it MUST be run from inside
 *   the deployed `api` service container. Locally it cannot reach the
 *   database and the env vars (R2_*) would not be present. Use:
 *
 *     railway ssh --service api -- \
 *       pnpm --filter @printsbytee/api import:products
 *
 *   `railway ssh` tunnels into the running container and inherits its
 *   env, so DATABASE_URL plus the five R2_* vars come straight from
 *   the Railway service config with no copying or local export.
 *
 * INPUT HANDLING
 *   This script does NOT consume the local
 *   `apps/api/scripts/.image-map.json` left behind by I13. That file
 *   is the owner's private artifact and stays on their workstation.
 *   Instead, the script lists R2 directly every run via
 *   `ListObjectsV2` under the `products/` prefix so the basename ->
 *   public URL map always reflects the live bucket state.
 *
 * RERUNNABILITY
 *   Every product is upserted by `slug` (the unique key), so re-running
 *   with the same JSON simply refreshes mutable fields. The script
 *   never deletes rows; if the catalogue shrinks, dangling rows stay
 *   (deletion is a separate concern per the I14 plan).
 */
import { pool } from '../src/db/client.js';
import { requireR2Env } from './lib/env.js';
import { createR2Client } from './lib/r2-client.js';
import { buildImageMap } from './import-products-json/r2-list.js';
import {
  prepareProduct,
  readSourceCatalog,
  type SourceProduct,
} from './import-products-json/json-source.js';
import { upsertProduct } from './import-products-json/upsert.js';

async function main(): Promise<void> {
  const r2 = requireR2Env();
  const client = createR2Client({
    accountId: r2.R2_ACCOUNT_ID,
    bucket: r2.R2_BUCKET,
    accessKeyId: r2.R2_ACCESS_KEY_ID,
    secretAccessKey: r2.R2_SECRET_ACCESS_KEY,
    publicBaseUrl: r2.R2_PUBLIC_BASE_URL,
  });

  console.log(`[i14] Listing R2 bucket "${r2.R2_BUCKET}" under products/`);
  const imageMap = await buildImageMap(client, r2.R2_BUCKET, r2.R2_PUBLIC_BASE_URL);
  const source = (await readSourceCatalog()) as SourceProduct[];

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  try {
    for (const raw of source) {
      const result = prepareProduct(raw, imageMap);
      if (!result.ok) {
        const slug = typeof raw.slug === 'string' ? raw.slug : '???';
        console.warn(`[i14] Skipping ${slug}: ${result.reason}`);
        skipped++;
        continue;
      }
      const action = await upsertProduct(result.product);
      if (action === 'inserted') inserted++; else updated++;
      console.log(
        `[i14] ${action} ${result.product.slug} ` +
          `(category=${result.product.category}, images=${result.product.images.length})`,
      );
    }
    console.log(
      `[i14] Summary: ${source.length} parsed, ` +
        `${inserted} inserted, ${updated} updated, ${skipped} skipped.`,
    );
    if (skipped > 0) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch(async (err) => {
  console.error(`[i14] Fatal: ${(err as Error).message}`);
  try { await pool.end(); } catch { /* pool may not have been constructed */ }
  process.exit(1);
});