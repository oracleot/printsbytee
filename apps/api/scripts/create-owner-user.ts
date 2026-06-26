#!/usr/bin/env node
/**
 * I20 — Create (or rotate the password of) the single owner account.
 *
 * PURPOSE
 *   The API ships with no owner user out of the box — the row has to
 *   exist before anyone can log in. This script:
 *
 *     1. Reads `OWNER_EMAIL` and `OWNER_PASSWORD` from env.
 *     2. Hashes the password with bcrypt (cost 12, see
 *        `src/services/passwords.ts`).
 *     3. Upserts a row in `users` keyed by `email`:
 *        - first run   → INSERTs the owner
 *        - later runs  → UPDATEs `password_hash` (the table has no
 *          `updated_at` per `docs/data-model.md`, so the existing
 *          `created_at` stays)
 *
 *   Re-running is the documented "rotate the owner password" path.
 *   Existing sessions are NOT invalidated here — if the operator
 *   wants to force-log-everyone-out after a password change, they
 *   can additionally `DELETE FROM sessions` after this script.
 *
 * SECURITY
 *   `OWNER_PASSWORD` is a plaintext secret and must NEVER be
 *   committed to disk, pasted into chat, or echoed to logs. This
 *   script:
 *     - reads it from env, not argv (so it does not show up in
 *       `ps`/process listings),
 *     - never logs it (the only stdout line that mentions the
 *       password is the bcrypt digest prefix, not the plaintext).
 *
 * OWNER INVOCATION
 *   The script connects to Postgres via the same `db` client as the
 *   API, so it inherits `DATABASE_URL` from the shell that runs it.
 *   Locally:
 *
 *     export DATABASE_URL="postgresql://user:password@localhost:5432/printsbytee"
 *     export OWNER_EMAIL="owner@example.com"
 *     export OWNER_PASSWORD="$(openssl rand -base64 24)"
 *     pnpm --filter @printsbytee/api create:owner
 *
 *   On Railway, tunnel into the running container so the env is the
 *   service's own (same pattern as `import:products`):
 *
 *     railway ssh --service api -- \
 *       OWNER_EMAIL="owner@example.com" \
 *       OWNER_PASSWORD="$(openssl rand -base64 24)" \
 *       pnpm --filter @printsbytee/api create:owner
 *
 *   After running, clear the password from the local shell history:
 *
 *     unset OWNER_PASSWORD
 *     history -d <offset>      # bash
 *     fc -p                     # zsh
 */
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db, pool } from '../src/db/client.js';
import { users } from '../src/db/schema/auth.js';
import { hashPassword } from '../src/services/passwords.js';

// Treat empty strings as undefined so `.env.example` placeholders
// don't silently turn into a malformed-account attempt.
const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

const SeedEnvSchema = z.object({
  // Lowercased to match the API layer's login path, so creating the
  // user and then logging in are guaranteed to hit the same row
  // regardless of how the owner types the email later.
  OWNER_EMAIL: z.preprocess(
    emptyToUndefined,
    z.string().email().transform((v) => v.trim().toLowerCase()),
  ),
  // Plaintext password from the operator's shell. Minimum length is
  // an opinionated guardrail — bcrypt itself accepts any non-empty
  // string, but anything under 8 characters is a typo, not a
  // credential.
  OWNER_PASSWORD: z.preprocess(
    emptyToUndefined,
    z.string().min(8, 'OWNER_PASSWORD must be at least 8 characters'),
  ),
});

type SeedEnv = z.infer<typeof SeedEnvSchema>;

function loadEnv(): SeedEnv {
  const parsed = SeedEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid owner-seed environment configuration:\n${issues}\n` +
        `Set OWNER_EMAIL and OWNER_PASSWORD in the shell before running ` +
        `\`pnpm --filter @printsbytee/api create:owner\`.`,
    );
  }
  return parsed.data;
}

async function main(): Promise<void> {
  const { OWNER_EMAIL, OWNER_PASSWORD } = loadEnv();

  const passwordHash = await hashPassword(OWNER_PASSWORD);

  // Upsert by email: insert if missing, otherwise replace the hash so
  // the documented "rotate password" path is the same command as the
  // "create owner" path.
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, OWNER_EMAIL))
    .limit(1);

  if (existing.length === 0) {
    const [row] = await db
      .insert(users)
      .values({ email: OWNER_EMAIL, passwordHash })
      .returning({ id: users.id, createdAt: users.createdAt });
    console.log(
      `[create-owner] Inserted owner user ${row.id} (${OWNER_EMAIL}) ` +
        `at ${row.createdAt.toISOString()}.`,
    );
  } else {
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.email, OWNER_EMAIL));
    console.log(
      `[create-owner] Updated password hash for existing owner ${OWNER_EMAIL} ` +
        `(id ${existing[0].id}). Existing sessions remain valid until they ` +
        `expire or are deleted; run \`DELETE FROM sessions\` to force-logout.`,
    );
  }
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(`[create-owner] Fatal: ${(err as Error).message}`);
    try {
      await pool.end();
    } catch {
      /* pool may not have been constructed */
    }
    process.exit(1);
  });