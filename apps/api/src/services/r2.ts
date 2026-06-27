import {
  S3Client,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type { Readable } from 'node:stream';

import { env } from '../env.js';

/**
 * R2 client + helpers, lifted from `apps/api/scripts/lib/r2-client.ts`
 * (the I13 one-shot migration). The same `createR2Client` /
 * `headObject` / `uploadObject` surface is kept so the migration
 * script can re-export these symbols unchanged (see the thin wrapper
 * in `apps/api/scripts/lib/r2-client.ts`) and I22's live upload
 * route can re-use them without duplicating the SDK plumbing.
 *
 * `getR2Config()` is the new bit: it resolves the env-driven
 * `R2Config` from `env.ts`'s *optional* R2 fields. When any
 * required var is missing (or empty) it returns `null`, and the
 * caller is expected to translate that into a documented 503
 * envelope (`UPLOAD_R2_UNCONFIGURED_MESSAGE`). The route never
 * crashes the process on missing creds.
 */
export interface R2Config {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
}

export interface UploadResult {
  etag: string | undefined;
}

const REQUIRED_KEYS: ReadonlyArray<keyof R2Config> = [
  'accountId',
  'bucket',
  'accessKeyId',
  'secretAccessKey',
  'publicBaseUrl',
];

/**
 * Resolve the R2 client configuration from `env.ts`.
 *
 * `env.ts` marks the R2 vars as optional so the API process boots
 * even when the operator hasn't provisioned R2 yet (the I22 route
 * is the only consumer). When any required var is absent, returns
 * `null` so the route can return 503 SERVICE_UNAVAILABLE with the
 * documented message instead of crashing the process on boot or
 * surfacing a 500 mid-request.
 */
export function getR2Config(): R2Config | null {
  const candidate = {
    accountId: env.R2_ACCOUNT_ID,
    bucket: env.R2_BUCKET,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL,
  };
  const missing = REQUIRED_KEYS.filter((k) => !candidate[k]);
  if (missing.length > 0) return null;
  // All five fields are checked above; the explicit cast narrows the
  // `string | undefined` env values to the documented non-optional
  // R2Config shape.
  return candidate as R2Config;
}

/**
 * Trim a trailing slash from a configured base URL so concatenation
 * with a key doesn't double up (`https://x.example//products/y.jpg`).
 * Mirrors `buildPublicUrl` in
 * `apps/api/scripts/lib/image-map.ts` — same pattern, kept here so
 * the route layer does not depend on the scripts directory.
 */
export function joinPublicUrl(publicBaseUrl: string, key: string): string {
  const base = publicBaseUrl.replace(/\/+$/, '');
  return `${base}/${key}`;
}

/**
 * Build an S3-compatible client pointed at Cloudflare R2.
 *
 * R2 endpoints:
 *   - Endpoint: `https://<accountId>.r2.cloudflarestorage.com`
 *   - Region: `auto` (R2 ignores it but the SDK requires the field)
 *   - Path-style addressing is forced because some R2 setups reject
 *     virtual-hosted–style addresses for non-DNS bucket names.
 */
export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

/**
 * HEAD an object. Returns `null` for 404 (key absent) and rethrows for
 * any other failure. R2 surfaces 404s under several SDK error names
 * depending on the auth/path style used, so we match on both name and
 * HTTP status.
 */
export async function headObject(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<HeadObjectCommandOutput | null> {
  try {
    return await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    const code = (err as { name?: string }).name;
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (code === 'NotFound' || code === 'NoSuchKey' || status === 404) return null;
    throw err;
  }
}

/**
 * Stream an object into R2. Uses `@aws-sdk/lib-storage`'s `Upload`
 * helper which transparently does single PUT for small objects and
 * multipart PUT for larger ones. For the I13 migration every file is
 * well under the 5 MB multipart threshold, but keeping the multipart
 * path means the same helper is reusable for I22's live upload
 * endpoint without a rewrite.
 *
 * Public-read access is enabled at the bucket level in the R2
 * dashboard / via the API; we do not set per-object ACLs here.
 */
export async function uploadObject(
  client: S3Client,
  bucket: string,
  key: string,
  contentType: string,
  body: Readable,
): Promise<UploadResult> {
  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    },
  });
  const result = await upload.done();
  return { etag: result.ETag };
}