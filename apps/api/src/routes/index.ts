import { Hono } from 'hono';

import { productsRouter } from './products/index.js';
import { batchesRouter } from './batches/index.js';
import { authApp } from './auth.js';
import { waitlistApp } from './waitlist.js';
import { enquiriesApp } from './enquiries.js';

/**
 * Mount point for every API route module.
 *
 * Each module (`./products.ts`, `./batches.ts`, `./auth.ts`,
 * `./waitlist.ts`, `./enquiries.ts`, …) exports a Hono subapp so it
 * can be developed and (eventually) integration-tested in isolation.
 * This file is the single place those subapps get attached to the
 * top-level app — see `app.ts`.
 *
 * Currently mounted:
 *   /products   — public catalog reads (I12)
 *   /batches    — owner-only batch CRUD with computed totals (I23)
 *   /auth       — owner login / session (I20)
 *   /waitlist   — public POST join (I15)
 *   /enquiries  — public POST submit (I16)
 *
 * Later issues (I24 items, I25 sales, …) will add their own
 * `routes.route('/...', ...)` lines here. That is expected — the
 * owner resolves conflicts across parallel branches at merge time.
 */
export const routes = new Hono();

routes.route('/products', productsRouter);
routes.route('/batches', batchesRouter);
routes.route('/auth', authApp);
routes.route('/waitlist', waitlistApp);
routes.route('/enquiries', enquiriesApp);
