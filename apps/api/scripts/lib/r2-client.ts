/**
 * Thin re-export shim around `apps/api/src/services/r2.ts`.
 *
 * The R2 client + helpers used to live in this file because the I13
 * migration script was the only consumer. I22 (`POST /uploads`) is
 * the new primary consumer and lives under `apps/api/src/` so it
 * can rely on the env-driven `getR2Config()` helper (which pulls
 * from `apps/api/src/env.ts` and is not reachable from the scripts
 * directory without dragging in the API's full env schema).
 *
 * The I13 migration script (`scripts/upload-website-images-to-r2.ts`)
 * imports from `./lib/r2-client.ts` directly, so this file is kept
 * as a re-export shim with the same surface (`createR2Client`,
 * `headObject`, `uploadObject`, plus the `R2Config` and
 * `UploadResult` types). No behavioural changes — the SDK calls
 * resolve to the same modules either way.
 */
export {
  createR2Client,
  headObject,
  uploadObject,
  type R2Config,
  type UploadResult,
} from '../../src/services/r2.js';