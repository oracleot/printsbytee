/**
 * POST /api/batch-items/[id]/sale — proxy to POST /batch-items/:id/sale (record sale, requires session)
 *
 * Body: { salePrice?, soldAt?, customerName?, customerContact? }
 * Defaults: salePrice = item.plannedSalePrice, soldAt = now()
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { cookies } from "next/headers";
import { RecordSaleRequestSchema } from "@printsbytee/shared";
import { apiBaseUrl } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import { parseUuid } from "@/lib/uuid";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID
  const uuid = parseUuid(id);
  if (!uuid.ok) return uuid.response;

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON" } },
      { status: 400 }
    );
  }

  // Validate
  let parsed: unknown;
  try {
    parsed = RecordSaleRequestSchema.parse(body);
  } catch (err) {
    const issues =
      err instanceof ZodError
        ? err.issues.map((p) => p.message)
        : ["Invalid request body"];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: issues.join("; ") } },
      { status: 400 }
    );
  }

  // Read cookie
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  if (!sessionValue) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  // Server-side fetch
  const apiUrl = `${apiBaseUrl()}/batch-items/${id}/sale`;
  let apiResponse: Response;
  try {
    apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `printsbytee_session=${sessionValue}`,
      },
      body: JSON.stringify(parsed),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Catalog service unavailable" } },
      { status: 502 }
    );
  }

  const responseBody = await apiResponse.json().catch(() => ({}));
  return NextResponse.json(responseBody, { status: apiResponse.status });
}