/**
 * GET /api/auth/me
 *
 * Proxy to the PrintsbyTee API's GET /auth/me, forwarding the session
 * cookie from the browser. Returns the authenticated user object or
 * a 401 error envelope. Passthrough — no body transformation.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getJson } from "@/lib/api-server";
import { readSessionCookie } from "@/lib/auth-cookie";
import type { AuthMeResponse } from "@printsbytee/shared";

export async function GET() {
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);

  if (!sessionValue) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const result = await getJson<AuthMeResponse>(
    "/auth/me",
    `printsbytee_session=${sessionValue}`
  );

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