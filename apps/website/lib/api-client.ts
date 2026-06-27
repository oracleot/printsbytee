/**
 * Server-side API client for fetching catalog data from apps/api.
 * Uses internal API key for server-to-server calls.
 *
 * Note: This module should only be imported in Server Components or
 * Route Handlers. Never import this in Client Components directly.
 */

import type { ProductWithStock } from '@printsbytee/shared';

// Lazy getter so the throw only fires when apiFetch is called, not at module eval time.
// This lets Next.js build succeed without the env var while still failing loudly in production
// if API_BASE_URL is unset.
function getApiUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error("API_BASE_URL is not configured. Set it in Vercel environment variables.");
  }
  return url;
}

const API_KEY = process.env.INTERNAL_API_KEY ?? '';

export interface ProductListFilters {
  category?: string;
  inStock?: boolean;
  featured?: boolean;
}

export interface ProductListResponse {
  products: ProductWithStock[];
}

export interface ProductResponse {
  product: ProductWithStock;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${getApiUrl()}${path}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 60 } as any, // Cache for 60 seconds (Next.js extended fetch)
  });

  if (!response.ok) {
    let code: string | undefined;
    let message = `API request failed with status ${response.status}`;

    try {
      const errorBody = await response.json();
      if (errorBody.error) {
        code = errorBody.error.code;
        message = errorBody.error.message ?? message;
      }
    } catch {
      // Response body wasn't JSON, use default message
    }

    throw new ApiError(message, response.status, code);
  }

  return response.json() as Promise<T>;
}

/**
 * Fetch all products with optional filters.
 * Server-side only — uses internal API key.
 */
export async function getProducts(filters?: ProductListFilters): Promise<ProductWithStock[]> {
  const params = new URLSearchParams();

  if (filters?.category) {
    params.set('category', filters.category);
  }
  if (filters?.inStock !== undefined) {
    params.set('inStock', String(filters.inStock));
  }
  if (filters?.featured !== undefined) {
    params.set('featured', String(filters.featured));
  }

  const queryString = params.toString();
  const path = `/products${queryString ? `?${queryString}` : ''}`;

  const data = await apiFetch<ProductWithStock[]>(path);
  return data;
}

/**
 * Fetch featured products for home page.
 */
export async function getFeaturedProducts(): Promise<ProductWithStock[]> {
  return getProducts({ featured: true });
}

/**
 * Fetch a single product by slug.
 * Returns null if product not found.
 */
export async function getProductBySlug(slug: string): Promise<ProductWithStock | null> {
  try {
    const data = await apiFetch<ProductWithStock>(`/products/${slug}`);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch products by category.
 */
export async function getProductsByCategory(category: string): Promise<ProductWithStock[]> {
  return getProducts({ category });
}