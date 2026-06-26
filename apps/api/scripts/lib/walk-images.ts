import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * File extensions considered "product images" for the migration.
 * Anything else (SVG, ICO, fonts, source files) is ignored.
 *
 * Add new types here only when the catalog genuinely gains a new
 * raster format — SVG branding lives in Vercel, not R2.
 */
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export interface DiscoveredImage {
  /** Absolute path on disk. */
  absolutePath: string;
  /** Filename only (e.g. `lora-set-turquoise.jpg`). This is the join key
   *  with `apps/website/data/products.json` whose `images` entries are
   *  `"/<basename>"`. */
  basename: string;
  /** Size in bytes (from fs.stat). */
  size: number;
}

/**
 * Walk a directory (non-recursive) and return image files, sorted by
 * basename for deterministic reruns.
 *
 * Non-recursive on purpose: `apps/website/public/` is flat. If we ever
 * introduce subdirectories we want to be explicit about it rather than
 * silently picking up assets we didn't intend to upload.
 */
export async function walkImages(sourceDir: string): Promise<DiscoveredImage[]> {
  const resolved = path.resolve(sourceDir);
  const entries = await fs.readdir(resolved, { withFileTypes: true });
  const images: DiscoveredImage[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;
    const absolutePath = path.join(resolved, entry.name);
    const stat = await fs.stat(absolutePath);
    images.push({ absolutePath, basename: entry.name, size: stat.size });
  }

  images.sort((a, b) => a.basename.localeCompare(b.basename));
  return images;
}