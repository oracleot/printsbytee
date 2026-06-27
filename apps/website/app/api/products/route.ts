/**
 * @deprecated This route is deprecated. Catalog data is now fetched directly
 * from apps/api server-side. Use the API client functions in @/lib/api-client
 * instead of making HTTP requests to this route.
 * 
 * This route will be removed in a future release.
 */

import { NextResponse } from "next/server";

// Re-export from API client for backwards compatibility during migration
// In production, clients should use @/lib/api-client directly
export async function GET() {
  try {
    const API_URL = process.env.API_BASE_URL;
    const API_KEY = process.env.INTERNAL_API_KEY ?? '';

    const response = await fetch(`${API_URL}/products`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch products from API" },
        { status: 502 }
      );
    }

    const products = await response.json();
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error("Failed to load products:", error);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}