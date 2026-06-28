# I32 — Business App Sale Recording UI

## Status: In Progress

## Branch
`feat/i32-batch-sale-recording-ui` — worktree at `/Users/damilolaoduronbi/Projects/printsbytee-i32-batch-sale-recording-ui`

## Tasks
- [x] Setup worktree, install deps
- [ ] Create sale-form.tsx (RHF form with optional fields)
- [ ] Create record-sale-dialog.tsx (dialog wrapper)
- [ ] Create undo-sale-button.tsx (confirmation + DELETE)
- [ ] Create sale-details.tsx (read-only sale summary)
- [ ] Create API route: POST /api/batch-items/[id]/sale
- [ ] Create API route: DELETE /api/sales/[id]
- [ ] Update batch-items-table.tsx (record/undo buttons, sold summary)
- [ ] Lint, typecheck, build
- [ ] Browser verification + screenshots

## Collision avoidance (I30/I31)
Do NOT modify:
- batch-form.tsx, batch-form-fields.tsx, batch-form-actions.tsx
- app/(protected)/batches/new/page.tsx, app/(protected)/batches/[id]/edit/page.tsx
- add-batch-items-*, batch-item-*

## Security note
Sale endpoints are authed writes. Routes POST /batch-items/:id/sale and DELETE /sales/:id proxy to API with session cookie. No env or auth changes — this is a UI + proxy implementation. Security review still required before merge.

## Rebase note for PR
This branch is additive to I29 batch list/detail state. When I30/I31 merge, rebase this branch onto main. File ownership is non-overlapping.