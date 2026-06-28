import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
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
/**
 * Global body-size cap: 500 KB per request.
 *
 * The `bodyLimit` middleware returns 413 `PAYLOAD_TOO_LARGE`
 * automatically when the raw body exceeds this limit before any
 * handler runs. Per-route tighter limits (e.g. 256 KB for product
 * writes) are applied inline in the route handlers.
 *
 * Conservative starting point. Raise if real payloads approach the
 * cap; note that any raise must be accompanied by a review of the
 * busboy `fileSize` limit in `routes/uploads/handlers/create.ts`.
 */
export const app = new Hono();

// Global body limit — applied before every route handler.
// 500 KB = 500 * 1024 bytes. Hono returns 413 automatically on overflow.
app.use(bodyLimit({ maxSize: 500 * 1024 }));

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