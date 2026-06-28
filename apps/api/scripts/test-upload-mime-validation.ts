/**
 * Integration tests for magic-byte sniffing on `POST /uploads`.
 *
 * What this exercises:
 *   - Valid PNG bytes + correct Content-Type → accepted (200)
 *   - Valid JPEG bytes + correct Content-Type → accepted (200)
 *   - Valid ZIP bytes + Content-Type: image/png → rejected (415)
 *   - Valid ZIP bytes + Content-Type: image/jpeg → rejected (415)
 *   - GIF magic bytes (unknown to allowlist) + Content-Type: image/gif → 415
 *
 * This is an end-to-end test using the actual `file-type` library
 * so the magic-byte detection is fully exercised.
 *
 * Environment: requires R2 env vars because `createUpload` checks
 * `getR2Config()` before parsing the body. Mock or skip R2 check
 * for unit-level testing — the integration test verifies the full
 * busboy → sniffer pipeline.
 *
 * Run (with mock R2 config via env stubs):
 *   DATABASE_URL=postgres://test:test@localhost:5432/test \
 *     SESSION_SECRET=test-session \
 *     INTERNAL_API_KEY=$(openssl rand -hex 32) \
 *     R2_ACCOUNT_ID=test \
 *     R2_BUCKET=test \
 *     R2_ACCESS_KEY_ID=test \
 *     R2_SECRET_ACCESS_KEY=test \
 *     R2_PUBLIC_BASE_URL=http://localhost:9000 \
 *     pnpm --filter @printsbytee/api exec tsx scripts/test-upload-mime-validation.ts
 *
 * Note: The actual S3 upload will fail (no real R2), but the 415
 * rejection happens before any S3 call, so we can assert on the
 * status code without a live R2.
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — at least one assertion failed
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

/** 32-char placeholder key — enough to pass the min(32) Zod check. */
const PLACEHOLDER_KEY = 'a'.repeat(32);

/** Minimal valid PNG (1×1 red pixel). */
const VALID_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
  0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
  0x00, 0x05, 0xfe, 0x02, 0xfe, 0xa3, 0x56, 0xde, 0x00, 0x00, 0x00, 0x00,
  0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

/** Minimal valid JPEG (truncated but starts with SOI + valid marker). */
const VALID_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
  0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
  0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
  0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x09, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00,
  0x3f, 0x00, 0xd2, 0xcf, 0x20, 0xff, 0xd9,
]);

/** Valid ZIP local file header (minimal, empty archive). */
const VALID_ZIP = Buffer.from([
  0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x21, 0x00,
  0x21, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x1c, 0x00, 0x74, 0x65, 0x73, 0x74,
  0x2e, 0x74, 0x78, 0x74, 0x55, 0x54, 0x09, 0x00, 0x03, 0x00, 0x00, 0x00,
  0x00, 0x8c, 0x8f, 0x6f, 0x00, 0x00, 0x00, 0x00, 0x50, 0x4b, 0x05, 0x06,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

/** Valid GIF (1×1 red pixel). */
const VALID_GIF = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0x00, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00,
  0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0x02, 0x02, 0x4c, 0x01, 0x00, 0x3b,
]);

/** Build a multipart/form-data request body for a single file. */
function buildMultipart(contentType: string, fileData: Buffer): {
  body: Buffer;
  boundary: string;
} {
  const boundary = `----TestBoundary${Date.now()}`;
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.bin"\r\nContent-Type: ${contentType}\r\n\r\n`,
    'utf8',
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  return { body: Buffer.concat([header, fileData, footer]), boundary };
}

