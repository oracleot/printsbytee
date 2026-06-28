import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import {
  CreateEnquiryRequestSchema,
  EnquirySchema,
  ErrorResponseSchema,
  type Enquiry,
} from '@printsbytee/shared';

import { env } from '../env.js';
import { db } from '../db/client.js';
import { enquiries } from '../db/schema/leads.js';
import { requireInternalApiKey } from '../middleware/requireInternalApiKey.js';
import { sendEnquiryNotification } from '../services/mail.js';

export const enquiriesApp = new Hono();

/**
 * POST /enquiries — submit a contact-form enquiry.
 *
 * @internal — requires INTERNAL_API_KEY (Bearer token) in the
 * Authorization header. Direct public access is blocked; only the
 * website's proxies (which carry the key) can submit.
 *
 * Body: { name, email, productId?, message }
 * 201: { Enquiry }  — including server-generated id + createdAt
 * 400: { error: { code: "VALIDATION_ERROR", message, details } }
 *
 * SMTP behaviour (issue #16 acceptance criterion):
 *   The enquiry row is persisted FIRST. Only then is the SMTP
 *   notification attempted. The mail service is best-effort and never
 *   throws — a failed send is logged but does not affect the HTTP
 *   response, so the enquiry is durable regardless of mail outcome.
 */
enquiriesApp.post('/', bodyLimit({ maxSize: 64 * 1024 }), requireInternalApiKey(env.INTERNAL_API_KEY), async (c) => {
  // ── Validate request body ────────────────────────────────────────────────
  // Hono throws a `SyntaxError` from `c.req.json()` when the body is
  // not valid JSON. Surface that as a 400 with the same error envelope
  // the schema-parse path uses so clients only have to handle one
  // shape. Anything else (e.g. an upstream body-size limit) is re-thrown
  // so the global handler sees it instead of being masked as a parse
  // failure.
  let body: unknown;
  try {
    body = await c.req.json();
  } catch (err: unknown) {
    if (!(err instanceof SyntaxError)) throw err;
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body must be valid JSON',
        },
      }),
      400,
    );
  }

  const parsed = CreateEnquiryRequestSchema.safeParse(body);
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

  const { name, email, productId, message } = parsed.data;

  // ── Persist to DB ───────────────────────────────────────────────────────
  // Postgres error codes we explicitly translate to API responses.
  // 23503 = foreign_key_violation — the referenced productId does not exist.
  // 23502 = not_null_violation — defensive; schema marks fields NOT NULL.
  const PG_FK_VIOLATION = '23503';
  const PG_NOT_NULL_VIOLATION = '23502';

  let row: Enquiry;
  try {
    const [inserted] = await db
      .insert(enquiries)
      .values({
        name,
        email,
        // productId is nullable in the schema (general vs. product-specific
        // enquiries); undefined here means "no specific product".
        ...(productId !== undefined ? { productId } : {}),
        message,
      })
      .returning();

    // Drizzle returns `createdAt` as a JS `Date`, but `EnquirySchema`
    // declares it as an ISO string (isoTimestampSchema). Serialise
    // before validating so the parse doesn't reject our own insert —
    // previously this throw surfaced the success path as 500 instead of
    // 201. The same object is reused for the mail body so the operator
    // sees the same timestamp in both the API response and the
    // notification email.
    row = EnquirySchema.parse({
      ...inserted,
      createdAt: inserted.createdAt.toISOString(),
    });
  } catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgCode = (err as any)?.code as string | undefined;

    if (pgCode === PG_FK_VIOLATION) {
      // productId did not match any product. Surface as a validation
      // error so the client can correct it, matching the rest of the
      // API's pre-201-failure shape.
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'productId does not match any product',
            details: { productId },
          },
        }),
        400,
      );
    }

    if (pgCode === PG_NOT_NULL_VIOLATION) {
      // Should be unreachable thanks to Zod validation, but keep a
      // tight contract instead of masking as 500.
      return c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required field',
          },
        }),
        400,
      );
    }

    // Anything else is unexpected — let the global error handler see it.
    throw err;
  }

  // ── SMTP notification (best-effort, never fails the request) ────────────
  // Persisted first so the enquiry is durable even if the mail layer
  // throws or times out. Awaited to settle logs before responding.
  await sendEnquiryNotification(row);

  return c.json(row, 201);
});
