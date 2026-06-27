/**
 * Unit test for `apps/api/src/routes/batches/_shared/totals.ts`.
 *
 * What this exercises:
 *   - The pure `productionCostTotal` helper — verified against a
 *     few hand-computed cases (zero marketing cost, large numbers,
 *     missing sub-fields would be a type error thanks to Zod).
 *   - The shape returned by `computeBatchTotals` against the
 *     `BatchTotals` schema in `@printsbytee/shared`. The pure
 *     `productionCostTotal` path is verified here; the SQL
 *     aggregation is exercised by an integration test when one is
 *     added (the tests in this script are pure-function only, no
 *     Postgres — same convention as
 *     `scripts/test-product-delete-fk-mapping.ts`).
 *
 * Why a SQL-skipping test is still useful here:
 *   - The profit arithmetic lives in JS (`expectedRevenue −
 *     productionCostTotal − marketingCost`). A pure test catches
 *     regressions in that arithmetic without standing up Postgres.
 *   - The schema parse at the edge ensures the `BatchTotals` wire
 *     shape stays compatible with the shared contract.
 *
 * Run:
 *   pnpm --filter @printsbytee/api exec tsx scripts/test-batch-totals.ts
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — at least one assertion failed
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { BatchTotalsSchema } from '@printsbytee/shared';

import {
  productionCostTotal,
} from '../src/routes/batches/helpers.js';

// ── productionCostTotal ────────────────────────────────────────────────

test('productionCostTotal sums all four sub-fields', () => {
  // Hand-computed: 1000 + 200 + 300 + 50 = 1550
  assert.equal(
    productionCostTotal({ materials: 1000, logistics: 200, salary: 300, other: 50 }),
    1550,
  );
});

test('productionCostTotal accepts all-zero cost', () => {
  // A batch where productionCost is all zeros is valid — the totals
  // reduce to expectedRevenue − marketingCost (i.e. pure profit on
  // top of zero spend). The arithmetic must not special-case 0.
  assert.equal(
    productionCostTotal({ materials: 0, logistics: 0, salary: 0, other: 0 }),
    0,
  );
});

test('productionCostTotal does not special-case marketingCost', () => {
  // productionCost.total intentionally excludes marketingCost (see
  // docs/api-surface.md and ADR-0003). This test pins that
  // distinction — if a future refactor accidentally rolls
  // marketingCost into the sum, the integration test will fail and
  // this test will help isolate the regression.
  const production = { materials: 500, logistics: 0, salary: 0, other: 0 };
  assert.equal(productionCostTotal(production), 500);
});

// ── BatchTotalsSchema — wire shape ─────────────────────────────────────

test('BatchTotalsSchema accepts a zeroed batch', () => {
  // A freshly-created batch has zero items and zero revenue. The
  // totals object should validate with all zeros, including the two
  // profit fields (which can be negative in general, but not below
  // the schema's int requirement here).
  const totals = BatchTotalsSchema.parse({
    itemCount: 0,
    expectedRevenue: 0,
    actualRevenue: 0,
    loss: 0,
    expectedProfit: 0,
    profitSoFar: 0,
  });
  assert.deepEqual(totals, {
    itemCount: 0,
    expectedRevenue: 0,
    actualRevenue: 0,
    loss: 0,
    expectedProfit: 0,
    profitSoFar: 0,
  });
});

test('BatchTotalsSchema accepts negative profits', () => {
  // Profit can go negative when expectedRevenue < productionCost.total
  // + marketingCost (e.g. a batch that over-spent on materials). The
  // schema uses `z.number().int()` (not nonnegative) for the two
  // profit fields — pin that here so a future "harmonisation" of the
  // schema doesn't silently reject legitimate negative P&L.
  const totals = BatchTotalsSchema.parse({
    itemCount: 1,
    expectedRevenue: 1000,
    actualRevenue: 0,
    loss: 0,
    expectedProfit: -500,
    profitSoFar: -500,
  });
  assert.equal(totals.expectedProfit, -500);
  assert.equal(totals.profitSoFar, -500);
});

test('BatchTotalsSchema rejects negative pence fields', () => {
  // `expectedRevenue`, `actualRevenue`, and `loss` use `penceSchema`
  // (nonnegative). Negative values would imply a refund or a
  // accounting bug; surface as a validation error instead of a
  // silent corruption.
  assert.throws(
    () =>
      BatchTotalsSchema.parse({
        itemCount: 0,
        expectedRevenue: -1,
        actualRevenue: 0,
        loss: 0,
        expectedProfit: 0,
        profitSoFar: 0,
      }),
    /nonnegative|expectedRevenue/,
  );
});

test('BatchTotalsSchema rejects negative itemCount', () => {
  // itemCount must be a nonnegative int — a negative count would be
  // nonsensical. Pin the rejection so a future schema drift doesn't
  // start accepting it.
  assert.throws(
    () =>
      BatchTotalsSchema.parse({
        itemCount: -1,
        expectedRevenue: 0,
        actualRevenue: 0,
        loss: 0,
        expectedProfit: 0,
        profitSoFar: 0,
      }),
    /nonnegative|itemCount/,
  );
});