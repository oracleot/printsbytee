/**
 * GET /api/batches/[id] — proxy to GET /batches/:id (single batch with totals)
 * PATCH /api/batches/[id] — proxy to PATCH /batches/:id (update, requires session)
 * DELETE /api/batches/[id] — proxy to DELETE /batches/:id (delete, requires session)
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { cookies } from "next/headers";
import { UpdateBatchRequestSchema, type ProductionBatchWithTotals } from "@printsbytee/shared";
import { apiBaseUrl, getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import { parseUuid } from "@/lib/uuid";

// ── GET /api/batches/[id] ─────────────────────────────────────────────

export async function GET(
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

  const cookie = `printsbytee_session=${sessionValue}`;
  const result = await getJson<ProductionBatchWithTotals>(`/batches/${id}`, cookie);

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

// ── PATCH /api/batches/[id] ────────────────────────────────────────────

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
    parsed = UpdateBatchRequestSchema.parse(body);
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
  const apiUrl = `${apiBaseUrl()}/batches/${id}`;
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
      { error: { code: "INTERNAL_ERROR", message: "Batch service unavailable" } },
      { status: 502 }
    );
  }

  const responseBody = await apiResponse.json().catch(() => ({}));
  return NextResponse.json(responseBody, { status: apiResponse.status });
}

// ── DELETE /api/batches/[id] ────────────────────────────────────────────

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
  const apiUrl = `${apiBaseUrl()}/batches/${id}`;
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
      { error: { code: "INTERNAL_ERROR", message: "Batch service unavailable" } },
      { status: 502 }
    );
  }

  // 204 → forward 204
  if (apiResponse.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  // Forward API error
  const responseBody = await apiResponse.json().catch(() => ({}));
  return NextResponse.json(responseBody, { status: apiResponse.status });
}
