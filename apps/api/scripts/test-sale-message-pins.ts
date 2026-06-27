/**
 * Unit tests for the I25 sale endpoints' pure helpers + wire-string
 * pins.
 *
 * What this exercises:
 *   - `BATCH_ITEM_ALREADY_SOLD_MESSAGE` — pin the exact wire string
 *     used for the `POST /batch-items/:id/sale` 409 envelope, so a
 *     future typo in the handler does not silently change the API
 *     contract for client error parsers.
 *   - `BATCH_ITEM_NOT_FOUND_MESSAGE` — pin the 404 wire string for
 *     the same endpoint.
 *   - `SALE_NOT_FOUND_MESSAGE` — pin the 404 wire string for
 *     `DELETE /sales/:id`.
 *   - `recordSaleDefaults(item, body, now)` — pure function:
 *       - When `salePrice`/`soldAt` are omitted, returns
 *         `item.plannedSalePrice` and `now` respectively.
 *       - When `salePrice`/`soldAt` are provided, uses them verbatim.
 *   - `recordSaleResponse({ status })` — pure function:
 *       - Returns a 409 envelope when `status === 'sold'`.
 *       - Returns `null` otherwise (so the caller can `if (!resp) { ... }`).
 *
 * What this does NOT exercise (left to integration tests):
 *   - The actual `db.transaction(...)` flow with `SELECT ... FOR UPDATE`
 *     in `recordSaleTx`. That requires a live Postgres and is
 *     intentionally out of scope for the pure unit test, mirroring
 *     `scripts/test-batch-totals.ts` which similarly skips the SQL
 *     aggregation path.
 *
 * Run:
 *   pnpm --filter @printsbytee/api exec tsx scripts/test-sale-message-pins.ts
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — at least one assertion failed
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BATCH_ITEM_ALREADY_SOLD_MESSAGE,
  BATCH_ITEM_NOT_FOUND_MESSAGE,
  recordSaleDefaults,
  recordSaleResponse,
} from '../src/routes/sales/_shared/sale-helpers.js';
import { SALE_NOT_FOUND_MESSAGE } from '../src/routes/sales/_shared/sale-helpers.js';
import type { BatchItem } from '../src/db/schema/batches.js';

// ── Message strings ─────────────────────────────────────────────────────

test('BATCH_ITEM_ALREADY_SOLD_MESSAGE is the documented 409 copy', () => {
  // Pin the exact wire string so a future typo in the handler does
  // not silently change the API contract for client error parsers.
  // Same shape as `BATCH_ITEM_HAS_SALE_MESSAGE` pinned by the I24
  // delete-guard test (apps/api/scripts/test-batch-item-delete-sale-guard.ts).
  assert.equal(
    BATCH_ITEM_ALREADY_SOLD_MESSAGE,
    'Batch item is already sold',
  );
});

test('BATCH_ITEM_NOT_FOUND_MESSAGE is the documented 404 copy', () => {
  assert.equal(
    BATCH_ITEM_NOT_FOUND_MESSAGE,
    'Batch item not found',
  );
});

test('SALE_NOT_FOUND_MESSAGE is the documented 404 copy', () => {
  assert.equal(
    SALE_NOT_FOUND_MESSAGE,
    'Sale not found',
  );
});

// ── recordSaleDefaults (pure) ──────────────────────────────────────────

/**
 * Build a minimal `BatchItem` row for unit tests. Drizzle's inferred
 * `$inferSelect` type carries `Date` for the timestamps; using `as`
 * to keep the helper concise while still satisfying the type.
 */
