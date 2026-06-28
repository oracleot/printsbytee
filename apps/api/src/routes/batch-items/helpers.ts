import type { Context } from 'hono';
import { eq } from 'drizzle-orm';

import {
  ErrorResponseSchema,
  type BatchItem,
  uuidSchema,
} from '@printsbytee/shared';

import { db } from '../../db/client.js';
import {
  sales,
  type BatchItem as BatchItemRow,
} from '../../db/schema/batches.js';
import type { AppEnv } from '../../types.js';

// Re-export the bulk-create helper so the route handler has a single
// import surface (`../helpers.js`) for everything batch-item-related.
// Keeps the directory layout clean — see `../handlers/create.ts`.
export {
  bulkCreateItems,
  type BulkCreateItemsFailure,
  type BulkCreateItemsResult,
} from './_shared/bulk-create.js';

// ── Wire-shape + message constants ──────────────────────────────────────

/** Documented 409 message for `DELETE /batch-items/:id` when a
 *  `sales` row references the item. Pinning it as a constant so the
 *  route handler cannot drift from the contract (the unit test in
 *  `apps/api/scripts/test-batch-item-delete-sale-guard.ts` asserts
 *  the exact string). */
export const BATCH_ITEM_HAS_SALE_MESSAGE =
  'Batch item cannot be deleted because it has a recorded sale';

/** Documented 400 message for `PATCH /batch-items/:id` when the body
 *  tries to set `status: 'sold'`. The sale endpoint
 *  (`POST /batch-items/:id/sale`, I25) is the only path to mark an
 *  item as sold because the same operation must insert the `sales`
 *  row in the same transaction as the status flip — see
 *  `docs/plan.md` § I25. */
export const BATCH_ITEM_STATUS_SOLD_GUARD_MESSAGE =
  "Item status cannot be set to 'sold' directly; use the sale endpoint";

/** Documented 409 message for `PATCH /batch-items/:id` when the body
 *  tries to change the status of an already-sold item (i.e. one that
 *  has a corresponding `sales` row). Symmetric to the existing
 *  `status: 'sold'` guard — the API refuses both entering and leaving
 *  the `sold` state via PATCH to keep the revenue record intact. */
export const BATCH_ITEM_SOLD_STATUS_CHANGE_GUARD_MESSAGE =
  'Cannot change status of a sold item — undo the sale first';

/** Convert a `batch_items` row from the DB layer to the wire shape
 *  (dates → ISO). Mirrors the pattern in
 *  `apps/api/src/routes/batches/helpers.ts#toBatchDto` and
 *  `apps/api/src/routes/products/helpers.ts#toProductDto`. */
export function toBatchItemDto(row: BatchItemRow): BatchItem {
  return {
    id: row.id,
    batchId: row.batchId,
    productId: row.productId,
    plannedSalePrice: row.plannedSalePrice,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Path / body parsing helpers (local copy, per agents.md) ─────────────

/** Validate a `:id` path parameter as a UUID. Returns the parsed id
 *  on success, or a `Response` the caller should `return` directly.
 *  Mirrors `apps/api/src/routes/batches/helpers.ts#parseIdParam` and
 *  `apps/api/src/routes/products/helpers.ts#parseIdParam` — local
 *  copies are intentional this iteration (see agents.md: refactor
 *  only when duplication crosses the 200-line/file cap). */
export function parseIdParam(
  c: Context<AppEnv>,
): { ok: true; id: string } | { ok: false; response: Response } {
  const parsed = uuidSchema.safeParse(c.req.param('id'));
  if (parsed.success) {
    return { ok: true, id: parsed.data };
  }
  return {
    ok: false,
    response: c.json(
      ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Batch item id must be a UUID',
        },
      }),
      400,
    ),
  };
}

/** Parse a JSON request body and translate a `SyntaxError` from
 *  `c.req.json()` into the canonical 400 envelope. Other thrown
 *  errors (e.g. body-size limits from upstream) are re-thrown so the
 *  global error handler sees them. */
export async function parseJsonBody(
  c: Context<AppEnv>,
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  try {
    const body = await c.req.json();
    return { ok: true, body };
  } catch (err: unknown) {
    if (!(err instanceof SyntaxError)) throw err;
    return {
      ok: false,
      response: c.json(
        ErrorResponseSchema.parse({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request body must be valid JSON',
          },
        }),
        400,
      ),
    };
  }
}

