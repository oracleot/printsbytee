import type { ProductWithStock, ProductCategory as ApiProductCategory } from '@printsbytee/shared';

export type ProductCategory = ApiProductCategory;

// Re-export ProductWithStock as the primary Product type
export type Product = ProductWithStock;

// Legacy JSON product shape for backwards compatibility during migration
export interface LegacyProduct {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number | null;
  sizes: string[];
  images: string[];
  inStock: boolean;
  notifyMeEnabled: boolean;
  featured: boolean;
  createdAt: string;
  stockLabel?: 'low-stock' | null;
}

/**
 * Adapt a legacy JSON product to the new API product shape.
 * Converts price from pounds to pence.
 */
export function adaptLegacyProduct(legacy: LegacyProduct): Product {
  return {
    id: legacy.id,
    slug: legacy.slug,
    name: legacy.name,
    category: legacy.category,
    description: legacy.description,
    price: legacy.price !== null ? legacy.price * 100 : 0, // Convert pounds to pence
    sizes: legacy.sizes,
    images: legacy.images,
    notifyMeEnabled: legacy.notifyMeEnabled,
    featured: legacy.featured,
    createdAt: legacy.createdAt,
    updatedAt: legacy.createdAt, // Legacy products don't have updatedAt
    inStock: legacy.inStock,
    stockCount: legacy.inStock ? 1 : 0, // Approximate
    stockLabel: legacy.stockLabel ?? null,
  };
}

// Keep legacy products array export for backwards compatibility
// This will be empty after full migration
import productsData from "@/data/products.json";

// Re-export products adapted for API format (legacy support)
export const products: Product[] = (productsData as LegacyProduct[]).map(adaptLegacyProduct);

export function getProductBySlug(slug: string): Product | undefined {
  return products.find(p => p.slug === slug);
}

export function getProductsByCategory(category: Product['category']): Product[] {
  return products.filter(p => p.category === category);
}

export function getFeaturedProducts(): Product[] {
  return products.filter(p => p.featured);
}

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  productInterest?: string;
  message: string;
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  productId: string;
  email: string;
  createdAt: string;
}

// CSS gradient placeholders for products
export const productGradients: Record<string, string> = {
  'gradient-emerald-gold': 'linear-gradient(135deg, #1B4D3E 0%, #C9A84C 50%, #0D0D0D 100%)',
  'gradient-terracotta-cream': 'linear-gradient(135deg, #C75B39 0%, #F5F0E8 50%, #C9A84C 100%)',
  'gradient-noir-gold': 'linear-gradient(135deg, #0D0D0D 0%, #C9A84C 50%, #1B4D3E 100%)',
  'gradient-golden-safari': 'linear-gradient(135deg, #C9A84C 0%, #C75B39 50%, #F5F0E8 100%)',
  'gradient-rose-gold': 'linear-gradient(135deg, #F5F0E8 0%, #C9A84C 50%, #C75B39 100%)',
  'gradient-ivory-classic': 'linear-gradient(135deg, #FAFAF8 0%, #F5F0E8 50%, #E8E3DB 100%)',
  'gradient-sage-serene': 'linear-gradient(135deg, #1B4D3E 0%, #F5F0E8 50%, #C9A84C 100%)',
  'gradient-sunny-days': 'linear-gradient(135deg, #C9A84C 0%, #F5F0E8 50%, #C75B39 100%)',
  'gradient-ocean-deep': 'linear-gradient(135deg, #1B4D3E 0%, #0D0D0D 50%, #C9A84C 100%)',
  'gradient-warm-sand': 'linear-gradient(135deg, #F5F0E8 0%, #C75B39 50%, #E8E3DB 100%)',
  'gradient-coral-reef': 'linear-gradient(135deg, #C75B39 0%, #1B4D3E 50%, #C9A84C 100%)',
  'gradient-forest-whisper': 'linear-gradient(135deg, #1B4D3E 0%, #0D0D0D 50%, #F5F0E8 100%)',
  'gradient-lavender-mist': 'linear-gradient(135deg, #E8E3DB 0%, #C9A84C 50%, #1B4D3E 100%)',
  'gradient-rust-vintage': 'linear-gradient(135deg, #C75B39 0%, #C9A84C 50%, #0D0D0D 100%)',
  'gradient-mosaic-magic': 'linear-gradient(135deg, #0D0D0D 0%, #C9A84C 50%, #C75B39 100%)',
  'gradient-golden-hour': 'linear-gradient(135deg, #C9A84C 0%, #C75B39 50%, #1B4D3E 100%)',
  'gradient-navy-regal': 'linear-gradient(135deg, #1B4D3E 0%, #0D0D0D 50%, #C9A84C 100%)',
  'gradient-emerald-jungle': 'linear-gradient(135deg, #1B4D3E 0%, #C9A84C 50%, #F5F0E8 100%)',
  'gradient-blush-glow': 'linear-gradient(135deg, #F5F0E8 0%, #C9A84C 50%, #E8E3DB 100%)',
  'gradient-red-placeholder': 'linear-gradient(135deg, #C75B39 0%, #0D0D0D 50%, #C75B39 100%)',
  'gradient-midnight-jewel': 'linear-gradient(135deg, #0D0D0D 0%, #1B4D3E 50%, #C9A84C 100%)',
};

export function getProductGradient(imageKey: string): string {
  return productGradients[imageKey] || 'linear-gradient(135deg, #C9A84C 0%, #1B4D3E 100%)';
}

export function getProductImage(key: string): string {
  if (key.startsWith("/")) return key;
  return getProductGradient(key);
}

/**
 * Format price from pence to pounds string.
 * @param pricePence - Price in pence (e.g., 4000 for £40)
 */
