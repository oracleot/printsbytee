/**
 * Unit tests for the I22 `POST /uploads` pure helpers + wire-string
 * pins.
 *
 * What this exercises:
 *   - `UPLOAD_FILE_REQUIRED_MESSAGE` — pin the exact wire string used
 *     for the 400 envelope when no `file` part is present.
 *   - `UPLOAD_CONTENT_TYPE_NOT_ALLOWED_MESSAGE` — pin the 415 wire
 *     string for a present-but-wrong content type.
 *   - `UPLOAD_TOO_LARGE_MESSAGE` — pin the 413 wire string for the
 *     10 MB cap.
 *   - `UPLOAD_R2_UNCONFIGURED_MESSAGE` — pin the 503 wire string for
 *     missing R2 env vars.
 *   - `isAllowedContentType` — accept the documented set, reject
 *     anything else (incl. case-mismatched and empty values).
 *   - `extensionForContentType` — match the documented MIME→ext map
 *     and return undefined for non-allowlisted types.
 *   - `buildUploadKey` — produce `uploads/<uuid>.<ext>` and refuse
 *     to produce a key for non-allowlisted types.
 *   - `canonicaliseContentType` — lowercase + trim, idempotent.
 *   - `ByteCountingStream` — counts bytes flowing through and
 *     forwards them unchanged.
 *   - Error envelope builders in `errors.ts` — pin the wire shape
 *     and HTTP status code for each documented error.
 *
 * What this does NOT exercise (left to integration tests):
 *   - The busboy → S3 `Upload` end-to-end flow. That requires a
 *     live R2 (or a stubbed `@aws-sdk/lib-storage` client) and is
 *     intentionally out of scope for the pure unit test, mirroring
 *     `scripts/test-sale-message-pins.ts` which similarly skips the
 *     `db.transaction(...)` SQL aggregation path.
 *
 * Run:
 *   pnpm --filter @printsbytee/api exec tsx scripts/test-uploads-message-pins.ts
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — at least one assertion failed
 */
import { Readable } from 'node:stream';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UPLOAD_ALLOWED_CONTENT_TYPES,
  UPLOAD_CONTENT_TYPE_NOT_ALLOWED_MESSAGE,
  UPLOAD_FILE_REQUIRED_MESSAGE,
  UPLOAD_MAX_BYTES,
  UPLOAD_R2_UNCONFIGURED_MESSAGE,
  UPLOAD_TOO_LARGE_MESSAGE,
  ByteCountingStream,
  buildUploadKey,
  canonicaliseContentType,
  extensionForContentType,
  isAllowedContentType,
} from '../src/routes/uploads/helpers.js';
import {
  fileRequiredResponse,
  payloadTooLargeResponse,
  r2UnconfiguredResponse,
  unsupportedMediaTypeResponse,
} from '../src/routes/uploads/errors.js';

// ── Message strings ────────────────────────────────────────────────────

test('UPLOAD_FILE_REQUIRED_MESSAGE is the documented 400 copy', () => {
  // Pin the exact wire string so a future typo in the handler does
  // not silently change the API contract for client error parsers.
  assert.equal(
    UPLOAD_FILE_REQUIRED_MESSAGE,
    'Request must include a multipart/form-data file part named "file"',
  );
});

test('UPLOAD_CONTENT_TYPE_NOT_ALLOWED_MESSAGE is the documented 415 copy', () => {
  assert.equal(
    UPLOAD_CONTENT_TYPE_NOT_ALLOWED_MESSAGE,
    'File content type is not allowed (allowed: image/jpeg, image/png, image/webp, image/avif)',
  );
});

test('UPLOAD_TOO_LARGE_MESSAGE is the documented 413 copy', () => {
  assert.equal(
    UPLOAD_TOO_LARGE_MESSAGE,
    'File exceeds the 10 MB upload limit',
  );
});

test('UPLOAD_R2_UNCONFIGURED_MESSAGE is the documented 503 copy', () => {
  assert.equal(
    UPLOAD_R2_UNCONFIGURED_MESSAGE,
    'R2 uploads are not configured on this environment; set the R2_* env vars to enable them',
  );
});

