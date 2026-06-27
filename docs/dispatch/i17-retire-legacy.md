# I17 — Retire Legacy Catalog Files

## Status: Complete

## What changed

All pure display helpers and the `Product` type re-export were moved from
`lib/products.ts` into a new `lib/format.ts`. The JSON file (`data/products.json`)
is no longer bundled — nothing imports it.

### Files deleted

- `apps/website/lib/products.ts` — contained the `import productsData from "@/data/products.json"` runtime dependency
- `apps/website/lib/data.ts` — dead re-export file, zero importers
- `apps/website/data/products.json` — JSON catalog data, now unused

### Files added

- `apps/website/lib/format.ts` — new home for all helpers. Exports:
  - `Product` (re-export of `ProductWithStock` from `@printsbytee/shared`)
  - `ProductCategory` type (re-export from shared)
  - `formatPrice(pricePence)` → `£`-string
  - `getCategoryLabel(category)` → human-readable label
  - `getProductImage(key)` → image URL or gradient fallback
  - `getProductGradient(imageKey)` → CSS gradient string
  - `productGradients` map
  - `getSizeChart(category)` → `SizeChart | undefined`
  - `sizeCharts` record

### Files updated (import paths only)

| File | Changed import |
|------|----------------|
| `components/sticky/StickyAddToCart.tsx` | `@/lib/products` → `@/lib/format` |
| `components/home/BentoGrid.tsx` | same |
| `components/products/ProductGallery.tsx` | same |
| `components/products/ProductInfo.tsx` | same |
| `components/products/ProductCTA.tsx` | same |
| `components/products/ProductAccordion.tsx` | same |
| `components/products/ProductCard.tsx` | same |
| `components/home/FeaturedProducts.tsx` | same |
| `components/products/ProductDetailClient.tsx` | same |
| `components/products/ProductGrid.tsx` | same |
| `app/products/[slug]/page.tsx` | same |

## Decisions

- **New module name `lib/format.ts`**: Not added to `lib/api-client.ts` because that module is for async server-side data fetching (`getProducts`, `getProductBySlug`). The helpers are pure/client-safe utilities — a separate module keeps concerns cleanly separated.
- **`LegacyProduct`, `adaptLegacyProduct`, `products` array, `getProductBySlug` (sync), `getProductsByCategory` (sync), `getFeaturedProducts` (sync), `Enquiry`, `WaitlistEntry`**: all dropped — none were imported by any component; pages use the async equivalents from `lib/api-client.ts`.
- **`productGradients` and `sizeCharts`**: kept as exported module-level constants (used by components, no JSON dependency).
- **Type signatures**: `getCategoryLabel` and `getSizeChart` accept `string` instead of `ProductCategory` enum to avoid importing the enum everywhere — components just pass the category string directly.
- **`lib/data.ts`**: confirmed zero importers, deleted without hesitation.
- **`app/api/products/` routes**: left completely untouched per instructions.