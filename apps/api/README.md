# `@printsbytee/api`

The single source of truth for catalog and production data. Owns the Postgres database and the Cloudflare R2 image bucket, and exposes the endpoints documented in [`docs/api-surface.md`](../../docs/api-surface.md).

This package is the Hono + TypeScript + Drizzle + Zod service that runs on Railway.

## Status

**Catalog + auth slice.** The catalog read endpoints (`GET /products`, `GET /products/:slug`) and the owner-auth endpoints (`POST /auth/login`, `POST /auth/logout`, `GET /auth/me`) are live. Write-side business endpoints (products, batches, items, sales) land in later issues — see `docs/plan.md`.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm --filter @printsbytee/api dev` | Run locally with `tsx watch` (auto-reload on save). |
| `pnpm --filter @printsbytee/api build` | Compile TypeScript to `dist/` via `tsc`. |
| `pnpm --filter @printsbytee/api start` | Run the compiled output (`node dist/index.js`). |
| `pnpm --filter @printsbytee/api typecheck` | Type-check without emitting. |
| `pnpm --filter @printsbytee/api lint` | Currently the same as `typecheck`; reserved for a real linter later. |
| `pnpm --filter @printsbytee/api create:owner` | Create (or rotate the password of) the single owner account in `users`. Reads `OWNER_EMAIL` and `OWNER_PASSWORD` from env. |
| `pnpm --filter @printsbytee/api db:generate` | Generate a Drizzle migration from the schema under `src/db/schema/`. Re-running with no schema diff is a no-op. |
| `pnpm --filter @printsbytee/api db:migrate` | Apply pending Drizzle migrations to `DATABASE_URL`. Idempotent — drizzle-kit records each applied migration in `drizzle.__drizzle_migrations` and skips them on re-run. |

### Database migrations

Schema is the Drizzle source-of-truth under `apps/api/src/db/schema/`,
translating [`docs/data-model.md`](../../docs/data-model.md). The
generated migration lives at `apps/api/drizzle/0000_shiny_alice.sql`.

To apply migrations to Railway Postgres, follow
[`docs/deploy/db-migrations.md`](../../docs/deploy/db-migrations.md).
The short version:

```bash
railway link --project printsbytee --service api
railway ssh --service api -- \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  pnpm --filter @printsbytee/api db:migrate
```

The `build`, `typecheck`, and `lint` scripts have `pre*` hooks that build `@printsbytee/shared` first. That package ships its TypeScript declarations via `dist/`, and the API imports from those declarations, so the shared package must be emitted before the API can resolve it. This keeps a clean fresh checkout (e.g. CI) working without extra steps.

## Install / build order

### pnpm workspace flow

Keep using the normal workspace flow for local development:

```bash
pnpm install
pnpm --filter @printsbytee/api dev
```

### npm install fallback

For environments that only run `npm install` inside `apps/api` (for example Railway), `@printsbytee/shared` is linked via a local `file:` dependency instead of pnpm's `workspace:*` protocol.

Build the shared package first so its published entrypoints already exist:

```bash
pnpm --filter @printsbytee/shared build
cd apps/api
npm install --omit=dev
```

After that, `node_modules/@printsbytee/shared/dist/index.js` is available for the API build/runtime.

## Environment variables

All vars are loaded and validated by `src/env.ts`. Required vars fail the process on boot with a clear error.

| Var | Required | Notes |
|---|---|---|
| `NODE_ENV` | no | Defaults to `development`. |
| `PORT` | no | Defaults to `3000`. Coerced from string. |
| `DATABASE_URL` | **yes** | `postgres://` or `postgresql://` URL. |
| `SESSION_SECRET` | **yes** | Non-empty string. Reserved for future use (e.g. signed CSRF tokens); I20 uses DB-backed sessions so the cookie value itself is the session id. |
| `INTERNAL_API_KEY` | **yes** | Non-empty string shared with the website/business-app for internal calls. Enforced at runtime on `POST /enquiries` and `POST /waitlist` via the `requireInternalApiKey` middleware (constant-time comparison via `crypto.timingSafeEqual`). Direct public access to those endpoints is blocked; only the website's proxies can submit. |
| `OWNER_EMAIL` | one-shot | Read by `pnpm create:owner` to seed the single `users` row. Not used at runtime. |
| `OWNER_PASSWORD` | one-shot | Plaintext password for `create:owner`. Never commit it; clear it from shell history after the script runs. Not used at runtime. |
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

Required vars (`DATABASE_URL`, `SESSION_SECRET`, `INTERNAL_API_KEY`) are validated on boot but no real connection or auth happens until the first request hits the API, so dummy values are fine for booting:

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

For the auth slice, also seed an owner user before exercising
`POST /auth/login`:

```bash
export OWNER_EMAIL="owner@example.com"
export OWNER_PASSWORD="$(openssl rand -base64 24)"
pnpm --filter @printsbytee/api create:owner
unset OWNER_PASSWORD
```

See "Manual test plan" below for the full request/response sequence.

## Endpoints

- `GET /health` → `200 { "status": "ok" }` — used by Railway's health check.
- `POST /auth/login` (no auth) → `200 { id, email, createdAt }` + `Set-Cookie: printsbytee_session=...` on success, `401 UNAUTHORIZED` on bad credentials, `400 VALIDATION_ERROR` on malformed body.
- `POST /auth/logout` (session) → `204 No Content` + cleared cookie, `401 UNAUTHORIZED` if no valid session.
- `GET /auth/me` (session) → `200 { id, email, createdAt }`, `401 UNAUTHORIZED` if no valid session.
- `GET /products` → see `docs/api-surface.md` (public catalog list).
- `GET /products/:slug` → see `docs/api-surface.md` (public catalog detail).
- `*` (unmatched) → `404 { "error": { "code": "NOT_FOUND", "message": "..." } }` — matches the error envelope in `docs/api-surface.md`.

## Auth details (I20)

Sessions are DB-backed (see `src/db/schema/auth.ts`, `src/services/sessions.ts`, and `src/middleware/requireSession.ts`):

- The cookie value `printsbytee_session` is an opaque 32-byte CSPRNG token, also the primary key of the `sessions` table. No signing or JWT — the DB lookup is the validity check.
- Cookies are `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production, `Max-Age=2592000` (30 days).
- `expiresAt` is sliding — `requireSession` rewrites it on every authenticated request to keep active users logged in.
- All three auth endpoints emit the canonical error envelope from `docs/api-surface.md`. Failed logins return the same generic `"Invalid email or password"` regardless of which side was wrong, so probing clients cannot enumerate registered emails.

To protect a new endpoint with the session check, mount it behind the middleware:

```ts
import { Hono } from 'hono';
import { requireSession } from '../middleware/requireSession.js';

const router = new Hono();
router.get('/something-secret', requireSession, (c) => {
  const user = c.get('user');
  return c.json({ hello: user.email });
});
```

`c.get('user')` and `c.get('sessionId')` are typed via `src/types.ts`; no per-route annotations are required.
