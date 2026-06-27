/**
 * Constants and helpers for the session cookie.
 *
 * Matches the API's `SESSION_COOKIE_NAME` and `SESSION_LIFETIME_SECONDS`
 * from `apps/api/src/services/sessions.ts` so both sides of the proxy agree
 * on the cookie contract without repetition.
 *
 * The cookie value is an opaque session ID (32 random bytes, base64url).
 * The business-app never parses or validates the value — it only forwards
 * it verbatim between the browser and the API.
 */

/** Cookie name — must match the API's `SESSION_COOKIE_NAME`. */
export const SESSION_COOKIE_NAME = "printsbytee_session" as const;

/** Max-Age in seconds — must match `SESSION_LIFETIME_SECONDS` (30 days). */
export const SESSION_MAX_AGE_SECONDS = 2592000;

// ── Read ────────────────────────────────────────────────────────────────

/**
 * Read the session cookie value from a Next.js `ReadonlyRequestCookies`.
 * Returns `undefined` when absent or empty.
 *
 * In Next.js 15, `cookies()` returns `Promise<ReadonlyRequestCookies>` in
 * both RSCs and Route Handlers. Callers must `await cookies()` before
 * passing here.
 */
export function readSessionCookie(
  cookiesStore: { get(name: string): { value?: string } | undefined }
): string | undefined {
  const entry = cookiesStore.get(SESSION_COOKIE_NAME);
  return typeof entry?.value === "string" && entry.value.length > 0
    ? entry.value
    : undefined;
}

// ── Set (for Route Handler responses) ──────────────────────────────────

/**
 * Format the Set-Cookie header value that a Route Handler should return
 * to the browser after the API has issued a session cookie.
 *
 * The value comes from the API; we just re-emit it on the business-app
 * origin with the same attributes. HttpOnly and SameSite are preserved
 * so the browser treats it as the original cookie.
 *
 * Why not use `NextResponse.cookies().set()`? Because we need to forward
 * the exact value the API generated (an opaque 43-char base64url string).
 * Calling `set()` with that value and re-specifying the attributes is
 * equivalent; we use this helper to keep the attribute set consistent.
 */
export function setSessionCookieFromApi(value: string): string {
  const attrs = [
    `${SESSION_COOKIE_NAME}=${value}`,
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    "Path=/",
  ];
  return attrs.join("; ");
}

/**
 * Format the Set-Cookie header value that clears the session cookie
 * (Max-Age=0). Path and SameSite must match the original Set-Cookie or
 * browsers will not overwrite the existing cookie.
 */
export function clearSessionCookie(): string {
  const attrs = [
    `${SESSION_COOKIE_NAME}=`,
    "Max-Age=0",
    "Path=/",
    "SameSite=Lax",
  ];
  return attrs.join("; ");
}