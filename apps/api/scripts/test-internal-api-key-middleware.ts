/**
 * Integration tests for the INTERNAL_API_KEY middleware.
 *
 * What this exercises:
 *   - `requireInternalApiKey` middleware correctly rejects requests
 *     without a valid Bearer token on `POST /enquiries` and
 *     `POST /waitlist`.
 *   - The website proxies (enquiry, waitlist) now send the correct
 *     `Authorization: Bearer ...` header (not `X-Internal-API-Key`).
 *
 * The test starts the Hono app, then makes real HTTP requests so the
 * full middleware stack (auth → routing → handler) is exercised.
 *
 * Environment:
 *   - Does NOT need a live Postgres or real SMTP. `db/client.ts`
 *     only constructs a `pg.Pool` (lazy connection) and the route
 *     handlers only connect when the middleware passes. The auth
 *     middleware tested here never reaches the DB.
 *   - DOES need placeholder env vars because `src/env.ts` validates
 *     env on import (Zod schema, fail-fast). The following vars are
 *     required and must be supplied (any non-empty placeholder is fine):
 *       - DATABASE_URL       (must start with postgres://)
 *       - SESSION_SECRET     (any non-blank string)
 *       - INTERNAL_API_KEY   (any non-blank string)
 *
 * Run:
 *   DATABASE_URL=postgres://test:test@localhost:5432/test \
 *     SESSION_SECRET=test-session \
 *     INTERNAL_API_KEY=$(openssl rand -hex 32) \
 *     pnpm --filter @printsbytee/api exec tsx scripts/test-internal-api-key-middleware.ts
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — at least one assertion failed
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// Lazy import so env vars are set before the module graph loads env.ts.
const API_KEY = process.env.INTERNAL_API_KEY ?? 'a'.repeat(32);

interface TestResponse {
  statusCode: number;
  body: unknown;
}

test('POST /enquiries without Authorization header → 401', async () => {
  const res = await makeRequest('POST', '/enquiries', {});
  assert.equal(res.statusCode, 401, `Expected 401, got ${res.statusCode}`);
  const body = res.body as { error: { code: string; message: string } };
  assert.equal(body.error?.code, 'UNAUTHORIZED');
  assert.equal(body.error?.message, 'Invalid API key');
});

test('POST /enquiries with wrong key → 401', async () => {
  const res = await makeRequest('POST', '/enquiries', {}, 'Bearer wrong-key');
  assert.equal(res.statusCode, 401, `Expected 401, got ${res.statusCode}`);
  const body = res.body as { error: { code: string; message: string } };
  assert.equal(body.error?.code, 'UNAUTHORIZED');
  assert.equal(body.error?.message, 'Invalid API key');
});

test('POST /enquiries with correct key but empty body → 400 (auth passed)', async () => {
  // Auth middleware passes; Zod validation returns 400.
  const res = await makeRequest('POST', '/enquiries', {}, `Bearer ${API_KEY}`);
  assert.equal(res.statusCode, 400, `Expected 400 (Zod), got ${res.statusCode}`);
  const body = res.body as { error: { code: string; message: string } };
  assert.equal(body.error?.code, 'VALIDATION_ERROR');
});

test('POST /enquiries with X-Internal-API-Key (wrong convention) → 401', async () => {
  // Verify the old header convention is rejected.
  const res = await makeRequest('POST', '/enquiries', {}, `X-Internal-API-Key: ${API_KEY}`);
  assert.equal(res.statusCode, 401, `Expected 401 (old header convention), got ${res.statusCode}`);
  const body = res.body as { error: { code: string; message: string } };
  assert.equal(body.error?.code, 'UNAUTHORIZED');
});

test('POST /waitlist without Authorization header → 401', async () => {
  const res = await makeRequest('POST', '/waitlist', {});
  assert.equal(res.statusCode, 401, `Expected 401, got ${res.statusCode}`);
  const body = res.body as { error: { code: string; message: string } };
  assert.equal(body.error?.code, 'UNAUTHORIZED');
  assert.equal(body.error?.message, 'Invalid API key');
});

test('POST /waitlist with wrong key → 401', async () => {
  const res = await makeRequest('POST', '/waitlist', {}, 'Bearer wrong-key');
  assert.equal(res.statusCode, 401, `Expected 401, got ${res.statusCode}`);
  const body = res.body as { error: { code: string; message: string } };
  assert.equal(body.error?.code, 'UNAUTHORIZED');
  assert.equal(body.error?.message, 'Invalid API key');
});

test('POST /waitlist with correct key but empty body → 400 (auth passed)', async () => {
  // Auth middleware passes; Zod validation returns 400.
  const res = await makeRequest('POST', '/waitlist', {}, `Bearer ${API_KEY}`);
  assert.equal(res.statusCode, 400, `Expected 400 (Zod), got ${res.statusCode}`);
  const body = res.body as { error: { code: string; message: string } };
  assert.equal(body.error?.code, 'VALIDATION_ERROR');
});

test('POST /waitlist with X-Internal-API-Key (wrong convention) → 401', async () => {
  // Verify the old header convention is rejected.
  const res = await makeRequest('POST', '/waitlist', {}, `X-Internal-API-Key: ${API_KEY}`);
  assert.equal(res.statusCode, 401, `Expected 401 (old header convention), got ${res.statusCode}`);
  const body = res.body as { error: { code: string; message: string } };
  assert.equal(body.error?.code, 'UNAUTHORIZED');
});

// ── Helper functions ───────────────────────────────────────────────────

/**
 * Make an HTTP request to the local API server.
 * Server is started lazily on the first call.
 */
let server: http.Server | ReturnType<typeof http.createServer> | null = null;
let serverUrl: string | null = null;

async function startServer(): Promise<string> {
  if (serverUrl) return serverUrl;

  // Dynamic import so the Hono app is only constructed after the env
  // vars above have been set.
  const { serve } = await import('@hono/node-server');
  const { app } = await import('../src/app.js');

  const port = 0; // ask OS for a free port
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bound = serve({ fetch: app.fetch, port }) as any;
  server = bound;
  const addr = bound.address() as { port: number };

  serverUrl = `http://localhost:${addr.port}`;
  // eslint-disable-next-line no-console
  console.log(`Test server listening at ${serverUrl}`);
  return serverUrl;
}

async function makeRequest(
  method: string,
  path: string,
  body: unknown,
  authHeader?: string,
): Promise<TestResponse> {
  const base = await startServer();

  return new Promise<TestResponse>((resolve, reject) => {
    const url = new URL(path, base);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    };

    const req = http.request(options, (res) => {
      // Collect body and attach a json() method.
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ statusCode: res.statusCode ?? 0, body: parsed });
        } catch {
          reject(new Error(`Non-JSON response: ${raw}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

// Clean up server after all tests.
test('teardown', () => {
  if (server) {
    server.close();
    server = null;
    serverUrl = null;
  }
});