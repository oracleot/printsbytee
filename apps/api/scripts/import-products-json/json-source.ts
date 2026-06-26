import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { REPO_ROOT } from '../lib/cli.js';
import { productCategoryEnum } from '../../src/db/schema.js';
import type { ImageMap } from './r2-list.js';

const PRODUCTS_JSON_PATH = path.join(
  REPO_ROOT,
  'apps',
  'website',
  'data',
  'products.json',
);

export type Category = (typeof productCategoryEnum.enumValues)[number];
const VALID_CATEGORIES: ReadonlySet<Category> = new Set(
  productCategoryEnum.enumValues,
);

export interface SourceProduct {
  slug?: unknown;
  name?: unknown;
  category?: unknown;
  description?: unknown;
  price?: unknown;
  sizes?: unknown;
  images?: unknown;
  notifyMeEnabled?: unknown;
  featured?: unknown;
}

export interface PreparedProduct {
  slug: string;
  name: string;
  category: Category;
  description: string;
  price: number; // integer pence
  sizes: string[];
  images: string[];
  notifyMeEnabled: boolean;
  featured: boolean;
}

export type PrepareResult =
  | { ok: true; product: PreparedProduct }
  | { ok: false; reason: string };

/** Source prices are pounds (`40` or `40.00`); DB stores integer pence. */
export function toPence(pounds: number): number {
  return Math.round(pounds * 100);
}

export function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === 'string');
}

export async function readSourceCatalog(): Promise<unknown> {
  console.log(`[i14] Reading source catalog: ${PRODUCTS_JSON_PATH}`);
  const rawText = await fs.readFile(PRODUCTS_JSON_PATH, 'utf8');
  const parsed = JSON.parse(rawText) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('products.json root must be an array');
  }
  console.log(`[i14] Parsed ${parsed.length} product(s) from JSON.`);
  return parsed;
}

/**
 * Validate and normalise one row from `products.json`. Image entries
 * are rewritten from on-disk paths (`/<basename>`) to absolute R2
 * URLs via the supplied map. Basenames absent from R2 are dropped
 * with a warning so the DB never sees a broken URL.
 */
export function prepareProduct(
  raw: SourceProduct,
  imageMap: ImageMap,
): PrepareResult {
  if (typeof raw.slug !== 'string' || raw.slug.length === 0) {
    return { ok: false, reason: 'missing slug' };
  }
  if (typeof raw.name !== 'string' || raw.name.length === 0) {
    return { ok: false, reason: 'missing name' };
  }
  if (
    typeof raw.category !== 'string' ||
    !VALID_CATEGORIES.has(raw.category as Category)
  ) {
    return { ok: false, reason: `invalid category ${JSON.stringify(raw.category)}` };
  }
  if (typeof raw.price !== 'number' || !Number.isFinite(raw.price)) {
    return { ok: false, reason: `invalid price ${String(raw.price)}` };
  }
  if (raw.description !== undefined && typeof raw.description !== 'string') {
    return { ok: false, reason: 'description must be a string' };
  }

  const images: string[] = [];
  for (const entry of isStringArray(raw.images) ? raw.images : []) {
    const basename = entry.replace(/^\/+/, '');
    const url = imageMap.get(basename);
    if (!url) {
      console.warn(`[i14] ${raw.slug}: dropping image "${entry}" (not in R2 listing)`);
      continue;
    }
    images.push(url);
  }

  return {
    ok: true,
    product: {
      slug: raw.slug,
      name: raw.name,
      category: raw.category as Category,
      description: typeof raw.description === 'string' ? raw.description : '',
      price: toPence(raw.price),
      sizes: isStringArray(raw.sizes) ? raw.sizes : [],
      images,
      notifyMeEnabled: raw.notifyMeEnabled === true,
      featured: raw.featured === true,
    },
  };
}