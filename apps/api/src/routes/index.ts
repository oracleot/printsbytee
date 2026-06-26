import { Hono } from 'hono';

import { productsRouter } from './products.js';
import { authApp } from './auth.js';

/**
 * Mount point for every API route module.
 *
 * Each module (`./products.ts`, `./auth.ts`, future `./batches.ts`, …)
 * exports a Hono subapp so it can be developed and (eventually)
 * integration-tested in isolation. This file is the single place those
 * subapps get attached to the top-level app — see `app.ts`.
 *
 * Later issues (I15 waitlist, I16 enquiries, I23 batches, I24 items,
 * I25 sales, …) will add their own `app.route('/...', ...)` lines here.
 * That is expected — the owner resolves conflicts across parallel
 * branches at merge time.
 */
export const routes = new Hono();

routes.route('/products', productsRouter);
routes.route('/auth', authApp);
