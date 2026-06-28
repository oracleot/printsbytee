import { NextResponse } from "next/server";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  productId: z.string().min(1, "Product ID is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input locally first for fast feedback
    const result = waitlistSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, productId } = result.data;

    // Forward to Railway API
    const apiUrl = process.env.API_BASE_URL;
    if (!apiUrl) {
      console.error("[Waitlist] API_BASE_URL not configured");
      return NextResponse.json(
        { success: false, error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    const response = await fetch(`${apiUrl}/waitlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
      },
      body: JSON.stringify({ email, productId }),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(
        { success: true, id: data.id, createdAt: data.createdAt },
        { status: 200 }
      );
    }

    // Parse API error response
    let errorMessage = "Failed to join waitlist. Please try again.";
    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // Use default message
    }

    // Handle 409 Conflict (already on waitlist) specifically
    if (response.status === 409) {
      return NextResponse.json(
        { success: false, error: "You're already on the waitlist for this product" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: response.status }
    );
  } catch (error) {
    console.error("[Waitlist] Proxy error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}