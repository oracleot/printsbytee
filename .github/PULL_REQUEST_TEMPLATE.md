<!--
This template is the skeleton every PR starts from. Replace every
placeholder with the real content; delete the comment block above
before submitting (GitHub strips HTML comments from the rendered PR
body, so leaving it in just adds noise).

Two headline rules for this repo (see AGENTS.md):
  1. Final Review Gate — the owner reviews and merges. Do not
     self-merge. Mark the bottom of this template accordingly.
  2. Per-PR review cadence — one PR per issue, branched off refreshed
     main, no parallel-agent interference.
-->

## Closes

<!--
GitHub closes issues when the PR merges based on keywords in the
description. The canonical keyword for this repo is `Closes` —
pick one of the forms below and delete the rest:

  Closes #23                       (single issue)
  Closes #23, #24                  (multiple issues, comma-separated)
  Closes oracleot/printsbytee#23   (cross-repo, when applicable)

Only list issues that will be **fully resolved** by this PR. Issues
that are partially addressed or merely tangentially related belong
in the "Refs" section below, not here — otherwise the owner will
get a misleading "auto-closed" notification.

For the I-prefixed issues in docs/plan.md, this section is the
authoritative place to record which ones the PR closes. The plan
doc stays the source of truth for "what is the work", but GitHub
needs the keyword in the PR body to drive the issue state.
-->

Closes #

## Refs

<!--
For related-but-not-closing references — typically `docs/plan.md`
issue keys (e.g. I22), ADRs, or upstream issues that this PR
depends on but does not close. Use `Refs:` with a markdown link or
a plain `path#anchor` so the owner can jump to the source of truth.

  Refs: docs/plan.md#i22
  Refs: docs/adr/0003-loss-model-revenue-side.md
  Refs: oracleot/printsbytee#18 (depends on)
-->

Refs:

## Summary

<!--
One or two sentences on what this PR does and why. Lead with the
issue key from docs/plan.md (e.g. "Implements I22 — …") so a skim
of the merged-PR log ties back to the plan.

If the PR lands multiple endpoints / files, include a behaviour
table. The existing convention is:

  | Method | Path | Behaviour |
  |---|---|---|
  | GET    | /...  | ...       |
-->

## Files

<!--
Bullet list of the meaningful file changes, grouped by area. Skip
generated files (dist/, lockfile churn for unrelated packages) and
focus on what a reviewer needs to read end-to-end.

Existing convention from prior API PRs:
  - apps/api/src/routes/<feature>/index.ts             — wires handlers + auth
  - apps/api/src/routes/<feature>/handlers/<action>.ts — new endpoint
  - apps/api/src/routes/<feature>/helpers.ts           — new, shared parse + DTO
  - apps/api/scripts/smoke-check-routes.ts             — adds the new (method, path) assertions
  - apps/api/scripts/test-<feature>-<...>.ts           — new unit tests (mirrors prior precedents)
-->

## Verification

<!--
Every gate below MUST be green before the PR is pushed. Paste the
literal command + result so the reviewer can re-run if needed.

  pnpm --filter @printsbytee/api typecheck             → PASS
  pnpm --filter @printsbytee/api lint                  → PASS
  pnpm --filter @printsbytee/shared build && \
    pnpm --filter @printsbytee/api build                → PASS
  DATABASE_URL=postgres://test:test@localhost:5432/test \
    SESSION_SECRET=test-session-secret \
    INTERNAL_API_KEY=test-internal-key \
    pnpm --filter @printsbytee/api exec tsx \
      scripts/smoke-check-routes.ts                    → N/N OK

If the PR adds a new pure helper, also paste the new
`scripts/test-<feature>.ts` output and any regression checks
against prior test scripts.
-->

## Cross-checks against spec

<!--
For each spec the PR touches, paste a one-line note that says
"checked against <spec>". The reviewer should be able to read
each line and immediately know which document to flip open.

  - `docs/api-surface.md` — endpoint table + wire shape verified.
  - `docs/adr/0003-loss-model-revenue-side.md` — totals formulas
    re-checked byte-for-byte.
  - `docs/data-model.md` — derived vs. stored fields respected.

If the PR intentionally diverges from a spec, surface it here,
not in the Follow-ups section — this is where the owner looks for
"why is this different from the doc?".
-->

## Out of scope

<!--
Bullet list of what this PR explicitly does NOT do. The point is
to head off "why didn't you also fix X?" review comments by
listing the deliberate non-goals up front. Existing convention:

  - I33 (business-app product CRUD UI) — `senior-fe` scope.
  - Refactoring shared parse helpers across feature directories —
    local copies stand this iteration per AGENTS.md.
  - A body-size limit middleware (LOW-1 from prior audit) —
    follow-up.
-->

## Follow-ups (non-blocking)

<!--
Anything the author noticed during implementation that is worth
recording but does not need to land in this PR. These are
informational for the owner — they may or may not become new
issues.

Number these so they can be referenced from a future issue body
("implements follow-up #2 from PR #69"). Past PRs have used a
"FOLLOW-UP-N" inline marker; this template uses the same
convention for grep-ability.
-->

1. FOLLOWUP-1 — …
2. FOLLOWUP-2 — …

## Awaiting owner review

<!--
Do not delete this section. Per AGENTS.md "Final Review Gate",
the PR is not self-merged. The owner is the last line of review
and presses the merge button (or requests changes). Confirm
this in the box below so the reviewer doesn't have to scroll
back to AGENTS.md to remember the rule.

[x] Awaiting owner review. Per AGENTS.md Final Review Gate, this
    PR will not be self-merged.
-->