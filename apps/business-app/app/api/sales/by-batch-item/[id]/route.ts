/**
 * GET /api/sales/by-batch-item/[id] — proxy to GET /sales/by-batch-item/:id (get sale by item, requires session)
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiBaseUrl } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import { parseUuid } from "@/lib/uuid";

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

  // Server-side fetch
  const apiUrl = `${apiBaseUrl()}/sales/by-batch-item/${id}`;
  let apiResponse: Response;
  try {
    apiResponse = await fetch(apiUrl, {
      method: "GET",
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

  const responseBody = await apiResponse.json().catch(() => ({}));
  return NextResponse.json(responseBody, { status: apiResponse.status });
}