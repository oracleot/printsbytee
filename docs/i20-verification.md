# I20 — API auth (session cookies + bcrypt) verification

**Status:** PASS — manual smoke test exercised every code path  
**Branch:** `feat/i20-auth`  
**Commit verified:** `<filled at PR time>`

## Files added / changed

| Path | Change |
|---|---|
| `apps/api/src/services/passwords.ts` | **new** — bcrypt hash + verify (cost 12, `bcryptjs`) |
| `apps/api/src/services/sessions.ts` | **new** — opaque 32-byte session IDs, cookie helpers, sliding expiry, expired-row sweeper |
| `apps/api/src/middleware/requireSession.ts` | **new** — Hono middleware: cookie → `sessions` JOIN `users` (filtered by `expires_at > now`), slides expiry, attaches `c.get('user')` |
| `apps/api/src/types.ts` | **new** — `AppEnv` / `AppVariables` so handlers get typed `c.get('user' \| 'sessionId')` |
| `apps/api/src/routes/auth.ts` | **new** — `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| `apps/api/src/routes/index.ts` | modified — mount `authApp` under `/auth` |
| `apps/api/scripts/create-owner-user.ts` | **new** — `pnpm create:owner` CLI to seed / rotate the owner password |
| `apps/api/package.json` | modified — `bcryptjs` + `@types/bcryptjs` deps; `create:owner` script |
| `apps/api/.env.example` | modified — `OWNER_EMAIL` / `OWNER_PASSWORD` documented |
| `apps/api/src/env.ts` | modified — note that `SESSION_SECRET` is reserved for future use |
| `apps/api/README.md` | modified — auth section + create-owner usage |
| `packages/shared/src/schemas/auth.ts` | modified — `LoginResponseSchema` / `LoginResponse` type alias, JSDoc on every export |

No new migration was needed — the existing `drizzle/0000_shiny_alice.sql` already creates `users` and `sessions` per the schema defined in I10.

## Typecheck gate

```
pnpm --filter @printsbytee/api typecheck
```

✅ Both `tsc -p tsconfig.json --noEmit` (src) and `tsc -p scripts/tsconfig.json --noEmit` (scripts) pass.

## Manual test plan (executed against a local Postgres + `pnpm dev`)

Every case below was executed against a freshly-migrated database. The owner row was created with `OWNER_PASSWORD="correct-horse-battery-staple"`.

| # | Request | Expected | Got |
|---|---|---|---|
| 1 | `GET /auth/me` (no cookie) | 401 `UNAUTHORIZED` "Authentication required" | ✅ |
| 2 | `POST /auth/login` with wrong password | 401 `UNAUTHORIZED` "Invalid email or password" | ✅ |
| 3 | `POST /auth/login` with unknown email | 401 `UNAUTHORIZED` "Invalid email or password" (same body as #2) | ✅ |
| 4 | `POST /auth/login` with malformed body `{email:"not-an-email", password:""}` | 400 `VALIDATION_ERROR` with field details | ✅ |
| 5 | `POST /auth/login` with valid credentials | 200 `{id, email, createdAt}` + `Set-Cookie: printsbytee_session=...; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000` | ✅ |
| 6 | `GET /auth/me` with the cookie from #5 | 200 `{id, email, createdAt}` matching #5 | ✅ |
| 7 | `GET /auth/me` with `printsbytee_session=garbage` | 401 `UNAUTHORIZED` | ✅ |
| 8 | `POST /auth/logout` with the cookie from #5 | 204 No Content + `Set-Cookie: printsbytee_session=; Max-Age=0; Path=/; SameSite=Lax` | ✅ |
| 9 | `GET /auth/me` after the cookie from #8 was cleared | 401 `UNAUTHORIZED` | ✅ |
| 10 | `POST /auth/logout` with no cookie | 401 `UNAUTHORIZED` | ✅ |
| 11 | `POST /auth/login` with no body | 400 `VALIDATION_ERROR` "Request body must be valid JSON" | ✅ |
| 12 | `POST /auth/login` with non-JSON body | 400 `VALIDATION_ERROR` "Request body must be valid JSON" | ✅ |
| 13 | Login then read `sessions.expires_at` from DB; sleep 2 s; `GET /auth/me`; read `expires_at` again | Second value strictly greater than the first (sliding expiry) | ✅ |
| 14 | Login with `OWNER@EXAMPLE.COM` (uppercase) | 200 (email is lowercased before lookup) | ✅ |
| 15 | Log in twice from two clients → `SELECT COUNT(*) FROM sessions` is 2 | 2 | ✅ |
| 16 | Logout of cookie A → `SELECT COUNT(*) FROM sessions` is 1 | 1 | ✅ |
| 17 | Manually `UPDATE sessions SET expires_at = NOW() - INTERVAL '1 hour'`; `GET /auth/me` with the now-stale cookie | 401 `UNAUTHORIZED` | ✅ |
| 18 | `pnpm create:owner` with a new `OWNER_PASSWORD`; login with the old password | 401 (rotated) | ✅ |
| 19 | `pnpm create:owner` followed by login with the new password | 200 | ✅ |
| 20 | `SELECT substring(password_hash from 1 for 4) FROM users` | `$2a$` (bcrypt format) | ✅ |

### Reproducing locally

```bash
# 0. One-time: spin up Postgres (any local install works) and create a DB.
createdb printsbytee_i20

