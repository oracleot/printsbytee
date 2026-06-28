import { randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';

/**
 * Constants + pure helpers for `POST /uploads` (I22).
 *
 * The route itself is in `./handlers/create.ts`; this file collects
 * the wire-string pins, the content-type allowlist, the key builder,
 * and the streaming size guard so each piece is unit-testable
 * without a live R2 / busboy dependency.
 *
 * Pure error-envelope builders live in `./errors.ts` (a separate
 * file because they re-import the strings from here and pull in
 * `ErrorResponseSchema`, which would otherwise blow this file past
 * the 200-line ceiling).
 */

// ── Wire string pins ───────────────────────────────────────────────────
//
// Pinned as module constants so a future typo in the handler cannot
// drift the wire string and silently break client error parsers.
// `apps/api/scripts/test-uploads-message-pins.ts` asserts the exact
// values.

export const UPLOAD_FILE_REQUIRED_MESSAGE =
  'Request must include a multipart/form-data file part named "file"';

export const UPLOAD_CONTENT_TYPE_NOT_ALLOWED_MESSAGE =
  'File content type is not allowed (allowed: image/jpeg, image/png, image/webp, image/avif)';

export const UPLOAD_TOO_LARGE_MESSAGE =
  'File exceeds the 10 MB upload limit';

export const UPLOAD_R2_UNCONFIGURED_MESSAGE =
  'R2 uploads are not configured on this environment; set the R2_* env vars to enable them';

// ── Limits ─────────────────────────────────────────────────────────────
//
// Hard 10 MB cap. Pinned here so a future change to the cap is a
// one-line edit; the route handler reads the constant via the
// `import { UPLOAD_MAX_BYTES }` line below. Mirrors the pattern in
// `apps/api/src/routes/sales/_shared/sale-helpers.ts` (message
// constants + pure helpers in one file).

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

// ── Content-type allowlist ────────────────────────────────────────────
//
// The website currently serves JPG / PNG / WebP / AVIF — pinning the
// route to those four types keeps the bucket tidy and stops an
// attacker from uploading arbitrary blobs to a public R2 bucket
// (e.g. `application/zip`, `text/html`, `application/octet-stream`).
// Extending the list later means editing this constant; that
// intentional friction is the point.

export const UPLOAD_ALLOWED_CONTENT_TYPES: ReadonlyArray<string> = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

const EXTENSION_BY_CONTENT_TYPE: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/** Lowercase + trim before allowlist check so a noisy client sending
 *  `Image/JPEG ` still passes — MIME types are case-insensitive per
 *  RFC 9110 §8.3.1. */
export function isAllowedContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const normalised = contentType.trim().toLowerCase();
  return UPLOAD_ALLOWED_CONTENT_TYPES.includes(normalised);
}

/** Map an allowlisted MIME type to the file extension used in the
 *  generated object key. Undefined for non-allowlisted types — the
 *  caller must check `isAllowedContentType` first. */
export function extensionForContentType(contentType: string): string | undefined {
  return EXTENSION_BY_CONTENT_TYPE[contentType.trim().toLowerCase()];
}

/** Build the object key for a new upload. The `uploads/` prefix lets
 *  the bucket be partitioned later (e.g. `uploads/products/`,
 *  `uploads/website/`) without rewriting historical rows — every key
 *  ever written by this code starts with `uploads/`. */
export function buildUploadKey(contentType: string): string {
  const ext = extensionForContentType(contentType);
  // `isAllowedContentType` is the route-layer guard; defensive
  // fallback here so a mis-call cannot silently produce a key with
  // no extension (which would break CDN content-negotiation for
  // image/* types).
  if (!ext) {
    throw new Error(`Refusing to build key for non-allowlisted content type: ${contentType}`);
  }
  return `uploads/${randomUUID()}.${ext}`;
}

/** Canonicalise the client-supplied MIME type for the wire response
 *  and for the S3 `ContentType` header — same lowercased form used by
 *  the allowlist. Centralising it keeps the response and the S3
 *  metadata in lockstep. */
export function canonicaliseContentType(contentType: string): string {
  return contentType.trim().toLowerCase();
}

// ── Streaming size guard ───────────────────────────────────────────────
//
// We enforce the 10 MB cap via a counting `Transform` that wraps the
// busboy file stream. The wrapper has two jobs:
//   1. As chunks flow from busboy (the parser) into S3 (the sink),
//      count their bytes.
//   2. Surface the total as `bytes` after the stream is fully
//      consumed.
//
// Why a Transform instead of inspecting the request's `Content-Length`:
//   - Multipart bodies wrap the file in envelope data (boundaries,
//     headers, etc.), so the request-level `Content-Length` is
//     strictly larger than the file's byte length.
//   - We deliberately don't use busboy's `fileSize` limit alone for
//     counting: the wire response should carry the actual byte
//     length, not just whether the file fit under the cap. Counting
//     as the bytes flow lets us return that value without buffering
//     the file in memory.
//
// The counter increments before `push()`, so even if S3 aborts the
// upload partway through the count is still accurate to what left
// the parser.
export class ByteCountingStream extends Transform {
  bytes = 0;

  override _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null, data?: Buffer) => void,
  ): void {
    this.bytes += chunk.length;
    // Forward the chunk unchanged so S3 still sees the original
    // bytes; we are a pure counter, not a transformer.
    this.push(chunk);
    callback();
  }
}