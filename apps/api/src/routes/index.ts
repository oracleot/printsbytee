import { Hono } from 'hono';

import { productsRouter } from './products.js';

/**
 * Mount point for every API route module.
 *
 * Each module (`./products.ts`, future `./auth.ts`, `./batches.ts`, …)
 * exports a Hono subapp so it can be developed and (eventually)
 * integration-tested in isolation. This file is the single place those
 * subapps get attached to the top-level app — see `app.ts`.
 *
 * Later issues (I15 waitlist, I16 enquiries, I20 auth, …) will add their
 * own `app.route('/...', ...)` lines here. That is expected — the owner
 * resolves conflicts across parallel branches at merge time.
 */
export const routes = new Hono();

routes.route('/products', productsRouter);
