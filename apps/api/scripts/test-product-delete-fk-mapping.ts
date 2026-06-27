/**
 * Unit test for the DELETE /products/:id FK → message mapping.
 *
 * Why this exists:
 *   PR #66 review surfaced that the original DELETE handler returned
 *   the same "Product has batch items and cannot be deleted" message
 *   for *every* 23503 — including for products referenced by
 *   `waitlist_entries` (also ON DELETE RESTRICT). The fix discriminates
 *   by `err.constraint`; this test pins that mapping so a future
 *   refactor (or a renamed FK in the migration) fails loudly.
 *
 * Pure-function test — no Postgres, no Drizzle mocks needed. The
 * mapping lives in `src/routes/products/helpers.ts` and is exported as
 * `fkViolationMessage`.
 *
 * Run:
 *   pnpm --filter @printsbytee/api exec tsx scripts/test-product-delete-fk-mapping.ts
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — at least one assertion failed (Node's built-in test runner
 *       exits non-zero on failure)
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FK_CONSTRAINT_MESSAGES,
  fkViolationMessage,
} from '../src/routes/products/helpers.js';

test('batch_items FK → batch-items message', () => {
  const constraint = 'batch_items_product_id_products_id_fk';
  assert.equal(
    fkViolationMessage(constraint),
    'Product has batch items and cannot be deleted',
    `Expected the batch-items-specific message for constraint=${constraint}`,
  );
});

test('waitlist_entries FK → waitlist message', () => {
  const constraint = 'waitlist_entries_product_id_products_id_fk';
  assert.equal(
    fkViolationMessage(constraint),
    'Product has waitlist entries and cannot be deleted',
    `Expected the waitlist-specific message for constraint=${constraint}`,
  );
});

test('two RESTRICT FKs map to distinct messages', () => {
  // Guards against a regression where both constraints collapse to the
  // same generic copy. Must remain a strict inequality.
  const a = fkViolationMessage('batch_items_product_id_products_id_fk');
  const b = fkViolationMessage('waitlist_entries_product_id_products_id_fk');
  assert.notEqual(a, b, 'batch_items and waitlist must produce distinct messages');
});

test('unknown constraint → generic 409 copy', () => {
  // Future RESTRICT FKs (e.g. an `order_items` table) should fall back
  // to the generic message rather than blowing up.
  assert.equal(
    fkViolationMessage('some_future_fk_xyz'),
    'Product cannot be deleted while referenced by other records',
  );
});

test('undefined constraint (defensive) → generic 409 copy', () => {
  // `err.constraint` is technically optional on a pg error shape — if
  // a driver upgrade ever drops it, the handler should still produce a
  // safe response, not crash.
  assert.equal(
    fkViolationMessage(undefined),
    'Product cannot be deleted while referenced by other records',
  );
});

test('FK_CONSTRAINT_MESSAGES covers both known RESTRICT FKs', () => {
  // Pin the mapping table itself — the source of truth. If a future
  // migration renames a constraint, this test fails and the operator
  // is forced to update both the test and `helpers.ts` together.
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      FK_CONSTRAINT_MESSAGES,
      'batch_items_product_id_products_id_fk',
    ),
    true,
    'batch_items FK must be in the mapping table',
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      FK_CONSTRAINT_MESSAGES,
      'waitlist_entries_product_id_products_id_fk',
    ),
    true,
    'waitlist_entries FK must be in the mapping table',
  );
  // Two entries exactly — the schema today has exactly two RESTRICT FKs
  // to products. Update this if a third is added intentionally.
  assert.equal(
    Object.keys(FK_CONSTRAINT_MESSAGES).length,
    2,
    `Expected exactly 2 mapped FKs, got ${Object.keys(FK_CONSTRAINT_MESSAGES).length}`,
  );
});