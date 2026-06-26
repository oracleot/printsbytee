/**
 * Data access layer for the website.
 * 
 * This module now fetches catalog data from apps/api server-side.
 * Import the API functions directly for async data fetching.
 * 
 * For synchronous access (legacy compatibility), use the re-exports
 * from @/lib/products which adapt the JSON data.
 * 
 * @deprecated Use getProducts(), getProductBySlug(), getFeaturedProducts()
 * from @/lib/api-client instead for server-side data fetching.
 */

export {
  // Re-export types from products (now aligned with API types)
  type Product,
  type ProductCategory,
  type LegacyProduct,
  adaptLegacyProduct,
  // Re-export legacy synchronous helpers (use API functions instead where possible)
  products,
  getProductBySlug,
  getProductsByCategory,
  getFeaturedProducts,
} from './products';

// Re-export helper utilities
export {
  formatPrice,
  getCategoryLabel,
  getProductGradient,
  getProductImage,
  getSizeChart,
  productGradients,
  sizeCharts,
  type SizeChart,
  type SizeChartEntry,
} from './products';

// Types
export type { ProductWithStock } from '@printsbytee/shared';