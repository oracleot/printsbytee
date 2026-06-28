import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types.js';

import { ErrorResponseSchema } from '@printsbytee/shared';

/**
 * Sliding-window in-memory rate limiter for `POST /auth/login`.
 *
 * Single-process model: the owner is a solo operator on Railway
 * with one API instance, so an in-memory Map is adequate. If
 * Railway ever scales to multiple processes, replace the Map with
 * a Redis-backed store (e.g. ZREMRANGEBYSCORE + ZCARD).
 *
 * Security properties:
 *   - Fail-open: if the limiter throws, the request proceeds. We
 *     never block legitimate logins because the rate limiter itself
 *     failed.
 *   - IP extraction: x-forwarded-for (Railway) → cf-connecting-ip
 *     (Cloudflare) → socket address fallback.
 *   - 10 attempts / 15-minute window: generous for a human typo,
 *     tight enough to slow scripted brute-force.
 *   - Lazy pruning: old entries are evicted on the next request
 *     from the same IP rather than on a timer.
 */

/** Window duration in milliseconds. */
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** Maximum attempts per window. */
const MAX_ATTEMPTS = 10;

/** Store: IP → sorted array of attempt timestamps (oldest first). */
const attemptsByIp = new Map<string, number[]>();

/**
 * Extract the real client IP from the request.
 *
 * Order of preference:
 *   1. x-forwarded-for  — set by Railway's reverse proxy
 *   2. cf-connecting-ip — set by Cloudflare when the traffic passes
 *                         through it (website → Railway direct)
 *   3. socket remote address — Hono's `@hono/node-server` binding
 */
export function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    // `x-forwarded-for` may carry multiple comma-separated IPs
    // (client, proxy1, proxy2 …). The first one is the origin.
    return forwarded.split(',')[0]!.trim();
  }
  const cf = c.req.header('cf-connecting-ip');
  if (cf) return cf.trim();
  // `@hono/node-server` exposes socket info via c.env in server
  // adapters; fall back to an empty string (covers edge cases where
  // no proxy info is available).
  return '';
}

/**
 * Prune timestamps older than WINDOW_MS from an IP's entry.
 * Called lazily on each request from that IP.
 */
function prune(ip: string): void {
  const cutoff = Date.now() - WINDOW_MS;
  const existing = attemptsByIp.get(ip);
  if (!existing) return;
  const pruned = existing.filter((t) => t > cutoff);
  if (pruned.length === 0) {
    attemptsByIp.delete(ip);
  } else {
    attemptsByIp.set(ip, pruned);
  }
}

/**
 * Check whether a client IP is currently within the rate limit.
 * Records the attempt when under the limit.
 *
 * @returns `true` if the request is allowed; `false` if it should be
 *          rejected with 429.
 */
export function isRateLimited(ip: string): boolean {
  prune(ip);
  const existing = attemptsByIp.get(ip) ?? [];
  if (existing.length >= MAX_ATTEMPTS) return true;
  attemptsByIp.set(ip, [...existing, Date.now()]);
  return false;
}

/**
 * Seconds until the oldest entry in the window expires.
 * Used to set the `Retry-After` header on 429 responses.
 */
export function secondsUntilRetry(ip: string): number {
  const existing = attemptsByIp.get(ip);
  if (!existing || existing.length === 0) return WINDOW_MS / 1000;
  const oldest = existing[0]!;
  const expiry = oldest + WINDOW_MS;
  return Math.max(1, Math.ceil((expiry - Date.now()) / 1000));
}

/** Exported for unit testing — clears the in-memory store. */
export function clearRateLimitStore(): void {
  attemptsByIp.clear();
}

/** Exported for unit testing — returns raw attempt list for an IP. */
export function getAttempts(ip: string): readonly number[] {
  return attemptsByIp.get(ip) ?? [];
}

export const rateLimitLogin = createMiddleware<AppEnv>(async (c, next) => {
  const ip = getClientIp(c);

  let allowed: boolean;
  try {
    allowed = !isRateLimited(ip);
  } catch {
    // Fail-open: if the limiter itself throws (e.g. Map corruption),
    // let the request through rather than blocking legitimate logins.
    allowed = true;
  }

  if (!allowed) {
    const retryAfter = secondsUntilRetry(ip);
    await c.header('Retry-After', String(retryAfter));
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many login attempts. Please try again later.',
        },
      }),
      429,
    );
  }

  await next();
});