// ── `status: 'sold'` guard (API-layer policy, not Zod) ──────────────────

/** Returns the documented 400 envelope when the request body tries to
 *  set `status: 'sold'`. Returns `null` otherwise so the caller can
 *  `if (!guard) return nextStep();`.
 *
 *  API-layer policy on top of `UpdateBatchItemRequestSchema`, not a
 *  Zod constraint — `BatchItemStatusSchema` keeps the enum as the
 *  source of truth for valid values, and the sale endpoint is the
 *  only legitimate path to the `sold` state (see I25). Keeping the
 *  policy out of Zod also means future API clients that need to read
 *  the enum (e.g. for a dropdown) see the full set of values, not a
 *  hand-edited subset. */
export function batchItemStatusSoldGuardResponse(
  body: unknown,
): Response | null {
  if (
    typeof body === 'object' &&
    body !== null &&
    !Array.isArray(body)
  ) {
    const candidate = body as Record<string, unknown>;
    if (candidate.status === 'sold') {
      return new Response(
        JSON.stringify(
          ErrorResponseSchema.parse({
            error: {
              code: 'VALIDATION_ERROR',
              message: BATCH_ITEM_STATUS_SOLD_GUARD_MESSAGE,
            },
          }),
        ),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }
  }
  return null;
}

// ── sold-item status-change guard (API-layer policy) ───────────────────

/** Returns the documented 409 envelope when the request body tries to
 *  change the status of an already-sold batch item (i.e. one with a
 *  `sales` row). Returns `null` otherwise so the caller can proceed.
 *
 *  Symmetric to `batchItemStatusSoldGuardResponse`:
 *    - that guard: refuse setting status → `sold` via PATCH
 *    - this guard: refuse changing status away from `sold` via PATCH
 *
 *  The caller is responsible for looking up the current item state
 *  (via `hasSale` or a JOIN) before calling this helper. */
export function batchItemSoldStatusChangeGuardResponse(
  body: unknown,
  currentStatus: string,
): Response | null {
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    return null;
  }

  const candidate = body as Record<string, unknown>;

  // Only guard when the body actually contains a `status` field and
  // the current status is `sold`. If the body omits `status` the
  // PATCH is a no-op on that field and the existing status check is
  // sufficient.
  if (!('status' in candidate)) return null;
  if (currentStatus !== 'sold') return null;

  const newStatus = candidate.status;
  if (newStatus === 'sold') return null; // already caught by the other guard

  return new Response(
    JSON.stringify(
      ErrorResponseSchema.parse({
        error: {
          code: 'CONFLICT',
          message: BATCH_ITEM_SOLD_STATUS_CHANGE_GUARD_MESSAGE,
        },
      }),
    ),
    { status: 409, headers: { 'content-type': 'application/json' } },
  );
}

// ── hasSale probe ───────────────────────────────────────────────────────

/** Returns `true` iff a `sales` row references this batch item.
 *
 *  `LIMIT 1` lookup against `sales_batch_item_id_idx` (a unique
 *  btree on `batch_item_id`). The FK `sales.batch_item_id →
 *  batch_items.id` is `ON DELETE CASCADE`, so it will NOT trip on a
 *  parent DELETE — we must probe explicitly. */
export async function hasSale(itemId: string): Promise<boolean> {
  const rows = await db
    .select({ id: sales.id })
    .from(sales)
    .where(eq(sales.batchItemId, itemId))
    .limit(1);
  return rows.length > 0;
}

/** Returns the documented 409 envelope iff `hasSale(itemId)` is
 *  true. Pulled out as a pure helper so the route handler is linear
 *  and so a unit test can pin the contract without a live DB. */
export function batchItemHasSaleResponse(hasSaleResult: boolean): Response | null {
  if (!hasSaleResult) return null;
  return new Response(
    JSON.stringify(
      ErrorResponseSchema.parse({
        error: {
          code: 'CONFLICT',
          message: BATCH_ITEM_HAS_SALE_MESSAGE,
        },
      }),
    ),
    { status: 409, headers: { 'content-type': 'application/json' } },
  );
}
