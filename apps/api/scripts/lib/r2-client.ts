import {
  S3Client,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type { Readable } from 'node:stream';

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
      // Public-read access is enabled at the bucket level in the R2
      // dashboard / via the API; we do not set per-object ACLs here.
    },
  });
  const result = await upload.done();
  return { etag: result.ETag };
}