function makeItem(overrides: Partial<BatchItem> = {}): BatchItem {
  const now = new Date('2026-01-15T12:00:00.000Z');
  return {
    id: '11111111-1111-4111-8111-111111111111',
    batchId: '22222222-2222-4222-8222-222222222222',
    productId: '33333333-3333-4333-8333-333333333333',
    plannedSalePrice: 4000,
    status: 'sellable',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test('recordSaleDefaults returns plannedSalePrice + now when both are omitted', () => {
  // ADR-0002 freezes `plannedSalePrice` for the batch — when the
  // request omits `salePrice`, the sale defaults to the snapshot.
  // `soldAt` defaults to the `now` the handler resolved before
  // entering the transaction (so the same timestamp flows to
  // `sales.sold_at` and `batch_items.updated_at`).
  const item = makeItem({ plannedSalePrice: 7500 });
  const now = new Date('2026-02-01T09:30:00.000Z');
  const result = recordSaleDefaults(item, {}, now);
  assert.equal(result.salePrice, 7500);
  assert.equal(result.soldAt, now);
});

test('recordSaleDefaults uses provided salePrice verbatim', () => {
  // Negotiated / discounted sale prices override the snapshot. The
  // helper must not re-clamp or re-validate — Zod already accepted
  // the value at the route boundary.
  const item = makeItem({ plannedSalePrice: 4000 });
  const now = new Date('2026-02-01T09:30:00.000Z');
  const result = recordSaleDefaults(
    item,
    { salePrice: 3500 },
    now,
  );
  assert.equal(result.salePrice, 3500);
  assert.equal(result.soldAt, now);
});

test('recordSaleDefaults uses provided soldAt verbatim', () => {
  // A back-dated sale (e.g. recording an in-person sale from
  // yesterday) must be preserved verbatim. The helper must not
  // clamp to `now` when the caller provided an explicit timestamp.
  // `body.soldAt` arrives as an ISO string per
  // `RecordSaleRequestSchema`; the helper coerces it through
  // `new Date(...)` so the DB layer gets a `Date`.
  const item = makeItem({ plannedSalePrice: 4000 });
  const now = new Date('2026-02-01T09:30:00.000Z');
  const soldAtIso = '2026-01-31T17:00:00.000Z';
  const result = recordSaleDefaults(
    item,
    { soldAt: soldAtIso },
    now,
  );
  assert.equal(result.salePrice, 4000);
  assert.equal(result.soldAt.getTime(), new Date(soldAtIso).getTime());
});

test('recordSaleDefaults uses both provided values verbatim', () => {
  const item = makeItem({ plannedSalePrice: 4000 });
  const now = new Date('2026-02-01T09:30:00.000Z');
  const soldAtIso = '2026-01-31T17:00:00.000Z';
  const result = recordSaleDefaults(
    item,
    { salePrice: 3800, soldAt: soldAtIso },
    now,
  );
  assert.equal(result.salePrice, 3800);
  assert.equal(result.soldAt.getTime(), new Date(soldAtIso).getTime());
});

// ── recordSaleResponse (pure envelope helper) ──────────────────────────

test("recordSaleResponse({ status: 'sold' }) returns 409 CONFLICT envelope", async () => {
  // The pre-check inside `recordSaleTx` does not call this helper
  // directly — the helper exists so the route layer (and unit
  // tests) can produce the same 409 envelope without re-parsing the
  // shared schema in two places. Pin the wire shape here.
  const response = recordSaleResponse({ status: 'sold' });
  assert.ok(response instanceof Response, 'must return a Response');
  assert.equal(response!.status, 409, 'must return HTTP 409');

  const body = (await response!.json()) as {
    error: { code: string; message: string };
  };
  assert.equal(body.error.code, 'CONFLICT');
  assert.equal(body.error.message, BATCH_ITEM_ALREADY_SOLD_MESSAGE);
});

test("recordSaleResponse({ status: 'sellable' }) returns null", () => {
  // The caller pattern is `if (!response) { /* proceed */ }` — pin
  // the null return so a future "always return a Response" refactor
  // does not silently turn 201s into 409s.
  assert.equal(
    recordSaleResponse({ status: 'sellable' }),
    null,
  );
});

test("recordSaleResponse({ status: 'faulty' }) returns null", () => {
  // A `faulty` item cannot be sold (the sale endpoint records a
  // sale and flips the status to `sold`). The DB-level check inside
  // `recordSaleTx` returns `BATCH_ITEM_ALREADY_SOLD` only when
  // `status === 'sold'` — a `faulty` item would fail a different
  // policy guard. Pin that this helper does NOT 409 on `faulty`
  // (that's a different policy guard's responsibility, future
  // work).
  assert.equal(
    recordSaleResponse({ status: 'faulty' }),
    null,
  );
});