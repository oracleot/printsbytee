import { Hono } from 'hono';
import { HealthResponseSchema, type HealthResponse } from '@printsbytee/shared';

/**
 * Hono application for the PrintsbyTee API.
 *
 * The first deployable slice only needs GET /health for the Railway
 * health check. All real endpoints (products, batches, auth, etc.)
 * land in later issues per `docs/plan.md`.
 */
export const app = new Hono();

app.get('/health', (c) => {
  // Parse through the shared schema so the response shape is enforced
  // at runtime and stays in lockstep with @printsbytee/shared.
  const response: HealthResponse = HealthResponseSchema.parse({ status: 'ok' });
  return c.json(response);
});

app.notFound((c) => {
  // Match the error envelope documented in `docs/api-surface.md`.
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: `No route for ${c.req.method} ${c.req.path}`,
      },
    },
    404,
  );
});