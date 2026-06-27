/**
 * Pure formatting and display helpers for the PrintsbyTee catalog.
 *
 * Re-exports all utilities from the `format/` sub-directory so that
 * existing importers (`@/lib/format`) continue to work without changes.
 *
 * This module intentionally does NOT import `data/products.json` —
 * it depends only on types from `@printsbytee/shared`.
 */

// Re-export everything from the split modules
export type { ProductWithStock as Product } from '@printsbytee/shared';
export type { ProductCategory } from '@printsbytee/shared';

export {
  productGradients,
  getProductGradient,
  getProductImage,
} from './format/gradients';

export type { SizeChart, SizeChartEntry } from './format/size-charts';
export { sizeCharts, getSizeChart } from './format/size-charts';

export { formatPrice, getCategoryLabel } from './format/index';