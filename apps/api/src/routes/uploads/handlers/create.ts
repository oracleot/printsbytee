import { Readable } from 'node:stream';

import type { Context } from 'hono';
import Busboy from 'busboy';

import {
  ErrorResponseSchema,
  UploadResponseSchema,
  type UploadResponse,
} from '@printsbytee/shared';

import { getR2Config } from '../../../services/r2.js';
import type { AppEnv } from '../../../types.js';

import {
  badMagicResponse,
  fileRequiredResponse,
  payloadTooLargeResponse,
  r2UnconfiguredResponse,
  unsupportedMediaTypeResponse,
} from '../errors.js';
import { UPLOAD_MAX_BYTES } from '../helpers.js';

import { runUpload } from '../streaming.js';

/**
 * `POST /uploads` — accept a multipart file upload, stream it to R2,
 * and return the public URL + content metadata.
 *
 *   200 { url, contentType, size }             — uploaded
 *   400 { error: VALIDATION_ERROR }            — request was not
 *                                                multipart, the body
 *                                                was unparseable, or
 *                                                the `file` part was
 *                                                absent / more than
 *                                                one was sent
 *   401 { error: UNAUTHORIZED }                — from requireSession
 *   413 { error: PAYLOAD_TOO_LARGE }           — file > 10 MB
 *                                                (busboy's `fileSize`
 *                                                limit enforces this
 *                                                mid-stream)
 *   415 { error: UNSUPPORTED_MEDIA_TYPE }      — content-type not in
 *                                                the documented
 *                                                allowlist (JPG /
 *                                                PNG / WebP / AVIF)
 *   503 { error: SERVICE_UNAVAILABLE }         — R2 env vars missing
 *   500 { error: INTERNAL_ERROR }              — uncaught (handled
 *                                                globally in `app.ts`)
 *
 * Multipart parsing: `busboy` (https://github.com/mscdex/busboy).
 * The plan permits "a lightweight library" — busboy is the de-facto
 * streaming multipart parser for Node (Express's body-parser /
 * multer sit on top of it), zero runtime deps, and the only library
 * needed to stream the `file` part directly into
 * `@aws-sdk/lib-storage`'s `Upload` without buffering. We use it
 * instead of Hono's built-in `c.req.parseBody()` /
 * `c.req.formData()` because those buffer the entire body in memory
 * before any handler code runs, defeating the streaming contract.
 *
 * Size cap: enforced at the parser via `busboy.limits.fileSize =
 * UPLOAD_MAX_BYTES` (10 MB). busboy emits a `limit` event on the
 * file stream when the cap is hit; `streaming.ts#runUpload` maps
 * that to 413 PAYLOAD_TOO_LARGE.
 *
 * Byte-count for the wire `size`: counted client-side by a
 * `ByteCountingStream` `Transform` that wraps the busboy file
 * stream before it reaches the S3 `Upload`. See
 * `apps/api/src/routes/uploads/helpers.ts` for the rationale.
 */
export async function createUpload(c: Context<AppEnv>): Promise<Response> {
  // 1. R2 must be configured before we start parsing the body. If
  //    any required R2 var is missing, short-circuit with 503 —
  //    there is no point reading 10 MB from the client only to fail
  //    mid-upload.
  const r2Config = getR2Config();
  if (!r2Config) return r2UnconfiguredResponse();

  // 2. The Content-Type header MUST be multipart/form-data with a
  //    boundary parameter. Anything else (incl. a missing header) is
  //    a client bug — return 400 so we never hand the body to
  //    busboy with the wrong framing.
  const requestContentType = c.req.header('content-type');
  if (
    !requestContentType ||
    !requestContentType.toLowerCase().startsWith('multipart/form-data')
  ) {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request must be multipart/form-data',
        },
      }),
      400,
    );
  }

  // 3. Set up busboy. `headers` is enough to let it pick the right
  //    parser + boundary; we don't need `req` (the request is the
  //    Hono one, not an IncomingMessage). `limits.fileSize` is the
  //    hard 10 MB cap; `limits.files: 1` ensures we never accept a
  //    multi-file payload (the route contract is one file per
  //    request). `limits.fields: 0` discards any non-file fields
  //    silently — there are none in the contract.
  const busboyInstance = Busboy({
    headers: { 'content-type': requestContentType },
    limits: {
      fileSize: UPLOAD_MAX_BYTES,
      files: 1,
      fields: 0,
    },
  });

  // 4. Convert Hono's Web `ReadableStream` body to a Node Readable
  //    so busboy (which speaks Node streams) can consume it. We
  //    intentionally don't call `c.req.parseBody()` /
  //    `c.req.formData()` — those buffer.
  const webBody = c.req.raw.body;
  if (!webBody) {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body is empty',
        },
      }),
      400,
    );
  }
  const nodeBody = Readable.fromWeb(webBody);

  // 5. Drive the parsing. The handler returns the FIRST terminal
  //    outcome (success or one of the documented errors); the
  //    streaming layer (`./streaming.ts`) settles once the body is
  //    consumed. We don't gate the response on busboy's `close`
  //    event so the response can fly as soon as the S3 upload
  //    completes.
  let outcome;
  try {
    outcome = await runUpload(busboyInstance, nodeBody, r2Config);
  } catch {
    // busboy reported an unrecoverable parse error, or the S3
    // upload threw. Re-throw so the global `app.onError` handler
    // turns it into a 500 — keeps the wire shape consistent with
    // every other write endpoint.
    throw new Error('Upload failed');
  }

  if (outcome.kind === 'parse-error') {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Multipart body could not be parsed',
        },
      }),
      400,
    );
  }
  if (outcome.kind === 'multi-file') {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Exactly one file part named "file" is expected',
        },
      }),
      400,
    );
  }
  if (outcome.kind === 'no-file') return fileRequiredResponse();
  if (outcome.kind === 'bad-type') return unsupportedMediaTypeResponse();
  if (outcome.kind === 'bad-magic') return badMagicResponse();
  if (outcome.kind === 'too-large') return payloadTooLargeResponse();
  if (outcome.kind === 'success') {
    return c.json(
      UploadResponseSchema.parse(outcome.response satisfies UploadResponse),
      200,
    );
  }

  // Exhaustiveness guard — TypeScript should narrow this as
  // unreachable, but a belt-and-braces return keeps the function
  // total.
  return c.json(
    ErrorResponseSchema.parse({
      error: { code: 'INTERNAL_ERROR', message: 'Upload outcome fell through' },
    }),
    500,
  );
}