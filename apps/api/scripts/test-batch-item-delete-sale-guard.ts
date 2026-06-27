/**
 * Unit tests for the DELETE /batch-items/:id sale guard and the
 * PATCH /batch-items/:id `status: 'sold'` guard.
 *
 * Why this exists:
 *   Both guards are API-layer policy on top of Zod, not Zod
 *   constraints. Zod's `BatchItemStatusSchema` accepts `'sold'`
 *   (it's a valid enum value), and the FK `sales.batch_item_id →
 *   batch_items.id` is `ON DELETE CASCADE` (so it will never trip
 *   on a parent DELETE). Without a dedicated test, a future refactor
 *   could silently drop the 400 / 409 envelopes and the smoke-check
 *   would still pass because the routes would still respond — just
 *   with the wrong status code.
 *
 * What this exercises:
 *   - `BATCH_ITEM_HAS_SALE_MESSAGE` and
 *     `BATCH_ITEM_STATUS_SOLD_GUARD_MESSAGE` — pin the exact wire
 *     strings.
 *   - `batchItemStatusSoldGuardResponse` — pure function, returns
 *     a `Response` with status 400 + the documented envelope when
 *     the body contains `status: 'sold'`; returns `null` otherwise.
 *   - `batchItemHasSaleResponse` — pure function, returns a
 *     `Response` with status 409 + the documented envelope when
 *     `hasSale` is true; returns `null` otherwise.
 *   - `hasSale` signature — pins the contract ("true when a sale
 *     row exists, false otherwise") without a live DB. The actual
 *     SQL probe is exercised by integration tests when added; the
 *     same approach as `scripts/test-batch-totals.ts`, which
 *     similarly skips the SQL-aggregation path.
 *
 * Run:
 *   pnpm --filter @printsbytee/api exec tsx scripts/test-batch-item-delete-sale-guard.ts
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — at least one assertion failed
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BATCH_ITEM_HAS_SALE_MESSAGE,
  BATCH_ITEM_STATUS_SOLD_GUARD_MESSAGE,
  batchItemHasSaleResponse,
  batchItemStatusSoldGuardResponse,
  hasSale,
} from '../src/routes/batch-items/helpers.js';

// ── Message strings ─────────────────────────────────────────────────────

test('BATCH_ITEM_HAS_SALE_MESSAGE is the documented 409 copy', () => {
  // Pin the exact wire string so a future typo in the handler does
  // not silently change the API contract for client error parsers.
  assert.equal(
    BATCH_ITEM_HAS_SALE_MESSAGE,
    'Batch item cannot be deleted because it has a recorded sale',
  );
});

test('BATCH_ITEM_STATUS_SOLD_GUARD_MESSAGE is the documented 400 copy', () => {
  assert.equal(
    BATCH_ITEM_STATUS_SOLD_GUARD_MESSAGE,
    "Item status cannot be set to 'sold' directly; use the sale endpoint",
  );
});

// ── `status: 'sold'` guard ──────────────────────────────────────────────

test("status='sold' guard returns 400 envelope", async () => {
  // The handler runs this helper before Zod parse so the client gets
  // the most specific message (the enum accepts the value).
  const response = batchItemStatusSoldGuardResponse({ status: 'sold' });
  assert.ok(response instanceof Response, 'guard must return a Response');
  assert.equal(response!.status, 400, 'guard must return HTTP 400');

  const body = (await response!.json()) as {
    error: { code: string; message: string };
  };
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.equal(body.error.message, BATCH_ITEM_STATUS_SOLD_GUARD_MESSAGE);
});

test("status='sellable' is allowed (guard returns null)", () => {
  assert.equal(
    batchItemStatusSoldGuardResponse({ status: 'sellable' }),
    null,
  );
});

test("status='faulty' is allowed (guard returns null)", () => {
  assert.equal(
    batchItemStatusSoldGuardResponse({ status: 'faulty' }),
    null,
  );
});

test('guard ignores non-object bodies', () => {
  // A request body that is not an object (or is `null`) cannot
  // contain a `status` field; the guard must return null and let
  // Zod produce its own 400.
  assert.equal(batchItemStatusSoldGuardResponse(null), null);
  assert.equal(batchItemStatusSoldGuardResponse('sold'), null);
  assert.equal(batchItemStatusSoldGuardResponse(42), null);
  assert.equal(batchItemStatusSoldGuardResponse([{ status: 'sold' }]), null);
});

test('guard ignores object bodies without a status field', () => {
  // A body that updates only `plannedSalePrice` (no `status`) must
  // not trip the guard.
  assert.equal(
    batchItemStatusSoldGuardResponse({ plannedSalePrice: 4000 }),
    null,
  );
  assert.equal(batchItemStatusSoldGuardResponse({}), null);
});

// ── hasSale probe contract ──────────────────────────────────────────────

test('hasSale is a function with the documented signature', () => {
  // The contract: `hasSale(itemId: string) => Promise<boolean>`,
  // true iff a `sales` row references this batch item. We pin the
  // signature here without standing up Postgres — the SQL probe is
  // `select 1 from sales where batch_item_id = ? limit 1`, which
  // is the same `LIMIT 1` → `rows.length > 0` short-circuit used
  // everywhere else in the codebase (see
  // `apps/api/src/routes/batches/handlers/delete.ts` for the same
  // shape against `batch_items`).
  assert.equal(typeof hasSale, 'function');
  assert.equal(hasSale.length, 1, 'hasSale must take exactly one argument (itemId)');
});

// ── hasSale → 409 response mapper ───────────────────────────────────────

test('batchItemHasSaleResponse(true) → 409 CONFLICT envelope', async () => {
  const response = batchItemHasSaleResponse(true);
  assert.ok(response instanceof Response, 'must return a Response');
  assert.equal(response!.status, 409, 'must return HTTP 409');

  const body = (await response!.json()) as {
    error: { code: string; message: string };
  };
  assert.equal(body.error.code, 'CONFLICT');
  assert.equal(body.error.message, BATCH_ITEM_HAS_SALE_MESSAGE);
});

test('batchItemHasSaleResponse(false) → null (proceed with delete)', () => {
  // When no sale references the item, the helper returns null so the
  // route handler can `if (resp) return resp;` and continue with the
  // DELETE. Pin the null return so a future "always return a
  // Response" refactor doesn't accidentally turn 204s into 409s.
  assert.equal(batchItemHasSaleResponse(false), null);
});
