/**
 * Server-side helpers for calling the PrintsbyTee API from Next.js
 * Route Handlers and React Server Components.
 *
 * All API calls go through this module so cookie-forwarding logic lives
 * in one place. The business-app acts as a proxy: it reads the session
 * cookie from the incoming request and passes it verbatim on the
 * server-to-server fetch, then forwards the API's Set-Cookie header back
 * to the browser. This keeps the cookie on the business-app origin so
 * SameSite=Lax covers the full browser flow without CORS complications.
 */

import { cookies } from "next/headers";
import { readSessionCookie } from "./auth-cookie";

const FALLBACK_API_BASE_URL = "http://localhost:3000";

/** Returns the configured API base URL, stripped of any trailing slash. */
export function apiBaseUrl(): string {
  return (process.env.API_BASE_URL ?? FALLBACK_API_BASE_URL).replace(/\/$/, "");
}

// ── Cookie forwarding ───────────────────────────────────────────────────

/**
 * Reads the session cookie from the incoming request (via `next/headers`)
 * and formats it as a `Cookie` header value for server-to-server fetch.
 * Returns `undefined` when no cookie is present.
 *
 * Why not just forward the raw header? `cookies()` is the idiomatic Next.js
 * way to access request cookies in Server Components and Route Handlers.
 * The cookie name is a constant so callers don't repeat it.
 */
export async function forwardAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const value = readSessionCookie(cookieStore);
  return value ? `printsbytee_session=${value}` : undefined;
}

// ── Typed fetch helpers ─────────────────────────────────────────────────

/**
 * POST JSON to an API path with an optional auth cookie.
 *
 * - On fetch failure (network error, DNS failure): returns `{ ok: false, error: 'INTERNAL_ERROR' }`
 * - On HTTP error: `{ ok: false, status, body }` (body is the parsed API error envelope)
 * - On success: `{ ok: true, data }`
 */
export async function postJson<T>(
  path: string,
  body: unknown,
  cookie?: string
): Promise<
  | { ok: true; data: T }
  | { ok: false; status: number; body: unknown }
  | { ok: false; error: "INTERNAL_ERROR"; message: string }
> {
  const url = `${apiBaseUrl()}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) headers["Cookie"] = cookie;

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      return { ok: false, status: response.status, body: data };
    }

    return { ok: true, data: data as T };
  } catch {
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: "Login service unavailable",
    };
  }
}

/**
 * GET JSON from an API path with an optional auth cookie.
 *
 * Passthrough — returns the raw response status and body so callers can
 * decide how to handle 401 vs 200.
 */
export async function getJson<T>(
  path: string,
  cookie?: string
): Promise<
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; body: unknown }
  | { ok: false; error: "INTERNAL_ERROR"; message: string }
> {
  const url = `${apiBaseUrl()}${path}`;
  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      return { ok: false, status: response.status, body: data };
    }

    return { ok: true, status: response.status, data: data as T };
  } catch {
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: "Auth service unavailable",
    };
  }
}