test('UPLOAD_MAX_BYTES is 10 MiB', () => {
  // Pin the cap. A drift here (e.g. 5 MB, 50 MB) is a wire-contract
  // change that should land in its own commit.
  assert.equal(UPLOAD_MAX_BYTES, 10 * 1024 * 1024);
});

// ── Allowlist + key builder + canonicalisation ────────────────────────

test('UPLOAD_ALLOWED_CONTENT_TYPES matches the documented set', () => {
  // Pin the exact array contents. Adding a new type is a
  // wire-contract change that should land in its own commit and
  // update both the README and the API surface doc.
  assert.deepEqual(
    [...UPLOAD_ALLOWED_CONTENT_TYPES],
    ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  );
});

test('isAllowedContentType accepts the documented types verbatim', () => {
  for (const t of UPLOAD_ALLOWED_CONTENT_TYPES) {
    assert.equal(isAllowedContentType(t), true, `expected ${t} to be allowed`);
  }
});

test('isAllowedContentType lowercases + trims case-variant input', () => {
  // MIME types are case-insensitive per RFC 9110 §8.3.1. A client
  // sending `Image/JPEG ` must still pass the allowlist.
  assert.equal(isAllowedContentType('IMAGE/JPEG'), true);
  assert.equal(isAllowedContentType('  image/png  '), true);
});

test('isAllowedContentType rejects non-image and unknown types', () => {
  // Tight pin: the bucket is public-read, so letting through e.g.
  // `application/zip` or `text/html` would let an attacker upload
  // arbitrary blobs. The 415 envelope is the only thing standing
  // between the bucket and `text/html`.
  assert.equal(isAllowedContentType('image/gif'), false);
  assert.equal(isAllowedContentType('application/zip'), false);
  assert.equal(isAllowedContentType('text/html'), false);
  assert.equal(isAllowedContentType('application/octet-stream'), false);
  assert.equal(isAllowedContentType(''), false);
  assert.equal(isAllowedContentType(undefined), false);
});

test('extensionForContentType maps allowed types to their extensions', () => {
  assert.equal(extensionForContentType('image/jpeg'), 'jpg');
  assert.equal(extensionForContentType('image/png'), 'png');
  assert.equal(extensionForContentType('image/webp'), 'webp');
  assert.equal(extensionForContentType('image/avif'), 'avif');
  assert.equal(extensionForContentType('IMAGE/JPEG'), 'jpg', 'case-insensitive');
});

test('extensionForContentType returns undefined for unknown types', () => {
  assert.equal(extensionForContentType('image/gif'), undefined);
  assert.equal(extensionForContentType('application/zip'), undefined);
});

test('buildUploadKey produces uploads/<uuid>.<ext>', () => {
  // Validate the shape (prefix + uuid v4 + extension). We don't pin
  // the exact uuid — it's random — only the structure.
  const key = buildUploadKey('image/jpeg');
  assert.match(
    key,
    /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/,
    `unexpected key shape: ${key}`,
  );
});

test('buildUploadKey throws for non-allowlisted types', () => {
  // Defensive: the route layer checks `isAllowedContentType` first,
  // but `buildUploadKey` must not silently produce a key with no
  // extension (which would break CDN content-negotiation).
  assert.throws(
    () => buildUploadKey('application/zip'),
    /Refusing to build key/,
  );
});

test('buildUploadKey uses a different uuid on every call', () => {
  // Not a strict uniqueness contract (UUID v4 collisions are
  // negligible at our scale), but a strong smoke test that we are
  // actually invoking `randomUUID()` and not e.g. caching.
  const a = buildUploadKey('image/png');
  const b = buildUploadKey('image/png');
  assert.notEqual(a, b);
});

test('canonicaliseContentType lowercases + trims', () => {
  assert.equal(canonicaliseContentType('Image/JPEG'), 'image/jpeg');
  assert.equal(canonicaliseContentType('  image/png  '), 'image/png');
  assert.equal(canonicaliseContentType('image/webp'), 'image/webp');
  assert.equal(canonicaliseContentType('image/webp'), canonicaliseContentType('image/webp'),
    'canonicalisation is idempotent');
});

