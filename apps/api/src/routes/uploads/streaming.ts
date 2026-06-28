import { Readable } from 'node:stream';

import type Busboy from 'busboy';

import type { UploadResponse } from '@printsbytee/shared';

import {
  createR2Client,
  getR2Config,
  joinPublicUrl,
  uploadObject,
} from '../../services/r2.js';

import {
  ByteCountingStream,
  buildUploadKey,
  canonicaliseContentType,
  isAllowedContentType,
  MagicByteSniffer,
  SNIFF_BYTES,
} from './helpers.js';

/**
 * Internal orchestration for the `POST /uploads` route: wire busboy
 * to the S3 `Upload` and resolve once the FIRST terminal outcome
 * (success, parse error, missing file, bad content-type, bad-magic,
 * oversize, or multi-file) has been observed.
 *
 * Split out from `handlers/create.ts` so the handler body stays
 * focused on the wire shape and the orchestration here can be
 * reasoned about (and unit-tested) in isolation. Everything in this
 * file is `POST /uploads`-specific; nothing is exported to other
 * modules.
 *
 * Magic-byte sniffing:
 *   After the multipart Content-Type header passes the allowlist
 *   check, a `MagicByteSniffer` Transform reads the first
 *   `SNIFF_BYTES` of the file stream and passes them to
 *   `fileTypeFromBuffer`. The sniffed type is compared against the
 *   allowlist. If it doesn't match (or is unknown/undefined), the
 *   upload is rejected with 415 even if the `Content-Type` header
 *   was valid. This closes the polyglot-file attack vector.
 */

export type UploadOutcome =
  | { kind: 'success'; response: UploadResponse }
  | { kind: 'no-file' }
  | { kind: 'bad-type'; contentType: string }
  | { kind: 'bad-magic'; detectedMime: string | undefined }
  | { kind: 'too-large' }
  | { kind: 'multi-file' }
  | { kind: 'parse-error'; message: string };

type ResolvedR2Config = NonNullable<ReturnType<typeof getR2Config>>;

export async function runUpload(
  busboy: Busboy.Busboy,
  body: Readable,
  r2Config: ResolvedR2Config,
): Promise<UploadOutcome> {
  return new Promise<UploadOutcome>((resolve, reject) => {
    let fileSeen = 0;
    let settled = false;

    const settle = (outcome: UploadOutcome): void => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    busboy.on('file', (_fieldName: string, fileStream: Readable, info: Busboy.FileInfo) => {
      fileSeen += 1;
      if (fileSeen > 1) {
        fileStream.resume();
        settle({ kind: 'multi-file' });
        return;
      }

      const rawType = info.mimeType;
      if (!isAllowedContentType(rawType)) {
        fileStream.resume();
        settle({ kind: 'bad-type', contentType: rawType });
        return;
      }

      const contentType = canonicaliseContentType(rawType);

      // Pipeline: fileStream → sniffer → counter → S3
      const counter = new ByteCountingStream();
      const sniffer = new MagicByteSniffer(SNIFF_BYTES, async (sniffedMime: string | undefined) => {
        if (!isAllowedContentType(sniffedMime)) {
          // Sniff failed: unknown type or type not in allowlist.
          // Drain the remainder of the file stream so busboy completes.
          fileStream.resume();
          settle({ kind: 'bad-magic', detectedMime: sniffedMime });
        }
      });

      // busboy emits `limit` when the fileSize cap is hit.
      fileStream.on('limit', () => {
        settle({ kind: 'too-large' });
      });

      fileStream.pipe(sniffer).pipe(counter);

      const client = createR2Client(r2Config);
      const key = buildUploadKey(contentType);

      uploadObject(client, r2Config.bucket, key, contentType, counter)
        .then(() => {
          settle({
            kind: 'success',
            response: {
              url: joinPublicUrl(r2Config.publicBaseUrl, key),
              contentType,
              size: counter.bytes,
            },
          });
        })
        .catch((err: unknown) => {
          reject(err instanceof Error ? err : new Error(String(err)));
        });
    });

    busboy.on('close', () => {
      if (fileSeen === 0) {
        settle({ kind: 'no-file' });
      }
    });

    busboy.on('error', (err: unknown) => {
      settle({
        kind: 'parse-error',
        message: err instanceof Error ? err.message : String(err),
      });
    });

    body.on('error', (err: unknown) => {
      reject(err instanceof Error ? err : new Error(String(err)));
    });

    body.pipe(busboy);
  });
}