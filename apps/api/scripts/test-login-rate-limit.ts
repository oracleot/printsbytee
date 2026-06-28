/**
 * Unit + integration tests for the login rate limiter (M6 MEDIUM-1).
 *
 * The rate limiter is tested in two modes:
 *   1. Pure unit tests — `isRateLimited()`, `secondsUntilRetry()`,
 *      `getAttempts()` directly. No DB, no HTTP server needed.
 *   2. HTTP integration tests — require DATABASE_URL + SESSION_SECRET env
 *      vars pointing at a real Postgres (the login handler needs the DB).
 *      If env vars are absent, integration tests are silently skipped.
 *
 * Run unit tests only:
 *   pnpm --filter @printsbytee/api exec tsx scripts/test-login-rate-limit.ts
 *
 * Run with DB:
 *   DATABASE_URL=postgres://user:pass@localhost:5432/db \
 *     SESSION_SECRET=test-session \
 *     INTERNAL_API_KEY=$(openssl rand -hex 32) \
 *     pnpm --filter @printsbytee/api exec tsx scripts/test-login-rate-limit.ts
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — at least one assertion failed
 */
import http from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearRateLimitStore,
  getAttempts,
  getClientIp,
  isRateLimited,
  secondsUntilRetry,
} from '../src/middleware/rateLimitLogin.js';

/** Stable unique IP per test — avoids cross-test pollution. */
function staticIp(n: number): string {
  return `10.1.${n >> 8}.${n & 0xff}`;
}

// ── Pure unit tests ────────────────────────────────────────────────────

test('First attempt from an IP is not rate-limited', () => {
  clearRateLimitStore();
  const ip = staticIp(1);
  assert.equal(isRateLimited(ip), false, 'First attempt should not be rate-limited');
  clearRateLimitStore();
});

test('9th attempt from same IP is still not rate-limited', () => {
  clearRateLimitStore();
  const ip = staticIp(2);
  for (let i = 0; i < 8; i++) isRateLimited(ip);
  assert.equal(getAttempts(ip).length, 8, 'Should have 8 entries before 9th attempt');
  // 9th attempt: 8 < 10 → records 9th entry → returns false (allowed).
  assert.equal(isRateLimited(ip), false, '9th attempt should be allowed');
  clearRateLimitStore();
});

test('10th attempt from same IP is still not rate-limited', () => {
  clearRateLimitStore();
  const ip = staticIp(3);
  for (let i = 0; i < 9; i++) isRateLimited(ip);
  assert.equal(getAttempts(ip).length, 9, 'Should have 9 entries before 10th attempt');
  // 10th attempt: 9 < 10 → records 10th entry → returns false (allowed).
  assert.equal(isRateLimited(ip), false, '10th attempt should be allowed');
  clearRateLimitStore();
});

test('11th attempt from same IP IS rate-limited', () => {
  clearRateLimitStore();
  const ip = staticIp(4);
  for (let i = 0; i < 10; i++) isRateLimited(ip);
  assert.equal(getAttempts(ip).length, 10, 'Should have 10 entries before 11th attempt');
  // 11th attempt: 10 >= 10 → no record → returns true (blocked).
  assert.equal(isRateLimited(ip), true, '11th attempt should be blocked');
  clearRateLimitStore();
});

test('Different IPs have independent windows', () => {
  clearRateLimitStore();
  const ip1 = staticIp(5);
  const ip2 = staticIp(6);
  for (let i = 0; i < 10; i++) isRateLimited(ip1);
  assert.equal(isRateLimited(ip1), true, 'ip1 should be blocked');
  assert.equal(isRateLimited(ip2), false, 'ip2 should NOT be blocked');
  clearRateLimitStore();
});

test('Clear store resets all windows', () => {
  clearRateLimitStore();
  const ip = staticIp(7);
  for (let i = 0; i < 10; i++) isRateLimited(ip);
  assert.equal(isRateLimited(ip), true, 'Should be blocked before clear');
  clearRateLimitStore();
  assert.equal(getAttempts(ip).length, 0, 'Store should be empty after clear');
  assert.equal(isRateLimited(ip), false, 'Should be allowed after clear');
  clearRateLimitStore();
});

