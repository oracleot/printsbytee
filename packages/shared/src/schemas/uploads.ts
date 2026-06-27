import { z } from 'zod';

/**
 * Wire shape for `POST /uploads` (I22).
 *
 * Returned by the API after a successful multipart upload to R2.
 *
 *   - `url`         — the absolute public URL of the stored object.
 *                     Built server-side as
 *                     `${R2_PUBLIC_BASE_URL}/${key}` and surfaced
 *                     verbatim so the business app can persist it
 *                     on a Product row without further munging.
 *   - `contentType` — the MIME type sent to R2 (`image/jpeg` etc.).
 *                     Mirrors the request's `file` part
 *                     `Content-Type` header and is constrained to
 *                     the documented allowlist on the route
 *                     (see `apps/api/src/routes/uploads/helpers.ts`).
 *   - `size`        — the byte length of the uploaded object
 *                     (positive integer). Sourced from the S3
 *                     `ContentLength` of the PUT response where
 *                     available so the number reflects what was
 *                     actually stored, not just what the client
 *                     claimed in the request.
 */
export const UploadResponseSchema = z.object({
  url: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

export type UploadResponse = z.infer<typeof UploadResponseSchema>;