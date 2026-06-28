/**
 * GET /api/batches — proxy to GET /batches (list of production batches)
 *
 * NOTE: This route only proxies GET. The create-batch endpoint lives in
 * the central API (`POST /batches`) and is wired through the I30 form.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ProductionBatch } from "@printsbytee/shared";
import { getJson } from "@/lib/api-server";
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