# 1. Apply the existing migration.
cd apps/api
DATABASE_URL="postgresql://$(whoami)@localhost:5432/printsbytee_i20" \
  pnpm db:migrate

# 2. Seed the owner (re-running with a new password rotates it).
DATABASE_URL="postgresql://$(whoami)@localhost:5432/printsbytee_i20" \
  SESSION_SECRET="dev-only" \
  INTERNAL_API_KEY="dev-only" \
  OWNER_EMAIL="owner@example.com" \
  OWNER_PASSWORD="correct-horse-battery-staple" \
  pnpm create:owner

# 3. Start the API.
DATABASE_URL="postgresql://$(whoami)@localhost:5432/printsbytee_i20" \
  SESSION_SECRET="dev-only" \
  INTERNAL_API_KEY="dev-only" \
  pnpm dev

# 4. From another shell, exercise the endpoints:
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@example.com","password":"correct-horse-battery-staple"}' \
  -c /tmp/c.txt
curl -s http://localhost:3000/auth/me -b /tmp/c.txt
```

## Acceptance-criteria check

| AC | Met by |
|---|---|
| `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` exist | `apps/api/src/routes/auth.ts` mounted at `/auth` in `routes/index.ts` |
| Passwords stored as bcrypt hashes | `apps/api/src/services/passwords.ts` (`bcryptjs` cost 12) |
| Session cookie is httpOnly | `apps/api/src/services/sessions.ts` `cookieOptions` — `httpOnly: true` always |
| Session cookie persisted via DB-backed sessions | `sessions.id` (text PK) = the cookie value; lookup = PK lookup |
| Unauthorized requests rejected consistently | `requireSession` middleware → 401 `UNAUTHORIZED` for missing/garbage/expired; same envelope from `docs/api-surface.md` |
| Shared contracts updated | `packages/shared/src/schemas/auth.ts` exports `LoginRequestSchema`, `LoginResponseSchema`, `AuthMeResponseSchema`, `UserSchema`, `SessionSchema` |

## Notes for the reviewer

- **bcryptjs over native bcrypt** — chosen for deploy-time simplicity (no node-gyp / build toolchain required on Railway or any other Node host). The 3× CPU cost is irrelevant for an owner-only login endpoint that runs a handful of times per day.
- **`SESSION_SECRET` is required but currently unused** — I20 ships DB-backed sessions where the cookie value itself is the session row's PK, so no signing key is consulted on the hot path. The var remains required on boot because it is reserved for future CSRF tokens or session-id rotation. Documented in `src/env.ts`, `apps/api/.env.example`, and `apps/api/README.md`.
- **No rate limiting in this slice** — single-owner audience makes brute-force unrealistic. If a later issue adds multi-user accounts, per-IP and per-account throttling belongs in a separate middleware before `requireSession`.
- **No CSRF middleware in this slice** — `SameSite=Lax` covers the realistic browser flow (the business app is same-origin or top-level navigation). If a later cross-origin client (e.g. a third-party admin tool) starts calling authed endpoints, an explicit CSRF check belongs in `requireSession`. The reserved `SESSION_SECRET` is the natural source for the HMAC key.
- **`create:owner` does not invalidate existing sessions on password rotation** — the documented behavior is "run `DELETE FROM sessions` to force-logout" if you want immediate session invalidation. This is intentional so the rotation script can be re-run in automation without disrupting active sessions unless the operator explicitly opts in.
- **Both `enquiriesApp` and `waitlistApp` are defined in `routes/` but not mounted in `routes/index.ts`** — this is the I15/I16 work landing in parallel branches; I20 deliberately does not mount them, the owner resolves conflicts at merge time.