export function formatPrice(pricePence: number | null): string {
  if (pricePence === null || pricePence === undefined) return '';
  return `£${(pricePence / 100).toFixed(0)}`;
}

export function getCategoryLabel(category: Product['category']): string {
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
  return labels[category];
}

export interface SizeChartEntry {
  size: string;
  uk: string;
}

export interface SizeChart {
  category: ProductCategory;
  description: string;
  notes: string;
  measurements: SizeChartEntry[];
}

export const sizeCharts: Record<ProductCategory, SizeChart> = {
  'lora-set': {
    category: 'lora-set',
    description: 'Two-piece crop top and skirt set — African wax print with minimal stretch',
    notes: 'Recommend sizing up if between sizes. Top is cropped — check length measurement.',
    measurements: [
      { size: 'S',   uk: '8-10' },
      { size: 'M',   uk: '10-12' },
      { size: 'L',   uk: '12-14' },
      { size: 'XL',  uk: '14-16' },
      { size: 'XXL', uk: '18-20' },
    ],
  },
  'aso-oke-kimono': {
    category: 'aso-oke-kimono',
    description: 'Flowing kimono-style cover-up — Aso Oke is stiff and structured',
    notes: 'Designed to drape loosely. Check shoulder width and total length for your height.',
    measurements: [
      { size: 'S',   uk: '8-10' },
      { size: 'M',   uk: '10-12' },
      { size: 'L',   uk: '12-14' },
      { size: 'XL',  uk: '14-16' },
      { size: 'XXL', uk: '18-20' },
    ],
  },
  'fringe-bubu': {
    category: 'fringe-bubu',
    description: 'Loose-fitting traditional bubu with fringe detailing',
    notes: 'Relaxed, oversized fit — size down for a more fitted look. Fringe adds ~2" to hem.',
    measurements: [
      { size: 'S',   uk: '8-10' },
      { size: 'M',   uk: '10-12' },
      { size: 'L',   uk: '12-14' },
      { size: 'XL',  uk: '14-16' },
      { size: 'XXL', uk: '18-20' },
    ],
  },
  'naya-jump-suit': {
    category: 'naya-jump-suit',
    description: 'Tailored jumpsuit with belt included — body-flattering silhouette',
    notes: 'Material has slight stretch. Check hip and inseam measurements before ordering.',
    measurements: [
      { size: 'S',   uk: '8-10' },
      { size: 'M',   uk: '10-12' },
      { size: 'L',   uk: '12-14' },
      { size: 'XL',  uk: '14-16' },
      { size: 'XXL', uk: '18-20' },
    ],
  },
  'lumi-set': {
    category: 'lumi-set',
    description: 'Two-piece Lumi Set — vibrant African print with a modern silhouette',
    notes: 'Recommend sizing up if between sizes.',
    measurements: [
      { size: 'S',   uk: '8-10' },
      { size: 'M',   uk: '10-12' },
      { size: 'L',   uk: '12-14' },
      { size: 'XL',  uk: '14-16' },
      { size: 'XXL', uk: '18-20' },
    ],
  },
  'jasmine-set': {
    category: 'jasmine-set',
    description: 'The Jasmine Set — elegant two-piece with flowing fabric and minimal stretch',
    notes: 'True to size. Check bust and waist measurements before ordering.',
    measurements: [
      { size: 'S',   uk: '8-10' },
      { size: 'M',   uk: '10-12' },
      { size: 'L',   uk: '12-14' },
      { size: 'XL',  uk: '14-16' },
      { size: 'XXL', uk: '18-20' },
    ],
  },
  'seline-dress': {
    category: 'seline-dress',
    description: 'The Seline Dress — a flowing dress with a flattering silhouette',
    notes: 'True to size. Check bust and length measurements before ordering.',
    measurements: [
      { size: 'S',   uk: '8-10' },
      { size: 'M',   uk: '10-12' },
      { size: 'L',   uk: '12-14' },
      { size: 'XL',  uk: '14-16' },
      { size: 'XXL', uk: '18-20' },
    ],
  },
  'aso-oke-pant': {
    category: 'aso-oke-pant',
    description: 'Aso Oke Pant — structured wide-leg pant in handwoven Aso Oke fabric',
    notes: 'Designed for a relaxed, structured fit. Check hip and inseam before ordering.',
    measurements: [
      { size: 'S',   uk: '8-10' },
      { size: 'M',   uk: '10-12' },
      { size: 'L',   uk: '12-14' },
      { size: 'XL',  uk: '14-16' },
      { size: 'XXL', uk: '18-20' },
    ],
  },
  'kora-bubu': {
    category: 'kora-bubu',
    description: 'The Kora Bubu — a stunning loose-fitting bubu with intricate kora-inspired detailing',
    notes: 'Relaxed, flowy fit — true to size or size down for a more tailored look.',
    measurements: [
      { size: 'S',   uk: '8-10' },
      { size: 'M',   uk: '10-12' },
      { size: 'L',   uk: '12-14' },
      { size: 'XL',  uk: '14-16' },
      { size: 'XXL', uk: '18-20' },
    ],
  },
  'mina-set': {
    category: 'mina-set',
    description: 'The Mina Set — a versatile two-piece set that can be styled your way',
    notes: 'Available as full set or pant only. Recommend sizing up if between sizes.',
    measurements: [
      { size: 'S',   uk: '8-10' },
      { size: 'M',   uk: '10-12' },
      { size: 'L',   uk: '12-14' },
      { size: 'XL',  uk: '14-16' },
      { size: 'XXL', uk: '18-20' },
    ],
  },
};

export function getSizeChart(category: ProductCategory): SizeChart | undefined {
  return sizeCharts[category];
}