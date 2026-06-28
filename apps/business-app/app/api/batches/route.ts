/**
 * GET /api/batches — proxy to GET /batches (list of production batches)
 * POST /api/batches — proxy to POST /batches (create a new batch)
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { cookies } from "next/headers";
import { CreateBatchRequestSchema, type ProductionBatch } from "@printsbytee/shared";
import { apiBaseUrl, getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";

// ── GET /api/batches ────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const path = `/batches${query ? `?${query}` : ""}`;

  // Read cookie
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  if (!sessionValue) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const cookie = `printsbytee_session=${sessionValue}`;
  const result = await getJson<ProductionBatch[]>(path, cookie);

  if (!result.ok) {
    if ("error" in result) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: result.message } },
        { status: 502 }
      );
    }
    return NextResponse.json(result.body, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}

// ── POST /api/batches ────────────────────────────────────────────────────

export async function POST(request: Request) {
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
    parsed = CreateBatchRequestSchema.parse(body);
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
  const apiUrl = `${apiBaseUrl()}/batches`;
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
      { error: { code: "INTERNAL_ERROR", message: "Batch service unavailable" } },
      { status: 502 }
    );
  }

  const responseBody = await apiResponse.json().catch(() => ({}));
  return NextResponse.json(responseBody, { status: apiResponse.status });
}
