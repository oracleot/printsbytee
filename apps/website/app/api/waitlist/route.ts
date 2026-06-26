import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  productId: z.string().min(1, "Product ID is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const result = waitlistSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, productId } = result.data;
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    // TODO: replace with an external waitlist service (e.g. Mailchimp, ConvertKit)
    // File-system persistence is unreliable in serverless environments.
    console.log(`[Waitlist] New entry id=${id} email=${email} productId=${productId} createdAt=${createdAt}`);

    return NextResponse.json({ success: true, id, createdAt }, { status: 200 });
  } catch (error) {
    console.error("[Waitlist] Submission error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
