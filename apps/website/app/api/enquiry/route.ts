import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { sendEnquiryEmail } from "@/lib/mail";

const enquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  productInterest: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const result = enquirySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, productInterest, message } = result.data;
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    console.log(`[Enquiry] New submission id=${id} name=${name} email=${email} productInterest=${productInterest ?? 'none'}`);

    // Send email notification
    try {
      await sendEnquiryEmail({ name, email, productInterest, message });
    } catch (emailError) {
      console.error(`[Enquiry] Failed to send enquiry email for id=${id}:`, emailError);
      // Still return success — email failure shouldn't block the response
      // TODO: implement a proper external service (e.g. queue, SendGrid) for production
    }

    return NextResponse.json({ success: true, id, createdAt }, { status: 200 });
  } catch (error) {
    console.error("[Enquiry] Submission error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
