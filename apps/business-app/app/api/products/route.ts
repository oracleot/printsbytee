/**
 * GET /api/products — proxy to GET /products (public list)
 * POST /api/products — proxy to POST /products (create, requires session)
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { cookies } from "next/headers";
import {
  CreateProductRequestSchema,
  type Product,
} from "@printsbytee/shared";
import { apiBaseUrl, getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";

// ── GET /api/products ────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const path = `/products${query ? `?${query}` : ""}`;

  const result = await getJson<Product[]>(path);

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

// ── POST /api/products ───────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON" } },
      { status: 400 }
    );
  }

  // 2. Validate
  let parsed: unknown;
  try {
    parsed = CreateProductRequestSchema.parse(body);
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

  // 3. Read cookie
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);
  if (!sessionValue) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  // 4. Server-side fetch to API
  const apiUrl = `${apiBaseUrl()}/products`;
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

  // 5. Forward response verbatim
  const responseBody = await apiResponse.json().catch(() => ({}));
  return NextResponse.json(responseBody, { status: apiResponse.status });
}