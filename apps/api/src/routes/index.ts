import { Hono } from 'hono';

import { productsRouter } from './products/index.js';
import { batchesRouter } from './batches/index.js';
import { batchItemsRouter } from './batch-items/index.js';
import { salesRouter } from './sales/index.js';
import { uploadsRouter } from './uploads/index.js';
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
 *   /products     — public catalog reads (I12)
 *   /batches      — owner-only batch CRUD with computed totals (I23),
 *                    plus the batch-scoped batch-item routes
 *                    (GET/POST /batches/:id/items, I24)
 *   /batch-items  — owner-only by-id batch-item routes
 *                    (PATCH/DELETE /batch-items/:id, I24) plus the
 *                    sale-recording endpoint
 *                    (POST /batch-items/:id/sale, I25)
 *   /sales        — owner-only sale-by-id routes
 *                    (DELETE /sales/:id, I25 — undo a sale)
 *   /uploads      — owner-only multipart upload to R2 (I22)
 *   /auth         — owner login / session (I20)
 *   /waitlist     — public POST join (I15)
 *   /enquiries    — public POST submit (I16)
 *
 * Later issues will add their own `routes.route('/...', ...)` lines
 * here. That is expected — the owner resolves conflicts across
 * parallel branches at merge time.
 */
export const routes = new Hono();

routes.route('/products', productsRouter);
routes.route('/batches', batchesRouter);
routes.route('/batch-items', batchItemsRouter);
routes.route('/sales', salesRouter);
routes.route('/uploads', uploadsRouter);
routes.route('/auth', authApp);
routes.route('/waitlist', waitlistApp);
routes.route('/enquiries', enquiriesApp);
