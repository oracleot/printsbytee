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
} from './helpers.js';

/**
 * Internal orchestration for the `POST /uploads` route: wire busboy
 * to the S3 `Upload` and resolve once the FIRST terminal outcome
 * (success, parse error, missing file, bad content-type, oversize,
 * or multi-file) has been observed.
 *
 * Split out from `handlers/create.ts` so the handler body stays
 * focused on the wire shape and the orchestration here can be
 * reasoned about (and unit-tested) in isolation. Everything in this
 * file is `POST /uploads`-specific; nothing is exported to other
 * modules.
 *
 * Why a Promise rather than streaming-style callbacks: every outcome
 * settles exactly once, the inner code reads linearly, and the
 * caller `await`s a discriminated union — TypeScript narrows the
 * rest of the handler without nested `if` ladders.
 */

export type UploadOutcome =
  | { kind: 'success'; response: UploadResponse }
  | { kind: 'no-file' }
  | { kind: 'bad-type'; contentType: string }
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
    // `settled` guards against double-resolve. busboy can fire both
    // `close` (drain complete) and `error` for malformed envelopes;
    // the first terminal event wins.
    let settled = false;

    const settle = (outcome: UploadOutcome): void => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    busboy.on('file', (_fieldName: string, fileStream: Readable, info: Busboy.FileInfo) => {
      fileSeen += 1;
      if (fileSeen > 1) {
        // Drain the extra stream so busboy still completes, but
        // reject the request as malformed (the contract is exactly
        // one file part).
        fileStream.resume();
        settle({ kind: 'multi-file' });
        return;
      }

      const rawType = info.mimeType;
      if (!isAllowedContentType(rawType)) {
        // Drain so busboy advances; map to 415 in the caller.
        fileStream.resume();
        settle({ kind: 'bad-type', contentType: rawType });
        return;
      }

      const contentType = canonicaliseContentType(rawType);

      // Count bytes as the file flows from busboy into S3.
      const counter = new ByteCountingStream();
      fileStream.pipe(counter);

      // busboy emits `limit` when the fileSize cap is hit.
      // The counter still sees every byte busboy emitted; S3
      // receives less than `UPLOAD_MAX_BYTES` because busboy
      // stopped producing. We translate that to 413.
      fileStream.on('limit', () => {
        settle({ kind: 'too-large' });
      });

      const client = createR2Client(r2Config);
      const key = buildUploadKey(contentType);

      // Drive the S3 upload. A failure here rejects the outer
      // promise, which the handler re-throws into the global
      // error path (500 INTERNAL_ERROR).
      uploadObject(client, r2Config.bucket, key, contentType, counter)
        .then(() => {
          settle({
            kind: 'success',
            response: {
              url: joinPublicUrl(r2Config.publicBaseUrl, key),
              contentType,
              // Counter increments before `push()`, so `bytes` is
              // accurate to what busboy emitted — i.e. what S3
              // stored. For a `truncated` upload this is below
              // `UPLOAD_MAX_BYTES`, but the `limit` handler
              // already short-circuited that case to 413.
              size: counter.bytes,
            },
          });
        })
        .catch((err: unknown) => {
          reject(err instanceof Error ? err : new Error(String(err)));
        });
    });

    busboy.on('close', () => {
      // The entire body has been consumed. If no `file` event fired,
      // the client sent a multipart envelope without a `file` part.
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

    // Pipe errors (e.g. client disconnects mid-upload) reject the
    // outer promise so the handler re-throws into the global error
    // path (500).
    body.on('error', (err: unknown) => {
      reject(err instanceof Error ? err : new Error(String(err)));
    });

    body.pipe(busboy);
  });
}