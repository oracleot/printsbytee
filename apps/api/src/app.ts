import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
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
 * Body-size limits are applied per-route via `bodyLimit({ maxSize: N })`
 * in the route registration. Tight caps on JSON writes (products/batches/auth)
 * prevent OOM from a malicious or buggy client. `POST /uploads` is exempt —
 * busboy enforces 10 MB internally via `fileSize`.
 */
export const app = new Hono();

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
  // Pass Hono HTTPExceptions through with their declared status and
  // response — this preserves behaviour for bodyLimit (413), rate-limit
  // (429), and any other thrown Hono-level responses.
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

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