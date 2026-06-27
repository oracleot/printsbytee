/**
 * PATCH /api/products/[id] — proxy to PATCH /products/:id (update, requires session)
 * DELETE /api/products/[id] — proxy to DELETE /products/:id (delete, requires session)
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { cookies } from "next/headers";
import { UpdateProductRequestSchema } from "@printsbytee/shared";
import { apiBaseUrl } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import { parseUuid } from "@/lib/uuid";

// ── PATCH /api/products/[id] ─────────────────────────────────────────────

export async function PATCH(
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
    parsed = UpdateProductRequestSchema.parse(body);
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
  const apiUrl = `${apiBaseUrl()}/products/${id}`;
  let apiResponse: Response;
  try {
    apiResponse = await fetch(apiUrl, {
      method: "PATCH",
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

// ── DELETE /api/products/[id] ────────────────────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID
  const uuid = parseUuid(id);
  if (!uuid.ok) return uuid.response;

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
  const apiUrl = `${apiBaseUrl()}/products/${id}`;
  let apiResponse: Response;
  try {
    apiResponse = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        Cookie: `printsbytee_session=${sessionValue}`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Catalog service unavailable" } },
      { status: 502 }
    );
  }

  // 204 → forward 204
  if (apiResponse.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  // Forward API error (409 guardrail message included)
  const responseBody = await apiResponse.json().catch(() => ({}));
  return NextResponse.json(responseBody, { status: apiResponse.status });
}