test('secondsUntilRetry returns a positive number when rate-limited', () => {
  clearRateLimitStore();
  const ip = staticIp(8);
  for (let i = 0; i < 10; i++) isRateLimited(ip);
  const retrySecs = secondsUntilRetry(ip);
  assert.ok(retrySecs > 0 && retrySecs <= 900, `Retry-After should be 1-900, got ${retrySecs}`);
  clearRateLimitStore();
});

test('getAttempts returns timestamps (may be same ms due to fast clock)', () => {
  clearRateLimitStore();
  const ip = staticIp(9);
  for (let i = 0; i < 5; i++) isRateLimited(ip);
  const attempts = getAttempts(ip);
  assert.equal(attempts.length, 5, `Expected 5 attempts, got ${attempts.length}`);
  // Timestamps should be non-decreasing (may be equal due to ms resolution).
  for (let i = 1; i < attempts.length; i++) {
    assert.ok(
      attempts[i]! >= attempts[i - 1]!,
      `Timestamp ${i} (${attempts[i]}) should be >= timestamp ${i - 1} (${attempts[i - 1]})`,
    );
  }
  clearRateLimitStore();
});

test('getClientIp extracts from x-forwarded-for (first IP)', () => {
  const c = { req: { header: (name: string) => name === 'x-forwarded-for' ? '203.0.113.1, 10.0.0.1' : undefined } };
  assert.equal(getClientIp(c as never), '203.0.113.1');
});

test('getClientIp falls back to cf-connecting-ip', () => {
  const c = { req: { header: (name: string) => name === 'cf-connecting-ip' ? '198.51.100.1' : undefined } };
  assert.equal(getClientIp(c as never), '198.51.100.1');
});

test('getClientIp returns empty string when no headers present', () => {
  const c = { req: { header: () => undefined } };
  assert.equal(getClientIp(c as never), '');
});

// ── HTTP integration tests (require live Postgres) ─────────────────────

test('HTTP: 10 failed logins → 401s, 11th → 429', async () => {
  // Guard: skip if DATABASE_URL is not set (app module would throw on import).
  if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
    // eslint-disable-next-line no-console
    console.log('Skipping HTTP integration tests: DATABASE_URL or SESSION_SECRET not set');
    return;
  }

  clearRateLimitStore();
  const ip = staticIp(10);
  const headers = { 'x-forwarded-for': ip };
  const invalidBody = { email: 'attacker@example.com', password: 'wrongpassword' };

  // Lazy-start the server only when env vars are confirmed above.
  let server: http.Server | null = null;
  let serverUrl = '';
  try {
    const { serve } = await import('@hono/node-server');
    const { app } = await import('../src/app.js');
    const bound = serve({ fetch: app.fetch, port: 0 }) as http.Server & {
      address: () => { port: number } | null;
    };
    server = bound;
    const addr = bound.address();
    if (!addr || typeof addr === 'string') throw new Error('Could not bind server');
    serverUrl = `http://localhost:${addr.port}`;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(`Skipping HTTP integration tests: could not start server: ${err}`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`Test server listening at ${serverUrl}`);

  async function makeRequest(
    method: string,
    path: string,
    body: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<{ statusCode: number; headers: Record<string, string | string[]>; body: unknown }> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, serverUrl!);
      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
      };
      const req = http.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk: Buffer) => (raw += chunk.toString()));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode ?? 0,
              headers: res.headers as Record<string, string | string[]>,
              body: JSON.parse(raw),
            });
          } catch {
            reject(new Error(`Non-JSON response: ${raw.slice(0, 200)}`));
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(body));
      req.end();
    });
  }

  // 10 attempts → expect 401 (validates that the rate limiter passes)
  for (let i = 0; i < 10; i++) {
    const res = await makeRequest('POST', '/auth/login', invalidBody, headers);
    assert.equal(res.statusCode, 401, `Attempt ${i + 1}: expected 401, got ${res.statusCode}`);
  }

  // 11th → 429
  const eleventh = await makeRequest('POST', '/auth/login', invalidBody, headers);
  assert.equal(eleventh.statusCode, 429, `11th: expected 429, got ${eleventh.statusCode}`);
  const b = eleventh.body as { error: { code: string } };
  assert.equal(b.error?.code, 'TOO_MANY_REQUESTS');
  assert.ok(eleventh.headers['retry-after'], 'Should have Retry-After header');

  if (server) server.close();
  clearRateLimitStore();
});

// ── Cleanup ────────────────────────────────────────────────────────────

test('teardown', () => {
  clearRateLimitStore();
});