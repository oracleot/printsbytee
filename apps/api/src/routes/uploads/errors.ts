import { ErrorResponseSchema } from '@printsbytee/shared';

import {
  UPLOAD_CONTENT_TYPE_NOT_ALLOWED_MESSAGE,
  UPLOAD_FILE_REQUIRED_MESSAGE,
  UPLOAD_R2_UNCONFIGURED_MESSAGE,
  UPLOAD_TOO_LARGE_MESSAGE,
} from './helpers.js';

/**
 * Canonical error envelopes for `POST /uploads` (I22).
 *
 * Pure `Response` builders that pin the documented wire shape so the
 * handler reads linearly and a future drift between the handler and
 * the shared `ErrorResponseSchema` fails at the edge via `.parse`.
 *
 * The strings themselves are pinned in `helpers.ts` (the unit test
 * `apps/api/scripts/test-uploads-message-pins.ts` asserts them); this
 * file only assembles them into `Response` objects.
 */

export function fileRequiredResponse(): Response {
  const body = ErrorResponseSchema.safeParse({
    error: { code: 'VALIDATION_ERROR', message: UPLOAD_FILE_REQUIRED_MESSAGE },
  });
  return new Response(
    JSON.stringify(body.success ? body.data : { error: { code: 'VALIDATION_ERROR', message: UPLOAD_FILE_REQUIRED_MESSAGE } }),
    { status: 400, headers: { 'content-type': 'application/json' } },
  );
}

export const UPLOAD_BAD_MAGIC_MESSAGE =
  'File content type does not match its actual format';

export function badMagicResponse(): Response {
  const body = ErrorResponseSchema.safeParse({
    error: {
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: UPLOAD_BAD_MAGIC_MESSAGE,
    },
  });
  return new Response(
    JSON.stringify(body.success ? body.data : { error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: UPLOAD_BAD_MAGIC_MESSAGE } }),
    { status: 415, headers: { 'content-type': 'application/json' } },
  );
}

export function unsupportedMediaTypeResponse(): Response {
  const body = ErrorResponseSchema.safeParse({
    error: {
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: UPLOAD_CONTENT_TYPE_NOT_ALLOWED_MESSAGE,
    },
  });
  return new Response(
    JSON.stringify(body.success ? body.data : { error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: UPLOAD_CONTENT_TYPE_NOT_ALLOWED_MESSAGE } }),
    { status: 415, headers: { 'content-type': 'application/json' } },
  );
}

export function payloadTooLargeResponse(): Response {
  const body = ErrorResponseSchema.safeParse({
    error: {
      code: 'PAYLOAD_TOO_LARGE',
      message: UPLOAD_TOO_LARGE_MESSAGE,
    },
  });
  return new Response(
    JSON.stringify(body.success ? body.data : { error: { code: 'PAYLOAD_TOO_LARGE', message: UPLOAD_TOO_LARGE_MESSAGE } }),
    { status: 413, headers: { 'content-type': 'application/json' } },
  );
}

export function r2UnconfiguredResponse(): Response {
  const body = ErrorResponseSchema.safeParse({
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: UPLOAD_R2_UNCONFIGURED_MESSAGE,
    },
  });
  return new Response(
    JSON.stringify(body.success ? body.data : { error: { code: 'SERVICE_UNAVAILABLE', message: UPLOAD_R2_UNCONFIGURED_MESSAGE } }),
    { status: 503, headers: { 'content-type': 'application/json' } },
  );
}