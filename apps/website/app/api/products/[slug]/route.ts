/**
 * @deprecated This route is deprecated. Catalog data is now fetched directly
 * from apps/api server-side. Use the API client functions in @/lib/api-client
 * instead of making HTTP requests to this route.
 * 
 * This route will be removed in a future release.
 */

import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const API_URL = process.env.API_BASE_URL;
    const API_KEY = process.env.INTERNAL_API_KEY ?? '';

    const response = await fetch(`${API_URL}/products/${slug}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch product from API" },
        { status: 502 }
      );
    }

    const product = await response.json();
    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error("Failed to load product:", error);
    return NextResponse.json(
      { error: "Failed to load product" },
      { status: 500 }
    );
  }
}