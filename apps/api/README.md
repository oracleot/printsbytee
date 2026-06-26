# `@printsbytee/api`

The single source of truth for catalog and production data. Owns the Postgres database and the Cloudflare R2 image bucket, and exposes the endpoints documented in [`docs/api-surface.md`](../../docs/api-surface.md).

This package is the Hono + TypeScript + Drizzle + Zod service that runs on Railway.

## Status

**First deployable slice.** The only route right now is `GET /health` so Railway has something to probe. Real endpoints (products, batches, auth, etc.) land in later issues — see `docs/plan.md`.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm --filter @printsbytee/api dev` | Run locally with `tsx watch` (auto-reload on save). |
| `pnpm --filter @printsbytee/api build` | Compile TypeScript to `dist/` via `tsc`. |
| `pnpm --filter @printsbytee/api start` | Run the compiled output (`node dist/index.js`). |
| `pnpm --filter @printsbytee/api typecheck` | Type-check without emitting. |
| `pnpm --filter @printsbytee/api lint` | Currently the same as `typecheck`; reserved for a real linter later. |
| `pnpm --filter @printsbytee/api db:generate` | Placeholder for Drizzle migration generation (issue #10/#11). |
| `pnpm --filter @printsbytee/api db:migrate` | Placeholder for Drizzle migration runner (issue #11). |

## Environment variables

All vars are loaded and validated by `src/env.ts`. Required vars fail the process on boot with a clear error.

| Var | Required | Notes |
|---|---|---|
| `NODE_ENV` | no | Defaults to `development`. |
| `PORT` | no | Defaults to `3000`. Coerced from string. |
| `DATABASE_URL` | **yes** | `postgres://` or `postgresql://` URL. |
| `SESSION_SECRET` | **yes** | Non-empty string used for session token derivation. |
| `INTERNAL_API_KEY` | **yes** | Non-empty string shared with the website/business-app for internal calls. |
| `SMTP_HOST` | no | Used by `POST /enquiries` (issue #16). |
| `SMTP_PORT` | no | Defaults unset; coerced to number if set. |
| `SMTP_USER` | no | |
| `SMTP_PASS` | no | |
| `ENQUIRY_EMAIL` | no | Must be a valid email if set. |
| `R2_ACCOUNT_ID` | no | Used by `POST /uploads` (issue #22). |
| `R2_BUCKET` | no | |
| `R2_ACCESS_KEY_ID` | no | |
| `R2_SECRET_ACCESS_KEY` | no | |
| `R2_PUBLIC_BASE_URL` | no | Must be a valid URL if set. |

See `.env.example` for placeholder values.

## Local smoke test

Required vars (`DATABASE_URL`, `SESSION_SECRET`, `INTERNAL_API_KEY`) are validated on boot but no real connection or auth happens in this slice, so dummy values are fine:

```bash
cd apps/api
export DATABASE_URL="postgresql://user:password@localhost:5432/printsbytee"
export SESSION_SECRET="dev-only-not-for-production"
export INTERNAL_API_KEY="dev-only-not-for-production"
pnpm dev
# in another shell
curl http://localhost:3000/health
# → {"status":"ok"}
```

The schema/migration layer and the auth endpoints land in later issues, so this slice does **not** connect to Postgres or accept any auth.

## Endpoints

- `GET /health` → `200 { "status": "ok" }` — used by Railway's health check.
- `*` (unmatched) → `404 { "error": { "code": "NOT_FOUND", "message": "..." } }` — matches the error envelope in `docs/api-surface.md`.