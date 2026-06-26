import * as path from 'node:path';
import {
  ListObjectsV2Command,
  S3Client,
  type ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import { buildPublicUrl } from '../lib/image-map.js';

export const KEY_PREFIX = 'products';

export type ImageMap = ReadonlyMap<string, string>;

/**
 * Paginated `ListObjectsV2` over the `products/` prefix. Builds a
 * basename -> public URL map from the live bucket so we never read
 * the owner's local `.image-map.json`. Paginates with
 * `ContinuationToken` so buckets with >1000 keys are handled
 * correctly.
 */
export async function buildImageMap(
  client: S3Client,
  bucket: string,
  publicBaseUrl: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let token: string | undefined;
  let pages = 0;
  do {
    const res: ListObjectsV2CommandOutput = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `${KEY_PREFIX}/`,
        ContinuationToken: token,
      }),
    );
    pages++;
    for (const obj of res.Contents ?? []) {
      const key = obj.Key;
      if (!key) continue;
      const basename = path.basename(key);
      if (!basename || basename === KEY_PREFIX) continue;
      map.set(basename, buildPublicUrl(publicBaseUrl, key));
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  console.log(
    `[i14] R2 listing: ${map.size} object(s) under ${KEY_PREFIX}/ ` +
      `across ${pages} page(s).`,
  );
  return map;
}