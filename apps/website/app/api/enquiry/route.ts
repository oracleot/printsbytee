import { NextResponse } from "next/server";
import { z } from "zod";

const enquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  productInterest: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input locally first for fast feedback
    const result = enquirySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, productInterest, message } = result.data;

    // Forward to Railway API
    const apiUrl = process.env.API_BASE_URL;
    if (!apiUrl) {
      console.error("[Enquiry] API_BASE_URL not configured");
      return NextResponse.json(
        { success: false, error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    // Map website's `productInterest` (free text) to API's `productId` (nullable UUID)
    // The website allows free-text for product interest, but the API expects a UUID.
    // Pass undefined so the API handles it as a general enquiry.
    const response = await fetch(`${apiUrl}/enquiries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
      },
      body: JSON.stringify({ name, email, message }),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(
        { success: true, id: data.id, createdAt: data.createdAt },
        { status: 200 }
      );
    }

    // Parse API error response
    let errorMessage = "Failed to submit enquiry. Please try again.";
    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // Use default message
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: response.status }
    );
  } catch (error) {
    console.error("[Enquiry] Proxy error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}