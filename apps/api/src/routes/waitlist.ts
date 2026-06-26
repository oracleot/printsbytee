import { Hono } from 'hono';

import {
  CreateWaitlistRequestSchema,
  ErrorResponseSchema,
  WaitlistEntrySchema,
} from '@printsbytee/shared';

import { db } from '../db/client.js';
import { waitlistEntries } from '../db/schema/leads.js';

// Postgres unique-violation error code for the (productId, email) constraint.
const PG_UNIQUE_VIOLATION = '23505';

export const waitlistApp = new Hono();

/**
 * POST /waitlist — join a product waitlist.
 *
 * @public — no auth required per docs/api-surface.md.
 *
 * Body: { productId: string, email: string }
 * 201: { WaitlistEntry }  — including server-generated id + createdAt
 * 400: { error: { code: "VALIDATION_ERROR", message, details } }
 * 409: { error: { code: "CONFLICT", message } }  — duplicate (productId, email)
 */
waitlistApp.post('/', async (c) => {
  // ── Validate request body ────────────────────────────────────────────────
  const body = await c.req.json();
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

    return c.json(WaitlistEntrySchema.parse(row), 201);
  } catch (err: unknown) {
    // Catch Postgres unique-violation for (productId, email) → 409 CONFLICT.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgCode = (err as any)?.code as string | undefined;

    if (pgCode === PG_UNIQUE_VIOLATION) {
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

    // Re-throw anything else so the global error handler / middleware can
    // catch it — do not swallow unexpected DB errors.
    throw err;
  }
});
