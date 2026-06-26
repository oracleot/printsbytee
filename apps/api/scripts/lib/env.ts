import { z } from 'zod';

/**
 * Minimal env loader for the migration scripts.
 *
 * We deliberately do NOT import `apps/api/src/env.ts` here: that loader
 * requires `DATABASE_URL`, `SESSION_SECRET`, and `INTERNAL_API_KEY` on
 * boot, none of which are needed to talk to R2. This loader mirrors the
 * field names from `src/env.ts` so the two stay in lockstep — if a new
 * R2 var is added to the API env, add it here too.
 *
 * `requireR2Env()` is called when the script runs for real; `--dry-run`
 * lets the script proceed with missing vars so the operator can preview
 * what would happen before configuring credentials.
 */

// Treat empty/whitespace strings as undefined so `.env.example`
// placeholders don't break the loader.
const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const R2Schema = z.object({
  R2_ACCOUNT_ID: optionalString,
  R2_BUCKET: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_PUBLIC_BASE_URL: optionalUrl,
});

export type R2Env = z.infer<typeof R2Schema>;

const envInput = Object.fromEntries(
  Object.entries(process.env).filter(([, v]) => v !== ''),
);

const parsed = R2Schema.safeParse(envInput);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid R2 environment configuration:\n${issues}`);
}

export const r2Env: R2Env = parsed.data;

const REQUIRED_KEYS: ReadonlyArray<keyof R2Env> = [
  'R2_ACCOUNT_ID',
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_PUBLIC_BASE_URL',
];

export function requireR2Env(): Required<R2Env> {
  const missing = REQUIRED_KEYS.filter((k) => !r2Env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required R2 env vars: ${missing.join(', ')}. ` +
        `Set them in .env / your shell, or pass --dry-run to preview without credentials.`,
    );
  }
  return r2Env as Required<R2Env>;
}