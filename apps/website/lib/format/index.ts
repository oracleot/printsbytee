import type { ProductCategory } from '@printsbytee/shared';

// Re-export types from gradients module (which owns the module-level docblock)
export type { ProductWithStock as Product } from '@printsbytee/shared';
export type { ProductCategory } from '@printsbytee/shared';

// Re-export gradient utilities
export {
  productGradients,
  getProductGradient,
  getProductImage,
} from './gradients';

// Re-export size chart types and utilities
export type { SizeChart, SizeChartEntry } from './size-charts';
export { sizeCharts, getSizeChart } from './size-charts';

/**
 * Format price from pence to a displayable pounds string.
 * @param pricePence - Price in pence (e.g. 4000 for £40)
 */
export function formatPrice(pricePence: number | null): string {
  if (pricePence === null || pricePence === undefined) return '';
  return `£${(pricePence / 100).toFixed(0)}`;
}

export function getCategoryLabel(category: ProductCategory): string {
  const labels: Record<ProductCategory, string> = {
    'lora-set': 'Lora Set',
    'aso-oke-kimono': 'Aso Oke Kimono Set',
    'fringe-bubu': 'Fringe Bubu',
    'naya-jump-suit': 'Naya Jump Suit',
    'lumi-set': 'Lumi Set',
    'jasmine-set': 'Jasmine Set',
    'seline-dress': 'Seline Dress',
    'aso-oke-pant': 'Aso Oke Pant',
    'kora-bubu': 'Kora Bubu',
    'mina-set': 'Mina Set',
  };
  return labels[category] ?? category;
}