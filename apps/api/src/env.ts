import { z } from 'zod';

/**
 * Centralised, validated environment configuration for the API.
 *
 * The schema is intentionally strict for required values so the process
 * fails fast on boot rather than failing mid-request when a downstream
 * library dereferences a missing secret. Optional values are listed here
 * even when unused so they are documented in one place; adding the SMTP
 * or R2 clients later will not require touching this file.
 */
// Helper: treat empty/whitespace strings as undefined for optional fields.
// Lets `.env.example` placeholders (e.g. `SMTP_HOST=`) be pasted into a
// dashboard or `.env` file without breaking boot.
const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalPositiveInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().positive().optional(),
);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // z.coerce lets PORT arrive as a string from process.env while still
  // being typed and validated as a number downstream.
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (v) => v.startsWith('postgres://') || v.startsWith('postgresql://'),
      'DATABASE_URL must be a postgres:// or postgresql:// URL',
    ),

  SESSION_SECRET: z
    .string()
    .min(1, 'SESSION_SECRET is required')
    .refine((v) => v.trim().length > 0, 'SESSION_SECRET must not be blank'),

  INTERNAL_API_KEY: z
    .string()
    .min(1, 'INTERNAL_API_KEY is required')
    .refine((v) => v.trim().length > 0, 'INTERNAL_API_KEY must not be blank'),

  // Optional — used by POST /enquiries (issue #16).
  SMTP_HOST: optionalString,
  SMTP_PORT: optionalPositiveInt,
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  // Optional — From-address override for outbound mail. When unset, the
  // mail service falls back to SMTP_USER (which most SMTP providers
  // require to be a verified sender anyway). Owners can set this to a
  // dedicated "no-reply@printsbytee.uk" address to keep the From
  // header stable across SMTP credential rotations.
  SMTP_FROM: optionalEmail,
  ENQUIRY_EMAIL: optionalEmail,

  // Optional — used by POST /uploads (issue #22).
  R2_ACCOUNT_ID: optionalString,
  R2_BUCKET: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_PUBLIC_BASE_URL: optionalUrl,
});

export type Env = z.infer<typeof EnvSchema>;

const envInput = Object.fromEntries(
  Object.entries(process.env).filter(([, v]) => v !== ''),
);
const parsed = EnvSchema.safeParse(envInput);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  // Throwing ensures Railway sees a non-zero exit and the deploy fails
  // loudly rather than silently starting with bad config.
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env: Env = parsed.data;