/**
 * Pure formatting and display helpers for the PrintsbyTee catalog.
 *
 * These functions are client-safe (no side effects, no server-only APIs)
 * and are used throughout the UI layer for rendering product data.
 *
 * This module intentionally does NOT import `data/products.json` —
 * it depends only on types from `@printsbytee/shared`.
 */

// Re-export the canonical Product type from shared package
export type { ProductWithStock as Product } from '@printsbytee/shared';

// Re-export ProductCategory so components can reference it without importing from shared directly
export type { ProductCategory } from '@printsbytee/shared';

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

/**
 * Get CSS gradient for a product by its image key.
 * Falls back to a gold-emerald gradient if key not found.
 */
export function getProductGradient(imageKey: string): string {
  return productGradients[imageKey] ?? 'linear-gradient(135deg, #C9A84C 0%, #1B4D3E 100%)';
}

/**
 * Get a product image URL or fallback gradient for a given key.
 * Keys that start with "/" are treated as absolute image paths.
 * All other keys resolve to a CSS gradient.
 */
export function getProductImage(key: string): string {
  if (key.startsWith('/')) return key;
  return getProductGradient(key);
}