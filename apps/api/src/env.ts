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
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  ENQUIRY_EMAIL: z.string().email().optional(),

  // Optional — used by POST /uploads (issue #22).
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
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