import { Hono } from 'hono';

import {
  CreateWaitlistRequestSchema,
  ErrorResponseSchema,
  WaitlistEntrySchema,
} from '@printsbytee/shared';

import { env } from '../env.js';
import { db } from '../db/client.js';
import { waitlistEntries } from '../db/schema/leads.js';
import { requireInternalApiKey } from '../middleware/requireInternalApiKey.js';

// Postgres unique-violation error code for the (productId, email) constraint.
const PG_UNIQUE_VIOLATION = '23505';
// Postgres FK-violation error code (referenced productId doesn't exist).
const PG_FK_VIOLATION = '23503';

/** Narrow a caught error to a Postgres-dictionary error object. */
function isPgError(e: unknown): e is { code: string } {
  return typeof e === 'object' && e !== null && typeof (e as Record<string, unknown>).code === 'string';
}

export const waitlistApp = new Hono();

/**
 * POST /waitlist — join a product waitlist.
 *
 * @internal — requires INTERNAL_API_KEY (Bearer token) in the
 * Authorization header. Direct public access is blocked; only the
 * website's proxies (which carry the key) can submit.
 *
 * Body: { productId: string, email: string }
 * 201: { WaitlistEntry }  — including server-generated id + createdAt
 * 400: { error: { code: "VALIDATION_ERROR", message, details } }
 * 409: { error: { code: "CONFLICT", message } }  — duplicate (productId, email)
 */
waitlistApp.post('/', requireInternalApiKey(env.INTERNAL_API_KEY), async (c) => {
  // ── Parse JSON body (gracefully handle malformed input) ─────────────────
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      ErrorResponseSchema.parse({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' },
      }),
      400,
    );
  }

  // ── Validate request body ────────────────────────────────────────────────
  const parsed = CreateWaitlistRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      }),
      400,
    );
  }

  const { productId, email } = parsed.data;

  // ── Persist to DB ───────────────────────────────────────────────────────
  try {
    const [row] = await db
      .insert(waitlistEntries)
      .values({ productId, email })
      .returning();

    // Drizzle returns a JS Date for createdAt; serialize to ISO string so
    // the response matches the WaitlistEntrySchema contract (isoTimestampSchema).
    return c.json(WaitlistEntrySchema.parse({ ...row, createdAt: row.createdAt.toISOString() }), 201);
  } catch (err: unknown) {
    // Catch Postgres unique-violation for (productId, email) → 409 CONFLICT.
    if (isPgError(err) && err.code === PG_UNIQUE_VIOLATION) {
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'CONFLICT',
            message: 'Already on the waitlist for this product',
          },
        }),
        409,
      );
    }

    // Unknown productId (FK violation) → 400 VALIDATION_ERROR.
    if (isPgError(err) && err.code === PG_FK_VIOLATION) {
      return c.json(
        ErrorResponseSchema.parse({
          error: { code: 'VALIDATION_ERROR', message: 'Unknown productId' },
        }),
        400,
      );
    }

    // Re-throw anything else so the global error handler / middleware can
    // catch it — do not swallow unexpected DB errors.
    throw err;
  }
});
