/**
 * Unit tests for the PATCH /batch-items/:id sold-item status-change
 * guard (`batchItemSoldStatusChangeGuardResponse`) and the related
 * `BATCH_ITEM_SOLD_STATUS_CHANGE_GUARD_MESSAGE` constant.
 *
 * Why this exists:
 *   The `PATCH /batch-items/:id` handler has two API-layer status
 *   guards:
 *     1. Refuse `status: 'sold'` in the body — tested by
 *        `test-batch-item-delete-sale-guard.ts`.
 *     2. Refuse changing status *away from* `sold` when the item has
 *        a sale row — tested here.
 *
 *   Both are API-layer policy, not Zod constraints. Without a
 *   dedicated test a future refactor could silently drop the 409
 *   envelope and the smoke-check would still pass because the route
 *   would still respond — just with the wrong status code.
 *
 * What this exercises:
 *   - `BATCH_ITEM_SOLD_STATUS_CHANGE_GUARD_MESSAGE` — pin the exact
 *     wire string so a typo in the handler does not silently change
 *     the API contract.
 *   - `batchItemSoldStatusChangeGuardResponse` — pure function with
 *     signature `(body: unknown, currentStatus: string) => Response | null`.
 *
 * Run:
 *   pnpm --filter @printsbytee/api exec tsx scripts/test-sold-item-patch-guard.ts
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — at least one assertion failed
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BATCH_ITEM_SOLD_STATUS_CHANGE_GUARD_MESSAGE,
  batchItemSoldStatusChangeGuardResponse,
} from '../src/routes/batch-items/helpers.js';

// ── Message string ──────────────────────────────────────────────────────

test('BATCH_ITEM_SOLD_STATUS_CHANGE_GUARD_MESSAGE is the documented 409 copy', () => {
  assert.equal(
    BATCH_ITEM_SOLD_STATUS_CHANGE_GUARD_MESSAGE,
    'Cannot change status of a sold item — undo the sale first',
  );
});

// ── Guard: current status === 'sold', body contains status ─────────────

test('sold item + status change to "faulty" → 409 CONFLICT envelope', async () => {
  const response = batchItemSoldStatusChangeGuardResponse(
    { status: 'faulty' },
    'sold',
  );
  assert.ok(response instanceof Response, 'guard must return a Response');
  assert.equal(response!.status, 409, 'guard must return HTTP 409');

  const body = (await response!.json()) as {
    error: { code: string; message: string };
  };
  assert.equal(body.error.code, 'CONFLICT');
  assert.equal(body.error.message, BATCH_ITEM_SOLD_STATUS_CHANGE_GUARD_MESSAGE);
});

test('sold item + status change to "sellable" → 409 CONFLICT envelope', async () => {
  const response = batchItemSoldStatusChangeGuardResponse(
    { status: 'sellable' },
    'sold',
  );
  assert.ok(response instanceof Response);
  assert.equal(response!.status, 409);

  const body = (await response!.json()) as {
    error: { code: string; message: string };
  };
  assert.equal(body.error.code, 'CONFLICT');
  assert.equal(body.error.message, BATCH_ITEM_SOLD_STATUS_CHANGE_GUARD_MESSAGE);
});

test('sold item + status change to "sold" → null (already caught by other guard)', () => {
  // Guard returns null when the new status is 'sold' because the
  // existing `batchItemStatusSoldGuardResponse` handles that case
  // with a more specific 400 message.
  assert.equal(
    batchItemSoldStatusChangeGuardResponse({ status: 'sold' }, 'sold'),
    null,
  );
});

test('sold item + status change to "faulty" + other fields → 409', async () => {
  const response = batchItemSoldStatusChangeGuardResponse(
    { status: 'faulty', plannedSalePrice: 5000 },
    'sold',
  );
  assert.ok(response instanceof Response);
  assert.equal(response!.status, 409);
});

// ── Guard: current status !== 'sold' → always allow ────────────────────

test('sellable item + status change to "faulty" → null (allowed)', () => {
  assert.equal(
    batchItemSoldStatusChangeGuardResponse({ status: 'faulty' }, 'sellable'),
    null,
  );
});

test('faulty item + status change to "sellable" → null (allowed)', () => {
  assert.equal(
    batchItemSoldStatusChangeGuardResponse({ status: 'sellable' }, 'faulty'),
    null,
  );
});

// ── Guard: body does not contain status → always allow ─────────────────

test('sold item + no status field in body → null (allowed)', () => {
  assert.equal(
    batchItemSoldStatusChangeGuardResponse({ plannedSalePrice: 5000 }, 'sold'),
    null,
  );
});

test('sellable item + no status field in body → null (allowed)', () => {
  assert.equal(
    batchItemSoldStatusChangeGuardResponse({ plannedSalePrice: 5000 }, 'sellable'),
    null,
  );
});

test('sold item + empty body → null (allowed)', () => {
  assert.equal(
    batchItemSoldStatusChangeGuardResponse({}, 'sold'),
    null,
  );
});

// ── Guard: non-object / invalid bodies → null ─────────────────────────

test('guard ignores non-object bodies', () => {
  // A request body that is not an object cannot contain a `status`
  // field; the guard must return null and let Zod produce its own 400.
  assert.equal(batchItemSoldStatusChangeGuardResponse(null, 'sold'), null);
  assert.equal(batchItemSoldStatusChangeGuardResponse('faulty', 'sold'), null);
  assert.equal(batchItemSoldStatusChangeGuardResponse(42, 'sold'), null);
  assert.equal(
    batchItemSoldStatusChangeGuardResponse([{ status: 'faulty' }], 'sold'),
    null,
  );
});