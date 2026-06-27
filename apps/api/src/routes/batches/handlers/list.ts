import type { Context } from 'hono';
import { and, asc, eq, gte, lte, type SQL } from 'drizzle-orm';

import {
  ErrorResponseSchema,
  ProductionBatchSchema,
  ProductionBatchWithTotalsSchema,
} from '@printsbytee/shared';

import { db } from '../../../db/client.js';
import { productionBatches } from '../../../db/schema/batches.js';
import type { AppEnv } from '../../../types.js';

import { computeBatchTotals } from '../_shared/totals.js';
import { BatchListQuerySchema, parseIdParam, toBatchDto } from '../helpers.js';

/**
 * `GET /batches` — list batches with optional `?from=&to=` filter.
 *
 * Owner-only (mounted behind `requireSession` in `index.ts`). The
 * optional date range is inclusive on both ends and matches against
 * `production_batches.created_at`. The `production_batches_created_at_idx`
 * index covers the filter — see `apps/api/src/db/schema/batches.ts`.
 *
 * Order is by `created_at` ascending (oldest first) so the timeline
 * is stable across requests — the timeline view scrolls forward in
 * chronological order and the date filters compose naturally with it.
 *
 * Returns `ProductionBatch[]` — NOT `ProductionBatchWithTotals[]`,
 * because the totals are documented as a per-batch detail on
 * `GET /batches/:id` only (see `docs/api-surface.md`).
 */
export async function listBatches(c: Context<AppEnv>): Promise<Response> {
  const parsedQuery = BatchListQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid batch filters',
          details: parsedQuery.error.issues,
        },
      },
      400,
    );
  }
  const filters = parsedQuery.data;

  // Build the WHERE clause incrementally so the query only touches the
  // indexed columns that match the requested filters. Date strings are
  // coerced through `new Date(...)` so the comparison runs against
  // the timestamptz column — invalid input would coerce to NaN and
  // Postgres would return no rows, which is acceptable defensive
  // behaviour for a filter that the schema already accepts as a
  // non-empty string.
  const conditions: SQL[] = [];
  if (filters.from !== undefined) {
    conditions.push(gte(productionBatches.createdAt, new Date(filters.from)));
  }
  if (filters.to !== undefined) {
    conditions.push(lte(productionBatches.createdAt, new Date(filters.to)));
  }

  const rows = await db
    .select()
    .from(productionBatches)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(productionBatches.createdAt));

  const response = ProductionBatchSchema.array().parse(rows.map(toBatchDto));
  return c.json(response);
}

/**
 * `GET /batches/:id` — single batch with computed totals.
 *
 * Owner-only. Returns `ProductionBatchWithTotals` (the base batch
 * shape extended with a `totals` object per ADR-0003 and
 * `docs/api-surface.md`).
 *
 * Totals are computed via `computeBatchTotals(batchId)` which runs the
 * documented formulas in SQL — see `../_shared/totals.ts` for the
 * aggregation strategy.
 *
 *   200 { ProductionBatchWithTotals }
 *   400 { error: VALIDATION_ERROR } — malformed id
 *   401 { error: UNAUTHORIZED }     — from requireSession
 *   404 { error: NOT_FOUND }        — id is well-formed but unknown
 */
export async function getBatchById(c: Context<AppEnv>): Promise<Response> {
  const idResult = parseIdParam(c);
  if (!idResult.ok) return idResult.response;
  const id = idResult.id;

  const row = await db
    .select()
    .from(productionBatches)
    .where(eq(productionBatches.id, id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!row) {
    return c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: 'Batch not found',
        },
      }),
      404,
    );
  }

  const totals = await computeBatchTotals(id);

  const response = ProductionBatchWithTotalsSchema.parse({
    ...toBatchDto(row),
    totals,
  });
  return c.json(response);
}