/**
 * POST /api/auth/logout
 *
 * Proxy to the PrintsbyTee API's POST /auth/logout. The API clears the
 * session cookie server-side; we forward the clearing Set-Cookie to the
 * browser so the cookie is removed from the business-app origin too.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiBaseUrl } from "@/lib/api-server";
import { readSessionCookie, clearSessionCookie } from "@/lib/auth-cookie";

export async function POST() {
  const cookieStore = await cookies();
  const sessionValue = readSessionCookie(cookieStore);

  if (!sessionValue) {
    // No cookie → treat as already logged out
    return new NextResponse(null, { status: 204 });
  }

  // Forward the cookie to the API so it can invalidate the session
  const apiUrl = `${apiBaseUrl()}/auth/logout`;
  let apiResponse: Response;
  try {
    apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { Cookie: `printsbytee_session=${sessionValue}` },
    });
  } catch {
    // Network error — still return 204 so the client clears their cookie
    const nextResponse = new NextResponse(null, { status: 204 });
    nextResponse.headers.set("Set-Cookie", clearSessionCookie());
    return nextResponse;
  }

  // Forward the API's clearing Set-Cookie (or use our own if absent)
  const nextResponse = new NextResponse(null, { status: apiResponse.status });
  const apiSetCookie = apiResponse.headers.get("set-cookie");
  if (apiSetCookie) {
    // Forward the exact value (name=value part only)
    nextResponse.headers.set(
      "Set-Cookie",
      `${SESSION_COOKIE_CLEAR_ATTRS}; ${apiSetCookie.split(";").slice(1).join("; ")}`
    );
  } else {
    nextResponse.headers.set("Set-Cookie", clearSessionCookie());
  }

  return nextResponse;
}

// Constant matching what the API sends to clear the cookie
const SESSION_COOKIE_CLEAR_ATTRS = "printsbytee_session=; Max-Age=0; Path=/; SameSite=Lax";