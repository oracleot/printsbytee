#!/usr/bin/env node
/**
 * One-shot migration: upload the website's product images from
 * `apps/website/public/` to Cloudflare R2, then emit a JSON map so the
 * Postgres import (issue I14) can reference the new object URLs.
 *
 * Idempotency:
 *   - Each file is uploaded under key `products/<basename>`.
 *   - Before uploading, we HEAD the key. If the existing object has the
 *     same `ContentLength` as the local file we skip and record
 *     `{ skipped: true }`. Reruns are cheap and safe.
 *
 * Rerunnability:
 *   - The script can be re-invoked any time. New files are uploaded,
 *     unchanged files are skipped, and `.image-map.json` is rewritten
 *     from scratch on every run.
 *
 * Usage:
 *   pnpm --filter @printsbytee/api upload:website-images
 *   pnpm --filter @printsbytee/api upload:website-images -- --dry-run
 *
 * Required env (unless --dry-run):
 *   R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_PUBLIC_BASE_URL
 */
import { createReadStream } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { r2Env, requireR2Env } from './lib/env.js';
import { walkImages } from './lib/walk-images.js';
import {
  createR2Client,
  headObject,
  uploadObject,
} from './lib/r2-client.js';
import {
  buildKey,
  buildPublicUrl,
  contentTypeFor,
  writeImageMap,
  IMAGE_MAP_FILENAME,
  type ImageMap,
  type ImageMapEntry,
} from './lib/image-map.js';
import { parseArgs, printHelp } from './lib/cli.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp(IMAGE_MAP_FILENAME);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[i13] Source directory: ${args.sourceDir}`);
  // eslint-disable-next-line no-console
  console.log(`[i13] Mode: ${args.dryRun ? 'dry-run' : 'live'}`);

  const images = await walkImages(args.sourceDir);
  // eslint-disable-next-line no-console
  console.log(`[i13] Discovered ${images.length} image file(s).`);
  if (images.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('[i13] No images found — exiting early.');
    return;
  }

  // Dry-run lets us preview without credentials; we still read whatever
  // env vars happen to be set so the emitted map's bucket / publicBaseUrl
  // fields reflect reality when possible.
  const config = args.dryRun ? null : requireR2Env();
  const publicBaseUrl = config?.R2_PUBLIC_BASE_URL ?? r2Env.R2_PUBLIC_BASE_URL ?? '';
  const bucket = config?.R2_BUCKET ?? r2Env.R2_BUCKET ?? '';
  const client = config
    ? createR2Client({
        accountId: config.R2_ACCOUNT_ID,
        bucket: config.R2_BUCKET,
        accessKeyId: config.R2_ACCESS_KEY_ID,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY,
        publicBaseUrl: config.R2_PUBLIC_BASE_URL,
      })
    : null;

  const items: Record<string, ImageMapEntry> = {};
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const image of images) {
    const contentType = contentTypeFor(image.basename);
    if (!contentType) {
      // eslint-disable-next-line no-console
      console.warn(`[i13] Skipping ${image.basename}: unknown content type.`);
      continue;
    }
    const key = buildKey(image.basename);
    const url = publicBaseUrl ? buildPublicUrl(publicBaseUrl, key) : '';

    if (args.dryRun) {
      items[image.basename] = {
        key, url, contentType, size: image.size, etag: null, skipped: true,
      };
      // eslint-disable-next-line no-console
      console.log(`[i13] [dry-run] ${image.basename} -> ${key} (${image.size} B)`);
      skipped++;
      continue;
    }

    try {
      const existing = await headObject(client!, bucket, key);
      if (existing && existing.ContentLength === image.size) {
        items[image.basename] = {
          key, url, contentType, size: image.size,
          etag: existing.ETag ?? null, skipped: true,
        };
        // eslint-disable-next-line no-console
        console.log(`[i13] skip ${image.basename} (already in R2, same size)`);
        skipped++;
        continue;
      }

      const body = createReadStream(image.absolutePath);
      const result = await uploadObject(client!, bucket, key, contentType, body);
      items[image.basename] = {
        key, url, contentType, size: image.size,
        etag: result.etag ?? null, skipped: false,
      };
      // eslint-disable-next-line no-console
      console.log(`[i13] uploaded ${image.basename} -> ${key}`);
      uploaded++;
    } catch (err) {
      failed++;
      // eslint-disable-next-line no-console
      console.error(
        `[i13] failed to upload ${image.basename}: ${(err as Error).message}`,
      );
    }
  }

  const map: ImageMap = {
    generatedAt: new Date().toISOString(),
    bucket,
    publicBaseUrl,
    keyPrefix: 'products',
    items,
  };

  const outPath = await writeImageMap(__dirname, map);
  // eslint-disable-next-line no-console
  console.log(`[i13] Wrote image map: ${outPath}`);
  // Also pretty-print to stdout for piping (e.g. `... | jq .items`).
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(map, null, 2));

  // eslint-disable-next-line no-console
  console.log(
    `[i13] Summary: ${images.length} discovered, ${uploaded} uploaded, ` +
      `${skipped} skipped, ${failed} failed`,
  );

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`[i13] Fatal: ${(err as Error).message}`);
  process.exit(1);
});