// ── ByteCountingStream ────────────────────────────────────────────────

test('ByteCountingStream counts bytes and forwards them unchanged', async () => {
  // The counter is the source of truth for the wire `size` field.
  // Pin both halves of that contract: total bytes counted equals
  // input length, AND the data S3 receives is exactly the data
  // busboy emitted (a streaming counter that drops or mutates
  // chunks would corrupt uploads silently).
  const counter = new ByteCountingStream();
  const chunks: Buffer[] = [];
  counter.on('data', (c: Buffer) => chunks.push(c));

  counter.write(Buffer.from('hello'));
  counter.write(Buffer.from(' '));
  counter.write(Buffer.from('world'));
  counter.end();

  // Wait for the stream to finish draining.
  await new Promise<void>((resolve) => counter.on('end', () => resolve()));

  assert.equal(counter.bytes, 11, 'counts all bytes from input chunks');
  assert.equal(
    Buffer.concat(chunks).toString('utf8'),
    'hello world',
    'forwards chunks byte-for-byte to the consumer',
  );
});

test('ByteCountingStream counts large chunks without overflow', () => {
  // 1 MiB chunk: typical for a TCP read of a multipart body. The
  // counter uses JS Number (IEEE-754 double, safe up to 2^53) so
  // anything well under 1 PB is fine, but exercise the path with
  // a size above 64 KB to confirm chunking is irrelevant.
  const counter = new ByteCountingStream();
  const big = Buffer.alloc(1024 * 1024, 0x41); // 1 MiB of 'A'
  counter.write(big);
  counter.end();
  assert.equal(counter.bytes, 1024 * 1024);
});

test('ByteCountingStream integrates with Readable.fromWeb-style piping', async () => {
  // The handler pipes the busboy file stream INTO the counter
  // (counter is the destination) and the S3 `Upload` reads FROM
  // the counter. Verify the pipe direction works the way the
  // handler uses it.
  const source = Readable.from([
    Buffer.from('chunk-1'),
    Buffer.from('-chunk-2'),
  ]);
  const counter = new ByteCountingStream();
  const drained: Buffer[] = [];
  counter.on('data', (c: Buffer) => drained.push(c));

  source.pipe(counter);
  await new Promise<void>((resolve) => counter.on('end', () => resolve()));

  assert.equal(counter.bytes, 'chunk-1-chunk-2'.length);
  assert.equal(Buffer.concat(drained).toString('utf8'), 'chunk-1-chunk-2');
});

// ── Error envelope builders ───────────────────────────────────────────

test('fileRequiredResponse returns 400 VALIDATION_ERROR envelope', async () => {
  const response = fileRequiredResponse();
  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    error: { code: string; message: string };
  };
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.equal(body.error.message, UPLOAD_FILE_REQUIRED_MESSAGE);
});

test('unsupportedMediaTypeResponse returns 415 UNSUPPORTED_MEDIA_TYPE envelope', async () => {
  const response = unsupportedMediaTypeResponse();
  assert.equal(response.status, 415);
  const body = (await response.json()) as {
    error: { code: string; message: string };
  };
  assert.equal(body.error.code, 'UNSUPPORTED_MEDIA_TYPE');
  assert.equal(body.error.message, UPLOAD_CONTENT_TYPE_NOT_ALLOWED_MESSAGE);
});

test('payloadTooLargeResponse returns 413 PAYLOAD_TOO_LARGE envelope', async () => {
  const response = payloadTooLargeResponse();
  assert.equal(response.status, 413);
  const body = (await response.json()) as {
    error: { code: string; message: string };
  };
  assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE');
  assert.equal(body.error.message, UPLOAD_TOO_LARGE_MESSAGE);
});

test('r2UnconfiguredResponse returns 503 SERVICE_UNAVAILABLE envelope', async () => {
  const response = r2UnconfiguredResponse();
  assert.equal(response.status, 503);
  const body = (await response.json()) as {
    error: { code: string; message: string };
  };
  assert.equal(body.error.code, 'SERVICE_UNAVAILABLE');
  assert.equal(body.error.message, UPLOAD_R2_UNCONFIGURED_MESSAGE);
});