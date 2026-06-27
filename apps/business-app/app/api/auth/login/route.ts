/**
 * POST /api/auth/login
 *
 * Proxy to the PrintsbyTee API's POST /auth/login. The API issues the
 * session cookie; we forward the Set-Cookie verbatim to the browser so
 * it lives on the business-app origin (same-site, no CORS needed).
 *
 * Error handling:
 * - 400/401 from the API → forwarded as-is (401 surfaces as
 *   "Invalid email or password" to the user via LoginForm)
 * - Fetch failure → 502 with a generic internal-error envelope
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { LoginRequestSchema } from "@printsbytee/shared";
import { apiBaseUrl } from "@/lib/api-server";
import { setSessionCookieFromApi } from "@/lib/auth-cookie";

export async function POST(request: Request) {
  // 1. Parse and validate the request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON" } },
      { status: 400 }
    );
  }

  let parsed: { email: string; password: string };
  try {
    parsed = LoginRequestSchema.parse(body);
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

  // 2. Server-side fetch to the API (no cookie needed for login)
  const apiUrl = `${apiBaseUrl()}/auth/login`;
  let apiResponse: Response;
  try {
    apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Login service unavailable" } },
      { status: 502 }
    );
  }

  // 3. On error, forward the API's error envelope
  if (!apiResponse.ok) {
    let errorBody: unknown;
    try {
      errorBody = await apiResponse.json();
    } catch {
      errorBody = { error: { code: "UNKNOWN_ERROR", message: "Unexpected response from auth service" } };
    }
    return NextResponse.json(errorBody, { status: apiResponse.status });
  }

  // 4. On success, forward the Set-Cookie header from the API
  const setCookieHeader = apiResponse.headers.get("set-cookie");
  const responseBody = await apiResponse.json();

  const nextResponse = NextResponse.json(responseBody, { status: 200 });
  if (setCookieHeader) {
    // Forward the exact Set-Cookie value the API generated
    nextResponse.headers.set("Set-Cookie", setSessionCookieFromApi(
      setCookieHeader.split(";")[0] ?? "" // strip cookie attributes, keep only name=value
    ));
  }

  return nextResponse;
}