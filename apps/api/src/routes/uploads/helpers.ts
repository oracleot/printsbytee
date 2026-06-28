import { randomUUID } from 'node:crypto';
import { Transform, type Readable } from 'node:stream';
import { fileTypeFromBuffer } from 'file-type';

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

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

// ── Content-type allowlist ────────────────────────────────────────────

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

export function isAllowedContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const normalised = contentType.trim().toLowerCase();
  return UPLOAD_ALLOWED_CONTENT_TYPES.includes(normalised);
}

export function extensionForContentType(contentType: string): string | undefined {
  return EXTENSION_BY_CONTENT_TYPE[contentType.trim().toLowerCase()];
}

export function buildUploadKey(contentType: string): string {
  const ext = extensionForContentType(contentType);
  if (!ext) {
    throw new Error(`Refusing to build key for non-allowlisted content type: ${contentType}`);
  }
  return `uploads/${randomUUID()}.${ext}`;
}

export function canonicaliseContentType(contentType: string): string {
  return contentType.trim().toLowerCase();
}

// ── Magic-byte sniffing ────────────────────────────────────────────────

/** Number of bytes to read from the start of the file for sniffing. */
export const SNIFF_BYTES = 4 * 1024;

/**
 * Detect the MIME type of a buffer by inspecting magic bytes.
 * Returns `undefined` when the content type cannot be determined.
 *
 * Used as a defence-in-depth layer: even when a client sends the
 * correct `Content-Type` header, the actual bytes are validated
 * against the allowlist to stop polyglot-file attacks (e.g. a ZIP
 * file renamed to .png).
 */
export async function sniffContentType(
  bytes: Uint8Array,
): Promise<string | undefined> {
  const result = await fileTypeFromBuffer(bytes);
  return result?.mime;
}

/**
 * Streaming transform that intercepts the first `targetSize` bytes
 * for magic-byte sniffing, then forwards all bytes downstream
 * unchanged.
 *
 * Usage:
 *   const sniffer = new MagicByteSniffer(SNIFF_BYTES, async (mime) => {
 *     // Validate mime against allowlist; reject if not allowed.
 *   });
 *   fileStream.pipe(sniffer).pipe(counter).pipe(s3Upload);
 *
 * The callback fires exactly once, after enough bytes have been
 * accumulated (or end of stream). The bytes accumulated so far are
 * forwarded downstream immediately after the callback fires so the
 * S3 upload receives a complete stream.
 *
 * The callback is async so callers can `await` the sniff result
 * before deciding whether to abort the upload pipeline.
 */
export class MagicByteSniffer extends Transform {
  private readonly targetSize: number;
  private readonly onResult: (mime: string | undefined) => Promise<void>;
  private buffer = Buffer.alloc(0);
  private sniffing = true;
  private emitted = false;

  constructor(
    targetSize: number,
    onResult: (mime: string | undefined) => Promise<void>,
  ) {
    super();
    this.targetSize = targetSize;
    this.onResult = onResult;
  }

  override _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null, data?: Buffer) => void,
  ): void {
    if (this.sniffing) {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      if (this.buffer.length >= this.targetSize) {
        this.sniffing = false;
        void this.runSniff().then(() => callback(), callback);
        return;
      }
      callback();
    } else {
      this.push(chunk);
      callback();
    }
  }

  override _flush(callback: (error?: Error | null) => void): void {
    if (this.sniffing && this.buffer.length > 0) {
      this.sniffing = false;
      void this.runSniff().then(() => callback(), callback);
    } else {
      callback();
    }
  }

  private async runSniff(): Promise<void> {
    if (this.emitted) return;
    this.emitted = true;
    const mime = await sniffContentType(this.buffer);
    // Forward accumulated bytes before invoking callback so S3
    // receives the stream prefix without waiting for validation.
    this.push(this.buffer);
    await this.onResult(mime);
  }
}

// ── Streaming size guard ───────────────────────────────────────────────

export class ByteCountingStream extends Transform {
  bytes = 0;

  override _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null, data?: Buffer) => void,
  ): void {
    this.bytes += chunk.length;
    this.push(chunk);
    callback();
  }
}