import { sql } from 'drizzle-orm';
import { db } from '../../src/db/client.js';
import { products } from '../../src/db/schema.js';
import type { PreparedProduct } from './json-source.js';

/**
 * Upsert a product by `slug` (unique). On insert the DB defaults fill
 * in `id`, `createdAt`, and `updatedAt`; on conflict we refresh every
 * mutable field and bump `updatedAt` explicitly (the DB does not have
 * an auto-update trigger for `updated_at`).
 *
 * Returns `'inserted'` when no row matched the slug, otherwise
 * `'updated'`. The caller uses this to print a per-row summary.
 */
export async function upsertProduct(
  p: PreparedProduct,
): Promise<'inserted' | 'updated'> {
  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(sql`${products.slug} = ${p.slug}`)
    .limit(1);

  await db
    .insert(products)
    .values({
      slug: p.slug,
      name: p.name,
      category: p.category,
      description: p.description,
      price: p.price,
      sizes: p.sizes,
      images: p.images,
      notifyMeEnabled: p.notifyMeEnabled,
      featured: p.featured,
    })
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        name: sql`excluded.name`,
        category: sql`excluded.category`,
        description: sql`excluded.description`,
        price: sql`excluded.price`,
        sizes: sql`excluded.sizes`,
        images: sql`excluded.images`,
        notifyMeEnabled: sql`excluded.notify_me_enabled`,
        featured: sql`excluded.featured`,
        updatedAt: sql`now()`,
      },
    });

  return existing.length === 0 ? 'inserted' : 'updated';
}