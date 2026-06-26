import { Hono } from 'hono';
import { HealthResponseSchema, type HealthResponse } from '@printsbytee/shared';

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