import { serve } from '@hono/node-server';
import { env } from './env.js';
import { app } from './app.js';

// Touch the db client so it is constructed once at boot and any
// DATABASE_URL misconfiguration surfaces here, not on the first request.
import './db/client.js';

const port = env.PORT;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    // eslint-disable-next-line no-console
    console.log(
      `@printsbytee/api listening on http://localhost:${info.port} (${env.NODE_ENV})`,
    );
  },
);