async function makeUploadRequest(
  body: Buffer,
  boundary: string,
): Promise<{ statusCode: number; body: unknown }> {
  const base = await startServer();
  const apiKey = process.env.INTERNAL_API_KEY ?? PLACEHOLDER_KEY;

  return new Promise<{ statusCode: number; body: unknown }>((resolve, reject) => {
    const url = new URL('/uploads', base);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(body.length),
        Authorization: `Bearer ${apiKey}`,
      },
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode ?? 0, body: JSON.parse(raw) });
        } catch {
          reject(new Error(`Non-JSON response: ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Test suite ─────────────────────────────────────────────────────────

test('Valid PNG bytes + Content-Type: image/png → not 415', async () => {
  const { body, boundary } = buildMultipart('image/png', VALID_PNG);
  const res = await makeUploadRequest(body, boundary);
  // eslint-disable-next-line no-console
  console.log(`PNG upload status: ${res.statusCode}`);
  // 415 would mean magic-byte sniff rejected it — that's the bug.
  const rawStatus = (res.statusCode as number) | 0;
  if (rawStatus === 415) {
    const b = res.body as { error: { message: string } };
    assert.fail(`PNG should NOT be rejected: ${b.error?.message}`);
  }
  // 200 = upload succeeded (R2 configured), 503 = R2 not configured.
  assert.ok(
    rawStatus === 200 || rawStatus === 503,
    `Expected 200 or 503, got ${rawStatus}`,
  );
});

test('Valid JPEG bytes + Content-Type: image/jpeg → not 415', async () => {
  const { body, boundary } = buildMultipart('image/jpeg', VALID_JPEG);
  const res = await makeUploadRequest(body, boundary);
  // eslint-disable-next-line no-console
  console.log(`JPEG upload status: ${res.statusCode}`);
  const rawStatus = (res.statusCode as number) | 0;
  if (rawStatus === 415) {
    const b = res.body as { error: { message: string } };
    assert.fail(`JPEG should NOT be rejected: ${b.error?.message}`);
  }
  assert.ok(
    rawStatus === 200 || rawStatus === 503,
    `Expected 200 or 503, got ${rawStatus}`,
  );
});

test('ZIP bytes + Content-Type: image/png → 415 magic mismatch', async () => {
  const { body, boundary } = buildMultipart('image/png', VALID_ZIP);
  const res = await makeUploadRequest(body, boundary);
  assert.equal(res.statusCode, 415, `Expected 415, got ${res.statusCode}`);
  const b = res.body as { error: { code: string } };
  assert.equal(b.error?.code, 'UNSUPPORTED_MEDIA_TYPE');
});

test('ZIP bytes + Content-Type: image/jpeg → 415 magic mismatch', async () => {
  const { body, boundary } = buildMultipart('image/jpeg', VALID_ZIP);
  const res = await makeUploadRequest(body, boundary);
  assert.equal(res.statusCode, 415, `Expected 415, got ${res.statusCode}`);
  const b = res.body as { error: { code: string } };
  assert.equal(b.error?.code, 'UNSUPPORTED_MEDIA_TYPE');
});

test('GIF bytes (unknown to allowlist) + Content-Type: image/gif → 415', async () => {
  const { body, boundary } = buildMultipart('image/gif', VALID_GIF);
  const res = await makeUploadRequest(body, boundary);
  assert.equal(res.statusCode, 415, `Expected 415, got ${res.statusCode}`);
  const b = res.body as { error: { code: string } };
  assert.equal(b.error?.code, 'UNSUPPORTED_MEDIA_TYPE');
});

// ── Server lifecycle ───────────────────────────────────────────────────

let server: http.Server | null = null;
let serverUrl: string | null = null;

async function startServer(): Promise<string> {
  if (serverUrl) return serverUrl;

  const { serve } = await import('@hono/node-server');
  const { app } = await import('../src/app.js');

  const bound = serve({ fetch: app.fetch, port: 0 }) as http.Server & {
    address: () => { port: number } | null;
  };
  server = bound;
  const addr = bound.address();
  if (!addr || typeof addr === 'string')
    throw new Error('Could not bind server');
  serverUrl = `http://localhost:${addr.port}`;
  // eslint-disable-next-line no-console
  console.log(`Test server listening at ${serverUrl}`);
  return serverUrl;
}

test('teardown', () => {
  if (server) {
    server.close();
    server = null;
    serverUrl = null;
  }
});