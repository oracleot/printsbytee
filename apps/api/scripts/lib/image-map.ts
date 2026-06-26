import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * Object-key layout for product images.
 *
 *   products/<original-filename>
 *
 * Flat (no per-product subdirectory) on purpose:
 *   - The original filename already encodes the product (e.g.
 *     `lora-set-turquoise-back.jpg`).
 *   - It keeps the join with `apps/website/data/products.json` trivial:
 *     I14 strips the leading `/` from each `images[]` entry and looks up
 *     the basename here.
 *   - Object listing and CDN cache purges stay simple.
 *
 * If we ever need grouping (e.g. brand assets vs product assets) we'd
 * bump this to `products/<slug>/<filename>` and migrate in place.
 */
export const KEY_PREFIX = 'products';

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export function contentTypeFor(basename: string): string | null {
  const ext = path.extname(basename).toLowerCase();
  return CONTENT_TYPE_BY_EXT[ext] ?? null;
}

export function buildKey(basename: string): string {
  return `${KEY_PREFIX}/${basename}`;
}

export function buildPublicUrl(publicBaseUrl: string, key: string): string {
  // Trim trailing slashes from the configured base so we never produce
  // `https://images.example.com//products/...`.
  const base = publicBaseUrl.replace(/\/+$/, '');
  return `${base}/${key}`;
}

export interface ImageMapEntry {
  key: string;
  url: string;
  contentType: string;
  size: number;
  etag: string | null;
  /** True if the object was already present in R2 with the same size —
   *  we did not re-upload. */
  skipped: boolean;
}

export interface ImageMap {
  generatedAt: string;
  bucket: string;
  publicBaseUrl: string;
  keyPrefix: string;
  items: Record<string, ImageMapEntry>;
}

/** Filename written next to the migration script. Gitignored. */
export const IMAGE_MAP_FILENAME = '.image-map.json';

export async function writeImageMap(
  scriptDir: string,
  map: ImageMap,
): Promise<string> {
  const outPath = path.join(scriptDir, IMAGE_MAP_FILENAME);
  await fs.writeFile(outPath, JSON.stringify(map, null, 2), 'utf8');
  return outPath;
}