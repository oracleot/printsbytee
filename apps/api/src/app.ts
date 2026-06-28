import { Hono } from 'hono';
import { HealthResponseSchema, type HealthResponse } from '@printsbytee/shared';

import { env } from './env.js';
import { routes } from './routes/index.js';

/**
 * Hono application for the PrintsbyTee API.
 *
 * - `GET /health` lives inline because it is the Railway health probe and
 *   must remain cheap and side-effect-free even if downstream modules
 *   (db, route modules) are still loading.
 * - All real endpoints are mounted under `/...` from `./routes/index.ts`,
 *   which is the single registration point for every feature module
 *   (products, batches, auth, etc.). Adding a module means editing
 *   `routes/index.ts`, not this file.
 * - Error responses follow the envelope documented in
 *   `docs/api-surface.md` ("Error format"): unknown routes return 404
 *   via `app.notFound`, and any uncaught error thrown from a handler
 *   (DB outage, programming bug, etc.) returns 500 via `app.onError`.
 *   Without `app.onError`, an unhandled throw would fall off the
 *   documented envelope and surface Hono's default text response,
 *   which downstream consumers are not built to parse.
 */
export const app = new Hono();

/**
 * M6 LOW-1: Security headers middleware.
 *
 * Applied to every response from the API server:
 * - X-Content-Type-Options: nosniff         — always (backend, not embedded in frames)
 * - Referrer-Policy: strict-origin-when-cross-origin  — always
 * - Strict-Transport-Security: production only (Vercel → Railway is HTTPS)
 *
 * X-Frame-Options is intentionally omitted — it is a browser directive
 * that only applies when the response is rendered inside a <frame>, <iframe>,
 * or <object>. The API never serves HTML and is not embedded in frames,
 * so the header has no effect and is excluded per the audit recommendation.
 */
app.use("*", async (c, next) => {
  await next();
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (env.NODE_ENV === "production") {
    c.res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
});

app.get('/health', (c) => {
  // Parse through the shared schema so the response shape is enforced
  // at runtime and stays in lockstep with @printsbytee/shared.
  const response: HealthResponse = HealthResponseSchema.parse({ status: 'ok' });
  return c.json(response);
});

app.route('/', routes);

app.notFound((c) => {
  // Match the error envelope documented in `docs/api-surface.md`.
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    },
    404,
  );
});

/**
 * Catch-all for anything a route handler (or middleware) throws — DB
 * outages, programming bugs, failed Zod parses on the wire shape, etc.
 * Without this, Hono's default 500 body leaks through and bypasses the
 * `docs/api-surface.md` error envelope.
 *
 * Production-mode message is a fixed "Internal server error" string —
 * matching the existing error-code naming convention and avoiding any
 * leak of internals (stack traces, DB driver messages, file paths) to
 * the client. In non-production environments we surface `err.message`
 * so the developer still gets a useful signal in logs and on the wire.
 */
app.onError((err, c) => {
  // Log the full error server-side for observability, but return a
  // generic message to the client to avoid leaking internals.
  // eslint-disable-next-line no-console
  console.error('[api] unhandled error', err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message:
          env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      },
    },
    500,
  );
});