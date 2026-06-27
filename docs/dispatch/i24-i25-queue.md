# Queued dispatches — I24, I25

Owner-readable tracker for the two follow-up issues that must run **after**
I23 lands and is reviewed. Each one is dispatched in its own session, in its
own worktree, on its own branch — never in parallel — so the owner gets a
clean review per PR (per `AGENTS.md` "Final Review Gate" and "Parallel
Agent Worktrees").

## Coordinates (already reserved, do not reuse)

| Issue | Branch | Worktree path | Owning agent |
|---|---|---|---|
| I23 | `feat/i23-batch-crud-endpoints` | `/Users/damilolaoduronbi/Projects/printsbytee-i23` | `senior-api` |
| I24 | `feat/i24-batch-items-endpoints` | `/Users/damilolaoduronbi/Projects/printsbytee-i24` | `senior-api` |
| I25 | `feat/i25-sales-transactional-endpoints` | `/Users/damilolaoduronbi/Projects/printsbytee-i25` | `senior-api` |

All three branch from refreshed `origin/main` at dispatch time. They are
*not* stacked — each PR merges independently off `main` once reviewed.

## Sequential gating

```
I23 (this PR)  ──review/merge──▶  I24 (next PR)  ──review/merge──▶  I25 (final PR)
```

I24's blockers include I23. I25's blockers include I24. The owner must
merge each PR before the next dispatch starts; otherwise the next branch
will be missing the prior route file and the smoke-check will fail.

## I24 — Batch item endpoints with bulk create + status transitions

**Source:** `docs/plan.md` § "I24 — Implement batch item endpoints with bulk
create + status transitions".

**Acceptance criteria:**

- `GET /batches/:id/items` — list items in a batch. Session-gated.
- `POST /batches/:id/items` — add items in bulk. Body:
  `{ items: [{ productId, plannedSalePrice? }] }`. `plannedSalePrice`
  defaults to the referenced product's current `price` (ADR-0002). 404 if
  batch or any referenced product is unknown.
- `PATCH /batch-items/:id` — update `plannedSalePrice` or `status`. Refuses
  with 400 if the body tries to set `status: 'sold'` (clients must use the
  sale endpoint, not the item-status one).
- `DELETE /batch-items/:id` — hard delete. 409 if the item has a sale
  (UNIQUE FK on `sales.batch_item_id`).

**Mandatory patterns from I21 / I23:**

- Split handlers under `apps/api/src/routes/batch-items/{index.ts,handlers/*,helpers.ts}`.
- Reuse `parseIdParam`, `parseJsonBody` from the products helpers (move to
  a shared location if duplication gets painful — but I24 should start
  with local copies and refactor only if the file cap is hit).
- Mount under `/batches/:id/items` (the `:id` param is the *batch*, not
  the item) and `/batch-items` for the by-item endpoints — same shape as
  `docs/api-surface.md`.
- Every `?plannedSalePrice` copy from `products.price` happens at write
  time, in the same transaction. Re-querying later is a bug (ADR-0002
  freezes per-batch prices).
- Update `apps/api/scripts/smoke-check-routes.ts` to assert the four new
  paths.
- Stay under the 200-line-per-file cap. If a handler is heading over 200
  lines, split by responsibility (e.g. bulk-create helper vs. handler).
- No new migration is needed — `batch_items` already exists per I10/I11.

**PR title convention:** `feat(api): batch item endpoints with bulk create + status transitions (I24)`

## I25 — Sale recording + undo as transactional endpoints

**Source:** `docs/plan.md` § "I25 — Implement sale recording + undo as
transactional endpoints".

**Acceptance criteria:**

- `POST /batch-items/:id/sale` — record a sale. Body:
  `{ salePrice, soldAt?, customerName?, customerContact? }`. Defaults:
  `salePrice = item.plannedSalePrice`, `soldAt = now()`. Item transitions
  to `sold`. The whole operation must be a single transaction so the
  BatchItem status flip and the Sale insert cannot drift. 409 `CONFLICT`
  if the item is already sold (UNIQUE on `sales.batch_item_id`).
- `DELETE /sales/:id` — undo a sale. Delete the Sale row, restore the
  owning BatchItem to `sellable`. Same transactional guarantee in reverse
  so a partial failure cannot leave a sold item with no Sale or a Sale
  with no item.
- Both endpoints update `batch_items.updated_at` and `sales.created_at`
  exactly as the existing schema defaults specify.
- Profit/revenue reads (`actualRevenue`, `profitSoFar`) on
  `GET /batches/:id` reflect the mutation immediately.

**Mandatory patterns from I21 / I23 / I24:**

- Use `db.transaction(...)` from drizzle-orm/pg-core for both endpoints.
  The existing `apps/api/src/db/client.ts` is the right entry point.
- Split handlers under `apps/api/src/routes/sales/{index.ts,handlers/*,helpers.ts}`
  (sale endpoint) and possibly under `batch-items/handlers/sale.ts` —
  whichever keeps the route table flat.
- Mount `POST /batch-items/:id/sale` under the `/batch-items` prefix from
  I24 and `DELETE /sales/:id` under a new `/sales` prefix.
- Update `apps/api/scripts/smoke-check-routes.ts` to assert both new
  paths.
- Stay under the 200-line-per-file cap.
- No new migration — `sales` already exists.

**PR title convention:** `feat(api): sale recording + undo as transactional endpoints (I25)`

## Per-dispatch checklist (next session)

1. Confirm `main` is the current default branch and `git fetch origin main`
   returns nothing.
2. `git worktree add -b feat/iNN-... /Users/damilolaoduronbi/Projects/printsbytee-iNN origin/main`.
3. Dispatch `senior-api` (project-local agent, `agentScope: "both"`) with:
   - The exact worktree path + branch.
   - The acceptance criteria above.
   - The I23 PR link once it exists (so the agent can cross-read
     settled patterns).
   - The reminder that this is a **follow-up session** — owner has
     already merged I23 (and I24 if running I25). The agent must verify
     its blockers are present (`batch_items` rows, `requireSession`
     middleware, shared schemas).
4. Bot commits use `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL` env vars — never
   `git config` (per `AGENTS.md` "Git Configuration").
5. Agent pushes branch and opens PR via `gh pr create`. **Does not merge.**
6. Owner reviews. Final Review Gate stands.

## Why this is queued, not parallel

Per `AGENTS.md` "Parallel Agent Worktrees", concurrent agents must each
have their own worktree, branch, and PR. But I24 depends on I23's route
shape (it mounts under `/batches/:id/items` adjacent to I23's
`/batches/:id`) and I25 depends on I24's `batch-items/:id` route
existence (it mounts `POST /batch-items/:id/sale`). Running them in
parallel would force the owner to merge-conflict three PRs at once and
would defeat the per-issue review cadence.

Sequencing them gives the owner one PR per review pass.