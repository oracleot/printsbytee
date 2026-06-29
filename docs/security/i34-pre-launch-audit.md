# Security Audit — Pre-Launch (I34)

| Field            | Value                                                                                |
|------------------|--------------------------------------------------------------------------------------|
| Audit            | I34 — Final pre-launch security audit                                                 |
| Issue            | https://github.com/oracleot/printsbytee/issues/34                                    |
| Milestone        | M5 — Business app + hardening                                                        |
| Audit commit     | `4760750` (`476075088423ff47470dca21e29c416473b1d508`) — "chore(agents): require lockfile sync on package.json changes (#83)" on `origin/main` |
| Source base      | `origin/main` after merge of I32 (#82) and the playbook update (#83)                 |
| Audited          | `security-auditor`                                                                   |
| Date             | 2026-06-28                                                                            |
| Scope            | System-level audit — full auth/session/cookie surface, all proxies, all public + authenticated endpoints, env handling, dependency CVEs, logging hygiene |

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0     |
| HIGH     | 2     |
| MEDIUM   | 3     |
| LOW      | 4     |
| INFO     | 8     |

**Verdict: NEEDS_DISCUSSION.**

This is a system-level audit, not a PR review. The auth, session, upload, enquiry, waitlist, and product surfaces are all cleanly implemented and follow the patterns audited in PRs #66/#79/#80/#82. The catalogue is correctly public, every write endpoint is correctly gated by `requireSession`, the session model is sound (32-byte CSPRNG token, opaque cookie value, sliding 30-day expiry, generic 401s, cascading FK behaviour, structured error envelope with no internal leakage in production), bcrypt cost is 12, and the upload pipeline streams through busboy with a hard 10 MB cap and a strict MIME allowlist.

The single highest-stakes finding is **HIGH-1**: `INTERNAL_API_KEY` is documented as the cross-service trust boundary in `docs/api-surface.md`, `apps/api/README.md`, `apps/api/.env.example`, the API env schema, and `docs/deploy/business-app-env.md`. The website proxies and the canonical `apps/website/lib/api-client.ts` faithfully send the key on every cross-service call (in two different header conventions). **The API never validates it.** This is exactly the ambiguity the verdict rubric calls `NEEDS_DISCUSSION`. The owner must decide whether (a) `INTERNAL_API_KEY` is the intended runtime trust boundary and the gap is to be closed before launch (preferred), or (b) it is documentation only and the gap is explicitly waived with a tracking ticket. As-of I34 no production path *needs* the key to be enforced (every website→API call is against a public endpoint; every business-app→API call carries a session cookie), so the practical blast radius is currently low, but the discrepancy between the documented contract and runtime behaviour is a launch blocker unless explicitly resolved.

The remaining finding is **HIGH-2** (HIGH-severity dependency advisories — see `pnpm audit` results), three MEDIUM items (no rate-limiting on `/auth/login`, no HTTP security headers on the API, no global body-size limit), four LOW items (defense-in-depth), and eight INFO items (housekeeping / pre-existing patterns). None of the LOW or INFO items are blocking; none of the CVEs are exploitable in the current code with the exception of the Nodemailer addressparser DoS which is real but low-impact (single-process stall on a malformed address; the API is single-tenant and the affected request still returns 201 because SMTP is best-effort).

The owner should make the HIGH-1 call and the HIGH-2 dep upgrade call before the production launch flag is set. After those two decisions, the platform is APPROVE_WITH_NOTES.

---

## Verification evidence

### Code path & line-counts

| Surface | Files reviewed | Lines |
|---|---|---|
| API app shell | `apps/api/src/app.ts`, `index.ts`, `env.ts`, `db/client.ts` | 137 |
| Auth + sessions | `apps/api/src/routes/auth.ts`, `services/sessions.ts`, `services/passwords.ts`, `middleware/requireSession.ts`, `db/schema/auth.ts` | 533 |
| Products (public + write) | `apps/api/src/routes/products/{index,helpers}.ts`, `handlers/{list,create,update,delete}.ts`, `db/schema/products.ts`, `_shared/stock.ts` | 798 |
| Batches (write) | `apps/api/src/routes/batches/{index,helpers}.ts`, `handlers/{list,create,update,delete,get-sales}.ts`, `_shared/totals.ts` | 605 |
| Batch items (write) | `apps/api/src/routes/batch-items/{index,helpers}.ts`, `handlers/{list,create,update,delete,sale}.ts`, `_shared/bulk-create.ts` | 720 |
| Sales (write) | `apps/api/src/routes/sales/{index,helpers}.ts`, `handlers/undo.ts`, `_shared/{record-sale,sale-helpers,undo-sale}.ts` | 480 |
| Uploads (write) | `apps/api/src/routes/uploads/{index,helpers,errors,streaming}.ts`, `handlers/create.ts`, `services/r2.ts` | 666 |
| Enquiries (public) | `apps/api/src/routes/enquiries.ts`, `services/mail.ts`, `db/schema/leads.ts` | 268 |
| Waitlist (public) | `apps/api/src/routes/waitlist.ts` | 104 |
| Shared schemas | `packages/shared/src/schemas/{auth,common,leads,products,production,sales,uploads,api}.ts` | 234 |
| Website app | `apps/website/lib/{api-client,mail,utils,format*}.ts`, `apps/website/app/api/{enquiry,waitlist,products,products/[slug]}/route.ts`, `apps/website/components/contact/ContactForm.tsx`, `apps/website/components/products/NotifyMeModal.tsx`, `apps/website/next.config.ts` | 460+ |
| Business app | `apps/business-app/lib/{api-server,auth-cookie,uuid,utils,datetime-local,dashboard-types}.ts`, `apps/business-app/app/api/{auth/{login,logout,me},products/{route,[id]/route},batches/{route,[id]/{route,items/route,sales/route}},batch-items/{[id]/{route,sale/route}},sales/[id]/route}/route.ts`, `apps/business-app/app/(protected)/layout.tsx`, `apps/business-app/app/(protected)/error.tsx`, `apps/business-app/next.config.ts` | 1100+ |

All source files ≤ 200 lines per `wc -l` with the exception of `apps/api/src/routes/batch-items/helpers.ts` at 246 lines (see INFO-1).

### Cross-checked patterns

| Pattern | Command | Result |
|---|---|---|
| All routes correctly mounted | `pnpm --filter @printsbytee/api exec tsx scripts/smoke-check-routes.ts` (with placeholder `DATABASE_URL`/`SESSION_SECRET`/`INTERNAL_API_KEY`) | **20/20 required routes present** (POST /waitlist, POST /enquiries, GET /products, POST /auth/login, POST /products, PATCH /products/:id, DELETE /products/:id, GET /batches, POST /batches, GET /batches/:id, PATCH /batches/:id, DELETE /batches/:id, GET /batches/:id/items, POST /batches/:id/items, PATCH /batch-items/:id, DELETE /batch-items/:id, POST /batch-items/:id/sale, GET /batches/:id/sales, DELETE /sales/:id, POST /uploads) |
| `requireSession` mounted on every write route | `grep -rn "requireSession" apps/api/src/routes/` | **18/18 authenticated routes** confirmed: `auth.ts` (POST /logout, GET /me), `products/index.ts` (POST /, PATCH /:id, DELETE /:id), `batches/index.ts` (GET /, POST /, GET /:id, PATCH /:id, DELETE /:id, GET /:id/items, POST /:id/items, GET /:id/sales), `batch-items/index.ts` (PATCH /:id, DELETE /:id, POST /:id/sale), `sales/index.ts` (DELETE /:id), `uploads/index.ts` (POST /) |
| Public routes NOT auth-gated | Same grep + manual read of `auth.ts:152-156` (POST /login is not behind `requireSession`) | ✅ POST /auth/login, GET /products, GET /products/:slug, POST /enquiries, POST /waitlist are all public |
| `INTERNAL_API_KEY` references in `apps/api/src/` | `grep -rn "INTERNAL_API_KEY\|internal-api-key\|x-internal-api-key\|Internal-Api-Key" apps/api/src/` | **3 hits, all in `env.ts:53-57`** (env schema definition only) — zero middleware, zero per-route checks, zero timing-safe comparison |
| `INTERNAL_API_KEY` consumers | `grep -rn "INTERNAL_API_KEY" apps/ packages/` | Website: `apps/website/lib/api-client.ts:22`, `apps/website/app/api/{enquiry,waitlist,products,products/[slug]}/route.ts` (5 distinct files) — all send the key. Business-app: **zero** (uses session-cookie forwarding). Scripts: `apps/api/scripts/{smoke-check-routes.ts,lib/env.ts}` and `.env.example` for documentation. |
| CORS configuration | `grep -rn "cors\|CORS\|hono.*cors" apps/api/src/` | **Zero hits** — no CORS middleware. Default is to reject all CORS, which is correct for an API that is consumed server-to-server. |
| Security headers | `grep -rn "Strict-Transport\|X-Frame\|Content-Security\|Referrer-Policy\|X-Content-Type\|helmet" apps/` | **Zero hits** — no HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy set anywhere |
| Rate limiting | `grep -rn "rate.limit\|throttle\|rateLimit" apps/api/` | **Zero hits** — no per-IP or per-account throttling |
| Body-size limit | `grep -rn "bodyLimit\|maxBodySize\|bodySize" apps/api/src/` | **Zero hits** — Hono's default unbounded JSON body |
| Logging hygiene — sensitive fields | `grep -rn "console\\." apps/api/src/ apps/website/ apps/business-app/` | **16 matches**, all are: `[api] unhandled error` (1, server-side, no body), `@printsbytee/api listening` (1, boot only), `[mail] ...` (5, all envelope-only, no PII), `[Waitlist]/[Products]/[Enquiry] API_BASE_URL not configured` (3, config errors only, no body), `Failed to load ...:` (3, error.message-only on the proxy catch), `[business-app] route error` (1, server-side, no body). No `JSON.stringify(session|cookie|password|token)` matches anywhere except the `login-form.tsx` POST body. |
| Magic-byte sniffing on upload | `grep -rn "magic\|signature\|file-type\|fileType" apps/api/src/routes/uploads/` | **Zero hits** — upload trusts the multipart part's `Content-Type` header |
| HTML/SVG/JS in upload | `apps/api/src/routes/uploads/helpers.ts:65-69` (`UPLOAD_ALLOWED_CONTENT_TYPES = ['image/jpeg','image/png','image/webp','image/avif']`) | ✅ Explicit allowlist, not a blacklist; SVG/HTML/JS rejected at 415 |
| SQL injection surface | `grep -rn "sql\\.raw\|sql\\.identifier" apps/api/src/` | **Zero hits** — all queries use Drizzle's typed query builder; the only `sql` template-literal usages are with static schema references (`sql\`${table.featured} = true\``, `sql\`lower(${table.email})\``, etc.) — none use `sql.identifier()` or `.as()` with user input |
| `dangerouslySetInnerHTML` / `eval(` | `grep -rn "dangerouslySetInnerHTML\|eval(" apps/` | **Zero hits** |
| `next/image` remote pattern | `apps/website/next.config.ts:8-10` | Single explicit pattern: `pub-2b8e0c2c45a245e0920221478de2aed5.r2.dev` (R2 bucket hostname) — no wildcard |
| Secret handling | `git log --all --diff-filter=A --pretty=format:"%H %s" --name-only -- 'apps/api/.env*' 'apps/website/.env*' 'apps/business-app/.env*'` | Only `apps/api/.env.example` ever committed (f7d70a4, scaffold). No real `.env` files. `.gitignore` covers `.env`, `.env.local`, `.env.*.local`. |
| Dependency CVEs | `pnpm audit --prod` | 12 HIGH, 10 MODERATE, 3 LOW, 0 CRITICAL across the workspace |
| File-line cap (≤ 200) | `find apps/api/src -name "*.ts" -exec wc -l {} +` | Largest is `apps/api/src/routes/batch-items/helpers.ts` at 246 (over by 46). See INFO-1. |

### Dependency CVE summary (from `pnpm audit --prod`)

`pnpm audit --prod` reports the following counts:

| Severity | Count | Notes |
|---|---|---|
| CRITICAL | 0 | |
| HIGH | 12 | Drizzle-orm SQL identifier escape (1), Nodemailer addressparser DoS (1), Nodemailer raw-option file-read/SSRF (1), Next.js DoS / Middleware bypass / SSRF / cache poisoning (9) |
| MODERATE | 10 | Mix of Next.js + Nodemailer items |
| LOW | 3 | Mix |
| INFO | 0 | |

The full per-advisory list and exploitability analysis is in **HIGH-2** below. Short version: of the 12 HIGH items, **1 is exploitable in the current code** (Nodemailer addressparser DoS — low impact), **1 is a transitive known-issue** that doesn't match the code (Drizzle SQL identifier escape — the codebase doesn't use `sql.identifier()` or `.as()` with user input), and the rest are Next.js middleware/cache/RSC items that either don't apply to the current code (no middleware, no Cache Components, no i18n) or are DoS-only.

### `pnpm audit` per-advisory detail (HIGH and adjacent)

| Advisory | Title | CVSS | Path | Exploitable here? |
|---|---|---|---|---|
| GHSA-c7w3-x93f-qmm8 (CVE-2026-39356) | Drizzle ORM SQL injection via improperly escaped SQL identifiers | 7.5 | `apps/api > drizzle-orm@0.36.4` | **No.** `grep -rn "sql\\.identifier\|\\.as\\(" apps/api/src/` returns 0 hits. All `sql\`…\`` tags use static schema references only. |
| GHSA-rcmh-qjqh-p98v (CVE-2025-14874) | Nodemailer addressparser DoS via recursive calls | 7.5 | `apps/api > nodemailer@6.10.1` | **Yes — but low impact.** User-supplied `enquiry.email` is passed as `replyTo` (`apps/api/src/services/mail.ts:115`). A malformed address can stall the address parser. The handler is best-effort and the 10s socket timeout caps the stall. |
| GHSA-p6gq-j5cr-w38f | Nodemailer message-level `raw` option bypasses `disableFileAccess` / `disableUrlAccess` | 7.1 | `apps/api > nodemailer@6.10.1` | **No.** `apps/api/src/services/mail.ts:115-122` does not pass `raw`. |
| (no CVE) | Next.js DoS with Server Components | 7.5 | `apps/business-app > next@16.2.2`, `apps/website > next@16.2.2` | **Limited.** Both apps use Server Components. Mitigated by Vercel's edge tier. |
| (no CVE) | Next.js DoS with Server Components (follow-up) | 7.5 | same | **Limited** (duplicate of above). |
| CVE-2026-45109 | Next.js Middleware bypass via segment-prefetch | 7.5 | same | **No.** No `middleware.ts` in either app. |
| CVE-2026-44572 | Next.js Middleware cache poisoning | 3.7 | same | **No.** No middleware. |
| CVE-2026-44581 | Next.js XSS in App Router using CSP nonces | 4.7 | same | **No.** No CSP-nonce usage. |
| CVE-2026-44582 | Next.js cache poisoning via RSC cache-busting collisions | 3.7 | same | **Limited.** Apps do use RSC. Mitigated by Vercel. |
| CVE-2026-44580 | Next.js XSS in `beforeInteractive` scripts with untrusted input | 6.1 | same | **No.** No `beforeInteractive` scripts. |
| CVE-2026-44579 | Next.js DoS via connection exhaustion using Cache Components | 7.5 | same | **No.** No `unstable_cache` / Cache Components. |
| CVE-2026-44578 | Next.js SSRF in apps using WebSocket upgrades | 8.6 | same | **No.** `grep -rn "WebSocket\\|websocket" apps/website apps/business-app` returns 0 hits. No WebSocket usage. |
| CVE-2026-44577 | Next.js DoS in Image Optimization API | 5.9 | same | **Limited.** `apps/website/next.config.ts:8-10` uses `next/image` with one R2 remote pattern. Mitigated by Vercel. |
| CVE-2026-44574 | Next.js Middleware bypass via dynamic route parameter injection | 8.1 | same | **No.** No middleware. |
| CVE-2026-44576 | Next.js cache poisoning in RSC responses | 5.4 | same | **Limited** (RSC is used). |
| CVE-2026-44575 | Next.js Middleware bypass via segment-prefetch (App Router) | 7.5 | same | **No.** No middleware. |
| CVE-2026-44573 | Next.js Middleware bypass in Pages Router using i18n | 7.5 | same | **No.** No middleware, no i18n, App Router only. |

After filtering, the HIGH items that are **actually exploitable in the current code** are limited to the Nodemailer addressparser DoS (see HIGH-2 for treatment).

---

## Findings

### HIGH-1 — `INTERNAL_API_KEY` is documented and sent but never validated at runtime

**Files**:
- Documented as the cross-service trust boundary: `apps/api/README.md:78` ("`INTERNAL_API_KEY` — Non-empty string shared with the website/business-app for internal calls."), `docs/api-surface.md` ("shared `INTERNAL_API_KEY` cross-service"), `docs/deploy/business-app-env.md` ("Bearer token for business-app → API server-to-server calls that should bypass session auth"), `apps/api/.env.example:23` (placeholder + comment), `apps/api/src/env.ts:53-57` (required-to-boot schema).
- Sent on every cross-service call: `apps/website/lib/api-client.ts:22` (`const API_KEY = process.env.INTERNAL_API_KEY ?? '';` → `Authorization: Bearer ${API_KEY}`), `apps/website/app/api/products/route.ts:23-27`, `apps/website/app/api/products/[slug]/route.ts:25-29` (both `Authorization: Bearer`), `apps/website/app/api/enquiry/route.ts:43` and `apps/website/app/api/waitlist/route.ts:38` (both `X-Internal-API-Key`).
- **Never checked at runtime**: `grep -rn "INTERNAL_API_KEY\|internal-api-key\|x-internal-api-key\|Internal-Api-Key" apps/api/src/` returns 3 hits, all of them in `apps/api/src/env.ts:53-57` (the Zod schema that validates the value on boot). **Zero middleware, zero per-route checks, zero timing-safe comparison.**

**Description**. The website-to-API call paths send the configured key with every request, but the API has no code path that inspects the `Authorization: Bearer …` or `X-Internal-API-Key` header. The contract is therefore a "send but don't check" trust signal. The only piece of the contract that *is* enforced is the boot-time Zod check that the value is a non-blank string in `env.ts` — but that check is symmetric on the website/business-app side too, so it provides zero cross-service authentication.

This was first flagged in the I21 audit (PR #66, INFO-2): "*API-side, `INTERNAL_API_KEY` is referenced only in `env.ts` (no middleware, no per-route check) ... gap is closed when a public-facing multi-tenant path lands.*" It was re-confirmed in the I30 audit (PR #79) and the I31 audit (PR #80) as a pre-existing pattern. **The gap has not been closed by I34**, and the launch is the moment when "documentation-only" is hardest to walk back from.

**Impact** (today): low. The current production paths don't *need* the key to be enforced:
- The five website→API calls all hit public endpoints (`GET /products`, `GET /products/:slug`, `POST /enquiries`, `POST /waitlist`). The website's key sends are redundant — the API would accept the same requests with no key at all.
- The business-app→API calls all carry a session cookie (the proxies forward `Cookie: printsbytee_session=…`), and the API checks that cookie via `requireSession`. The business-app does not even read `INTERNAL_API_KEY` (`grep -rn "INTERNAL_API_KEY" apps/business-app/` returns 0 hits).
- No current call path "bypasses session auth", so the missing enforcement has no exploitable blast radius as of I34.

**Impact** (latent): the day a future issue adds an internal-only endpoint (e.g. an admin stats endpoint, a webhook receiver, a backfill script that POSTs to the API), the missing enforcement will be the line of defence that fails. If the owner is treating the README / deploy doc / env-example as a contract, the contract is currently aspirational. A future contributor will reasonably assume the check exists, and the gap will be invisible until someone audits it again.

**Recommended fix** (owner decision — see Verdict guidance). Two paths:

(a) **Enforce the key on designated cross-service routes.** Add an `requireInternalKey` middleware in `apps/api/src/middleware/` that:
- Reads either `Authorization: Bearer <key>` or `X-Internal-API-Key: <key>`.
- Does a timing-safe comparison (`crypto.timingSafeEqual` on the byte buffers) against `env.INTERNAL_API_KEY`.
- Returns `401 UNAUTHORIZED` on mismatch with the canonical `ErrorResponseSchema` envelope.
- Is applied at the router level for any future internal-only routes, OR applied at the app level for the existing public routes with an "if header present, validate it" semantic (so today's misconfigured clients fail loudly instead of silently bypassing).
- The website proxies must be updated to send the header the middleware actually checks (today they send *two* different headers — pick one).

(b) **Document the key as documentation-only** and add a tracking ticket. Update `docs/api-surface.md`, `apps/api/README.md`, and `apps/api/.env.example` to say "the key is reserved for future enforcement; today it is only validated to be non-blank on boot." Add a `junior-api` ticket to close the gap when the first internal-only endpoint lands.

(a) is preferred because the documentation already implies enforcement and the cost of adding the middleware is small (one file, ~30 lines). But (a) is a behavioural change to the launch — it should be merged as a separate PR with its own security audit, not as a silent code change in I34.

**Owner**: owner-decision (gate on launch); `junior-api` to implement whichever path the owner picks.

**Blocking**: yes (the launch should not be flipped without an explicit owner call on this gap).

---

### HIGH-2 — Twelve HIGH-severity dependency advisories; one is exploitable in the current code, one is a transitive known-issue, ten are Next.js items that mostly don't apply

**Files**:
- `apps/api/package.json:31-46` (deps: `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `@hono/node-server`, `bcryptjs@^2.4.3`, `busboy`, `drizzle-orm@^0.36.0`, `hono`, `nodemailer@^6.10.0`, `pg`, `zod`)
- `apps/website/package.json`, `apps/business-app/package.json` (deps include `next@16.2.2`)

**Description**. `pnpm audit --prod` reports 12 HIGH-severity advisories. The full table is in the "Verification evidence" section above. Brief exploitability assessment:

- **Drizzle ORM SQL injection via improperly escaped SQL identifiers** (CVE-2026-39356, CVSS 7.5): the vulnerable pattern is `sql.identifier(userInput)` or `users.as(userInput)`. The codebase does neither — all `sql\`…\`` template tags are static schema references, and there is no `.as()` on user-controlled names. **Not exploitable today**, but the dep should be upgraded to `>=0.45.2` to remove the warning and to harden the future use case.
- **Nodemailer addressparser DoS via recursive calls** (CVE-2025-14874, CVSS 7.5): `apps/api/src/services/mail.ts:115` passes `replyTo: enquiry.email`. A malicious `email` field on `POST /enquiries` can stall the address parser. The handler is best-effort with a 10s `socketTimeout` / `connectionTimeout` (`mail.ts:97-98`), so the worst case is one process-thread blocked for ≤ 10s. Multiple concurrent malicious submissions could saturate the single-process event loop. **Exploitable, low impact.** Upgrade to `nodemailer@^7.0.11` or later.
- **Nodemailer message-level `raw` option bypasses `disableFileAccess` / `disableUrlAccess`** (CVSS 7.1): the API does not pass `raw` to `sendMail`. **Not exploitable.** Upgrade is still prudent because the option exists in the public API surface.
- **Next.js DoS, Middleware bypass, SSRF, cache poisoning, XSS** (10 items, CVSS 3.7–8.6): the apps do not use `middleware.ts` (`find apps -name "middleware.ts"` returns 0), do not use WebSocket upgrades (`grep -rn "WebSocket" apps/website apps/business-app` returns 0), do not use `unstable_cache` or Cache Components, do not use `beforeInteractive` scripts, do not use CSP nonces, and do not use i18n. The most concerning CVSS 8.6 item (SSRF via WebSocket upgrades, CVE-2026-44578) does not apply because WebSocket upgrades are not used. The CVSS 8.1 Middleware bypass (CVE-2026-44574) does not apply because there is no middleware. The remaining items are DoS / cache-poisoning items that are mitigated by Vercel's edge tier; the underlying `next@16.2.2` should still be upgraded to `>=16.2.6` for hygiene.
- **Three additional Nodemailer items in `apps/api`** (MODERATE): all address the same dep upgrade.

**Impact**. The platform can launch today without fixing the items that don't apply. The Nodemailer addressparser DoS is the one finding that should be upgraded before launch because the upgrade is a one-line `^7.0.11` change in `apps/api/package.json` and the lockfile is already in sync. The other upgrades can land in a follow-up sweep.

**Recommended fix** (in launch-blocking order):
1. Upgrade `nodemailer` from `^6.10.0` to `^7.0.11` in `apps/api/package.json` (single dep; addresses HIGH-2 addressparser DoS and HIGH-2 raw-option bypass). Re-run `pnpm install --frozen-lockfile`, then re-run `pnpm audit --prod` to confirm the HIGH Nodemailer items are gone.
2. Upgrade `drizzle-orm` from `^0.36.0` to `^0.45.2` in `apps/api/package.json` (single dep; addresses the SQL-identifier CVE).
3. Upgrade `next` from `16.2.2` to `>=16.2.6` in `apps/website/package.json` and `apps/business-app/package.json` (addresses the items that don't apply today but will start to apply as the apps grow — the DoS items are the most likely to become reachable).

Steps (1) and (2) are in scope for `junior-api`. Step (3) is in scope for `junior-fe`. All three are one-line dep version bumps; the AGENTS.md / PR #83 policy of lockfile sync on package.json changes means they should land as one PR per dep, audited by `security-auditor`.

**Owner**: `junior-api` (Nodemailer, Drizzle), `junior-fe` (Next.js).

**Blocking**: yes for the Nodemailer upgrade (HIGH-2 addressparser is exploitable today). The Drizzle and Next.js upgrades are recommended before launch and required before the first user-data growth milestone.

---

### MEDIUM-1 — No rate-limiting on `POST /auth/login`; brute-force possible

**Files**: `apps/api/src/routes/auth.ts:152-170` (login handler), `apps/api/src/app.ts` (no rate-limit middleware), `apps/api/src/middleware/` (no rate-limit middleware).

**Description**. The I20 audit (referenced in the JSDoc at `apps/api/src/routes/auth.ts:44-49`) explicitly deferred rate-limiting: "*Rate limiting is intentionally out of scope for I20 — the single-owner audience makes brute-force unrealistic. If a later issue introduces multi-user accounts or staff roles, per-IP and per-account throttling belongs in a separate middleware before this file.*" I34 is the launch milestone; that footnote needs to become a real decision.

Today, a single attacker can submit unlimited `POST /auth/login` requests. Each request runs `bcrypt.compare` (cost 12, ~700ms on bcryptjs), so a sustained attack would saturate the single-process event loop but is naturally rate-limited by bcrypt's own CPU cost. A modern attacker can still achieve ~1 attempt/second per process core. Combined with no lockout and a single-owner audience, the practical impact is: the attacker can mount a slow online attack against the owner's password.

The single-owner threat model (one email, one password) does not make this safe — the operator's `OWNER_PASSWORD` may be reused, and a leaked password elsewhere is a direct path in. bcrypt at cost 12 is the floor, not the ceiling.

**Impact**: medium. Defeats the cost-12 bcrypt protection only if the operator's password is in a known breach or is otherwise weak. The threat is real for an internet-facing Railway-hosted service.

**Recommended fix** (not blocking, but expected for a launch-grade deploy):
- Per-IP and per-email sliding-window rate-limit on `POST /auth/login`. The Hono middleware ecosystem has `hono-rate-limiter` and a few alternatives; any one of them with a 5-attempts-per-15-minutes-per-IP policy is sufficient for the single-owner audience.
- Account lockout after N consecutive failures (e.g. 20) within a window — reset on successful login.
- Optionally, a `Retry-After` header on the 401 response so a polite attacker backs off.

**Owner**: `junior-api`.

**Blocking**: no (single-owner audience; bcrypt cost 12 is the floor). Document as an expected hardening item for the post-launch hardening milestone.

---

### MEDIUM-2 — No HTTP security headers on the API

**Files**: `apps/api/src/app.ts` (no `app.use('*', setHeaders(...))`), `apps/website/next.config.ts` (no `headers()` config), `apps/business-app/next.config.ts:1-3` (empty `NextConfig`).

**Description**. The API does not set any of: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy`. The Next.js apps likewise have no `headers()` config in their `next.config.ts`. The frontend apps' primary security comes from `next/image` remote-pattern locking and React's default escaping, so the missing CSP is not catastrophic, but the API's 4xx/5xx JSON responses do not need `X-Frame-Options` for direct browser use yet they benefit from `nosniff` to prevent a misconfigured CDN from re-interpreting them as HTML.

**Impact**: low-to-medium. The API is consumed server-to-server (Vercel → Railway, never the browser directly), so the practical XSS / clickjacking surface is minimal. The website is a public catalogue, but the missing CSP means a future XSS would not be contained by a defence-in-depth header.

**Recommended fix**: add a `app.use('*', (c, next) => { c.header('X-Content-Type-Options', 'nosniff'); c.header('Referrer-Policy', 'strict-origin-when-cross-origin'); return next(); })` to `apps/api/src/app.ts` (Hono middleware order is well-suited). For the website, add a `headers()` config in `apps/website/next.config.ts` setting `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a reasonable `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (Vercel automatically upgrades HTTP→HTTPS so HSTS is mostly handled, but the header is still useful). For the business-app, do the same. A future CSP can be added incrementally once the inline-style / inline-script audit is done.

**Owner**: `junior-api` (API), `junior-fe` (Next.js apps).

**Blocking**: no.

---

### MEDIUM-3 — No global body-size limit on JSON requests (carried from PR #66 audit, INFO-1)

**Files**: `apps/api/src/app.ts` (no `bodyLimit` middleware), all `POST`/`PATCH` handlers that call `await c.req.json()`.

**Description**. The I21 audit (PR #66) flagged this as LOW-1: "*Hono middleware enforces body-size via `Content-Length` (reject on > 256 KB product writes; 1 MB global); current 500/400 error handler handles 413 if exceeded.*" The I31 audit (PR #80) re-flagged it as INFO-3 because the bulk-add endpoint accepts an array of items: with no row cap, an authenticated attacker can `POST /batches/:id/items` with a 5–10 MB body of 100k entries. I34 is the launch milestone; the gap is still open.

The single-owner audience makes this an authenticated DoS, not an unauthenticated one — an attacker needs a valid session cookie. But because the session expiry is 30 days, a stolen session is enough to attempt this. A 100k-item INSERT in a single transaction would also pin a `batch_items` lock and could starve concurrent writes.

**Impact**: medium for the bulk-add endpoint (one-shot write amplification), low for everything else (single-record PATCH).

**Recommended fix**:
- Add a global `bodyLimit` middleware in `apps/api/src/app.ts` that rejects `Content-Length > 1 MB` with a 413 `PAYLOAD_TOO_LARGE` envelope.
- Add a per-row cap in the `CreateBatchItemsBulkRequestSchema` (the I31 audit already suggested `z.array(...).min(1).max(1000)`). This is the more important fix because it bounds the INSERT cost independently of the body size.

**Owner**: `junior-api`.

**Blocking**: no (single-owner audience; authenticated-only). Documented as expected hardening for the first quarter post-launch.

---

### LOW-1 — Upload trust boundary is the multipart `Content-Type` header, not the file content

**Files**: `apps/api/src/routes/uploads/streaming.ts:78-81` (`isAllowedContentType(rawType)`), `apps/api/src/routes/uploads/helpers.ts:73-79` (allowlist), `apps/api/src/services/r2.ts:108-115` (`uploadObject` sets `ContentType: contentType` on the S3 PUT).

**Description**. The upload pipeline uses the `Content-Type` from the multipart part header (the busboy `info.mimeType` callback) for both the allowlist check and the `ContentType` property sent to R2. It does no magic-byte sniffing — an authenticated attacker can upload a file labelled `image/jpeg` that is actually a polyglot HTML/JPEG, a small ZIP, or a JavaScript payload.

The R2 bucket is configured for public-read access (per `docs/deploy/r2-image-upload.md`). The served `Content-Type` will be the value set on the PUT, so a browser that follows the public URL will receive the file with the `image/jpeg` Content-Type the attacker claimed. In the current website code, all image rendering goes through `next/image` with the locked remote pattern (`apps/website/next.config.ts:8-10`); `next/image` will treat the file as an image and may fail to decode it. There is no path that follows the R2 URL and renders the bytes as HTML, so the XSS-via-upload vector is not reachable in the current site.

The defence-in-depth gap is the lack of magic-byte sniffing: a future change that serves R2 URLs directly (e.g. `<a href={url}>` without going through `next/image`, or a CDN that re-encodes the response) would become an XSS vector.

**Impact**: low (no current path serves R2 bytes as HTML), defense-in-depth only.

**Recommended fix**:
- Add a magic-byte sniffer (`file-type` npm package, ~1 KB, no native deps) that runs on the first 4 KB of the busboy file stream and rejects if the detected MIME does not match the claimed `Content-Type` AND is not in the allowlist.
- Or, server-side, re-encode every uploaded image through sharp / jimp to strip any embedded payloads. Heavier.

The minimum viable fix is the magic-byte sniff. This is also good housekeeping for future defence-in-depth.

**Owner**: `junior-api`.

**Blocking**: no.

---

### LOW-2 — `ENQUIRY_EMAIL` recipient is in env (not code) but the inquiry mail is otherwise unencrypted at rest in Postgres

**Files**: `apps/api/src/services/mail.ts:39-45` (uses `env.ENQUIRY_EMAIL`), `apps/api/src/db/schema/leads.ts:21-39` (enquiries table).

**Description**. The enquiry recipient email address is correctly read from `env.ENQUIRY_EMAIL` (`mail.ts:75-80`), not hard-coded. This means the owner can rotate it without a code change. Good. However, the enquiry body itself (name, email, productId, message) is stored in plaintext in the `enquiries` table. Same for `sales.customerName` / `sales.customerContact` in the `sales` table. Postgres is at-rest encrypted by Railway's default storage encryption, but application-level encryption is not in place.

For a single-owner low-traffic catalogue site, plaintext PII at rest is acceptable. For any future expansion (multi-user, EU customers, longer retention) it becomes a GDPR / data-handling concern.

**Impact**: low. Not a vulnerability today; a documented design choice that should be revisited before any multi-tenant expansion.

**Recommended fix**: leave as-is for launch; document in a follow-up ticket that application-level encryption or shorter retention is a future requirement.

**Owner**: `junior-api` (document), `senior-api` (decide if/when to encrypt).

**Blocking**: no.

---

### LOW-3 — Two different header conventions for `INTERNAL_API_KEY` across the website

**Files**: `apps/website/lib/api-client.ts:54` and `apps/website/app/api/products/route.ts:27` and `apps/website/app/api/products/[slug]/route.ts:29` all send `Authorization: Bearer <key>`. `apps/website/app/api/enquiry/route.ts:43` and `apps/website/app/api/waitlist/route.ts:38` send `X-Internal-API-Key: <key>`.

**Description**. Whichever path the API middleware takes (if HIGH-1 is fixed), the website currently sends the key in two different header names. The API never validates either, so today it doesn't matter. After HIGH-1 is fixed, only one of these will be checked; the other becomes a footgun.

**Impact**: low today (no enforcement), future footgun if HIGH-1 is fixed without normalising the website's senders.

**Recommended fix**: when HIGH-1 is closed, normalise the website to a single header. The `Authorization: Bearer` convention is the more common one and matches what the api-client and the two deprecated products proxies already use, so consolidating to `Authorization: Bearer` is the lower-friction call. Update `apps/website/app/api/enquiry/route.ts:43` and `apps/website/app/api/waitlist/route.ts:38` to match.

**Owner**: `junior-fe`.

**Blocking**: no (rolls into HIGH-1's fix).

---

### LOW-4 — `apps/website/lib/mail.ts` is dead code that reads `SMTP_PASS` from env

**Files**: `apps/website/lib/mail.ts` (entire file, 99 lines), `apps/website/components/contact/ContactForm.tsx:73` (uses `fetch("/api/enquiry")`, not the local `sendEnquiryEmail`).

**Description**. `apps/website/lib/mail.ts` exports `sendEnquiryEmail` and reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` from `process.env`. `grep -rn "sendEnquiryEmail\|from.*lib/mail" apps/website/` returns zero matches outside the file itself — the function is not called from any route handler or component. The live enquiry path is `ContactForm.tsx → POST /api/enquiry (website) → POST /enquiries (API) → sendEnquiryNotification` (`apps/api/src/services/mail.ts`).

The file is leftover from before the API took over the enquiry ingestion. It still reads `SMTP_PASS` at import time (lazily, in `getSMTPConfig`, but still in a server module). On Vercel, `SMTP_PASS` is not in the website's env, so `getSMTPConfig` would throw if called — but it isn't called, so no actual exposure. The risk is purely "future contributor sees this file and thinks the website sends mail directly, then adds an `SMTP_PASS` to Vercel and un-deads the path" — at which point the API's mail-send would be duplicated.

**Impact**: low. Dead code, no current execution path. Housekeeping concern.

**Recommended fix**: delete `apps/website/lib/mail.ts` in a small `junior-fe` housekeeping PR. Verify with `pnpm --filter website typecheck` and `pnpm --filter website lint` (currently the same command — `tsc --noEmit` per `apps/website/package.json`).

**Owner**: `junior-fe`.

**Blocking**: no.

---

### INFO-1 — `apps/api/src/routes/batch-items/helpers.ts` is 246 lines (over the 200-line cap)

**File**: `apps/api/src/routes/batch-items/helpers.ts` (246 lines, 46 over the cap).

**Description**. The repo's `AGENTS.md` enforces a 200-line-per-source-file cap. The I32 audit (PR #82) and earlier audits (I30, I31) all passed the cap check; this audit found one file over. The file is the batch-items handlers' shared helpers (UUID validation, body parsing, DTO conversion, sold-item guards, batch-item-update guards). The duplication-with-other-modules comment at the top of the file already notes that the project defers the refactor to avoid pulling every route into one large change.

**Impact**: none. The file is well-organised, well-commented, and below the cognitive-load threshold even at 246 lines. The 200-line cap is a soft rule; the 46-line overage is not a defect.

**Recommended fix**: optional. The `junior-api` can split this into `_shared/dto.ts` (the `toBatchItemDto` / `toBatchItemRow` converters), `_shared/guards.ts` (the `batchItemSoldStatusChangeGuardResponse` / `batchItemAlreadySoldResponse`), and `helpers.ts` (the `parseIdParam` / `parseJsonBody` body of ~50 lines). Not blocking.

**Owner**: `junior-api` (optional cleanup).

**Blocking**: no.

---

### INFO-2 — Deprecated website products proxies are still mounted and reachable

**Files**: `apps/website/app/api/products/route.ts` and `apps/website/app/api/products/[slug]/route.ts`.

**Description**. Both files carry `@deprecated` JSDoc and route the request to the API. They are not used by any current client code (`grep -rn "/api/products" apps/website/components apps/website/app | grep -v api/products` returns 0 hits). They still send `INTERNAL_API_KEY` (per HIGH-1's gap) and still return 200 with a `{ products }` envelope. They are listed in `docs/api-surface.md` (or implied by the "deprecated catalog proxies" scout note) as candidates for removal in a follow-up.

**Impact**: none today. They are dead in practice; if they are never removed, they will become the easiest "unexpected proxy" for a future contributor to abuse (because the public can hit them, they look like part of the public surface, and they are not behind the cookie check). Defence-in-depth argues for removal.

**Recommended fix**: `junior-fe` deletes both files and the corresponding `apps/website/app/api/products` directory in a follow-up. Verify the canonical `apps/website/lib/api-client.ts` path is the only consumer of the API for products, then commit a deletion PR.

**Owner**: `junior-fe`.

**Blocking**: no.

---

### INFO-3 — `customerName` / `customerContact` and `enquiry.message` are stored verbatim with no length cap beyond the Zod `min(1)`

**Files**: `apps/api/src/db/schema/leads.ts:25-26` (`message: text('message').notNull()`), `apps/api/src/db/schema/batches.ts:163-164` (`customer_name: text('customer_name')`, `customer_contact: text('customer_contact')`), `packages/shared/src/schemas/sales.ts:8-9` (Zod shape — both `z.string().nullable()` with no max).

**Description**. PostgreSQL `text` has no length limit. The shared Zod schemas (`RecordSaleRequestSchema`, `EnquirySchema`, `CreateEnquiryRequestSchema`) only validate that the fields are non-empty strings; no `.max(N)` is applied. The business-app's `SaleForm` adds a `maxLength={200}` on the input (per the I32 audit's PII note), but that is a UI constraint, not a server constraint. A 10 MB `message` would pass the Zod check and the row insert, and a `customerContact` of 1 MB would do the same.

**Impact**: none in practice — the body-size limit (or lack thereof, per MEDIUM-3) is the practical bound today. If MEDIUM-3 is fixed, an attacker (or a misbehaving form) could still submit very large `message` fields that fill the database.

**Recommended fix**: when MEDIUM-3 is fixed, also add `.max(2000)` to `message` in `CreateEnquiryRequestSchema` and `.max(200)` to `customerName` / `customerContact` in `RecordSaleRequestSchema`. Mirrors the business-app's UI maxLength and is the documented owner copy budget.

**Owner**: `junior-api`.

**Blocking**: no.

---

### INFO-4 — `apps/business-app/app/(protected)/error.tsx` surfaces `error.message` to the user

**Files**: `apps/business-app/app/(protected)/error.tsx:26` (`<p>{error.message || "An unexpected error occurred while loading this page."}</p>`).

**Description**. Next.js error boundaries receive an `Error` whose `message` is the actual error in development but is replaced with a generic "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details." in production. So the current code is safe in production (the `error.message` in production is the generic Next.js string), and useful in development. No change needed.

**Recommended action**: none. Documented for completeness because it is the kind of file that often leaks in a refactor. If a future change replaces the `<p>` with a custom error string pulled from the API, ensure the API still returns the canonical envelope and not raw `err.message`.

**Owner**: none.

**Blocking**: no.

---

### INFO-5 — `bcryptjs` (pure JS) instead of native `bcrypt`

**Files**: `apps/api/src/services/passwords.ts:9-13` (rationale documented), `apps/api/package.json:35` (`bcryptjs@^2.4.3`).

**Description**. The I20 audit's documented choice was to use `bcryptjs` (pure JS, deploys on any host) instead of `bcrypt` (native, requires a `node-gyp` toolchain). At cost 12, `bcryptjs` takes ~700ms per compare on the reference machine vs ~250ms for native bcrypt. For a single-owner audience that logs in a handful of times per day, the CPU cost is irrelevant. The defence-in-depth note: the cost factor is the primary brute-force defence; the implementation is the secondary. Documented for completeness.

**Recommended action**: none. The choice is sound for this host target (Railway, Vercel-deployable).

**Owner**: none.

**Blocking**: no.

---

### INFO-6 — `SESSION_SECRET` is required on boot but not used at runtime (today)

**Files**: `apps/api/src/env.ts:38-44`, `apps/api/.env.example:11-19`.

**Description**. `SESSION_SECRET` is in the required env schema and will fail the API on boot if missing. The JSDoc explains: "*I20 ships DB-backed sessions where the cookie value IS the session row's primary key, so `SESSION_SECRET` is not consulted on every authenticated request today. It remains required on boot because it is reserved for future use — e.g. signing CSRF tokens, or re-issuing session ids when the secret is rotated.*" This is sound future-proofing. The risk is that a future contributor will assume `SESSION_SECRET` *is* doing something today and write a security argument that depends on it; today the cookie is just an opaque DB row PK, not a signed token. Documented for completeness.

**Recommended action**: none. The JSDoc on `env.ts:38-44` and the README already explain this.

**Owner**: none.

**Blocking**: no.

---

### INFO-7 — Waitlist duplicates return 409, but the 409 is generic ("Already on the waitlist for this product") so the email is not enumerable

**Files**: `apps/api/src/routes/waitlist.ts:76-84` (the 409 path).

**Description**. The waitlist endpoint uses a unique constraint `(productId, email)` and returns 409 on duplicate. The 409 message is the same regardless of whether the email was previously registered, so a probing client cannot tell "this email is on the waitlist" from "this email is *not* on the waitlist" by observing the 409. The website proxy at `apps/website/app/api/waitlist/route.ts:62-67` translates the 409 to a user-friendly "You're already on the waitlist for this product" string, but that is the same message either way (you would say that even if the email is not registered, you just don't know it).

**Impact**: none. Email enumeration is not feasible through the waitlist endpoint.

**Owner**: none.

**Blocking**: no.

---

### INFO-8 — Enquiry recipient is hard-coded to the same address as the `SMTP_USER` from address; if the operator wants a different `From`, the current code does not support it

**Files**: `apps/api/src/services/mail.ts:78-81` (`const from = user;`).

**Description**. The mail transport's `from` is set to `SMTP_USER` (the authenticated SMTP user), because most SMTP providers require the `From` to match the auth user. The JSDoc explains the trade-off. If a future issue wants a `no-reply@…` From with a different auth user, the env schema needs an extra `SMTP_FROM` (or similar). Not a current limitation; documented for completeness.

**Owner**: none.

**Blocking**: no.

---

## Cross-cutting observations

- **CORS**: zero configuration. The default Hono behaviour rejects all cross-origin browser requests. This is the correct default for an API that is consumed server-to-server. The business-app's proxies call the API from the Vercel edge / Node runtime (not the browser), so they don't need CORS. The website's lib/api-client also calls the API from the server. No browser origin ever calls the API directly, so CORS is a non-issue. **No action required.**
- **CSRF**: `SameSite=Lax` on `printsbytee_session` blocks cross-site `POST`/`PATCH`/`DELETE` from sending the cookie. The single-owner audience makes CSRF a low-priority concern. The I21 audit (PR #66, INFO-3) flagged this as a pre-existing pattern. No change.
- **Public read caching**: `apps/website/lib/api-client.ts:58` sets `next: { revalidate: 60 }` for the 60-second Next.js data cache on the public catalogue reads. This is a sensible default — it bounds the upstream load on the API and provides a small DoS cushion. No `Cache-Control` header is set on the API itself (the API is consumed by Next.js's fetch, which respects the Next-level cache). The catalogue is a low-cardinality set of products (~10) so a 60-second cache is fine; a future larger catalogue may want a shorter TTL on the home-page call and a longer TTL on the PDP call.
- **FK cascade behaviour**: matches `docs/data-model.md`. Users → sessions is CASCADE (deleting a user cleans up sessions). Products → batch_items is RESTRICT (deleting a product with items is refused). Products → waitlist is RESTRICT. Products → enquiries is SET NULL (enquiry survives product deletion as a historical record). ProductionBatch → batch_items is CASCADE. BatchItem → sales is CASCADE.
- **Smoke check**: `apps/api/scripts/smoke-check-routes.ts` (run with placeholder env vars) verifies the 20 required routes are mounted. All present.
- **Message-pin tests**: `apps/api/scripts/test-uploads-message-pins.ts` asserts the upload wire-string pins, the MIME allowlist, the key builder, and the error-envelope builders. The equivalent `test-sale-message-pins.ts` and `test-product-delete-fk-mapping.ts` cover the other handlers. Good defensive practice.

---

## Coverage matrix

| Surface | File(s) | Reviewed | Notes |
|---|---|---|---|
| `POST /auth/login` | `apps/api/src/routes/auth.ts:152-189` | ✅ | Generic 401 on mismatch; bcrypt cost 12; constant-time compare via `bcrypt.compare`; fake-hash timing-equalisation. No rate limiting (MEDIUM-1). |
| `POST /auth/logout` | `apps/api/src/routes/auth.ts:174-188` | ✅ | Behind `requireSession`; deletes the session row first, then clears the cookie; 204 on success. |
| `GET /auth/me` | `apps/api/src/routes/auth.ts:191-203` | ✅ | Behind `requireSession`; returns the canonical `UserSchema` shape (id, email, createdAt — no `passwordHash`). |
| Session cookie model | `apps/api/src/services/sessions.ts` | ✅ | 32-byte CSPRNG token (`randomBytes(32).toString('base64url')`); `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in prod, `Max-Age=30d`; sliding expiry via `slideSessionExpiry` on every `requireSession`; `deleteExpiredSessions` sweep on every `createSession`. |
| Session storage | `apps/api/src/db/schema/auth.ts` | ✅ | `sessions.id` is the PK (text, opaque); FK to `users` with `ON DELETE CASCADE`; `expiresAt` indexed for sweep. |
| Password storage | `apps/api/src/services/passwords.ts` | ✅ | `bcryptjs@^2.4.3`, cost 12. Hash format is `$2a$…` and is forward-compatible with native `bcrypt`. |
| `requireSession` middleware | `apps/api/src/middleware/requireSession.ts` | ✅ | Reads cookie → joins `sessions → users` on `expiresAt > now()`; 401 on any failure with a generic message; slides expiry on success. |
| `GET /products` | `apps/api/src/routes/products/handlers/list.ts:34-86` | ✅ | Public; Zod-validated query (category, inStock, featured); no PII in response; ordering by `name` for stability. No pagination today — at ~10 products this is fine. |
| `GET /products/:slug` | `apps/api/src/routes/products/handlers/list.ts:88-118` | ✅ | Public; 404 on unknown slug; derived stock fields. No PII. |
| `POST /products` | `apps/api/src/routes/products/handlers/create.ts` | ✅ | Behind `requireSession`; 409 on slug uniqueness; immutable-field check on PATCH. |
| `PATCH /products/:id` | `apps/api/src/routes/products/handlers/update.ts` | ✅ | Behind `requireSession`; rejects `id`/`slug` in body; 409 on uniqueness (defensive). |
| `DELETE /products/:id` | `apps/api/src/routes/products/handlers/delete.ts` | ✅ | Behind `requireSession`; 409 with FK-violation-aware message (per `FK_CONSTRAINT_MESSAGES` in `products/helpers.ts:45-50`). |
| `GET /batches` | `apps/api/src/routes/batches/handlers/list.ts:39-77` | ✅ | Behind `requireSession`; Zod-validated date filters. |
| `POST /batches` | `apps/api/src/routes/batches/handlers/create.ts` | ✅ | Behind `requireSession`; Zod schema enforces integer pence for all four `productionCost` subfields and `marketingCost`. |
| `GET /batches/:id` | `apps/api/src/routes/batches/handlers/list.ts:79-114` | ✅ | Behind `requireSession`; returns `ProductionBatchWithTotals` with the `totals` object per ADR-0003. |
| `PATCH /batches/:id` | `apps/api/src/routes/batches/handlers/update.ts` | ✅ | Behind `requireSession`; rejects `id`/`createdAt`/`updatedAt` in body; empty body → 400. |
| `DELETE /batches/:id` | `apps/api/src/routes/batches/handlers/delete.ts` | ✅ | Behind `requireSession`; 409 if any item is `sold`; items + sales CASCADE. |
| `GET /batches/:id/items` | `apps/api/src/routes/batch-items/handlers/list.ts` | ✅ | Behind `requireSession`; 404 on unknown batch. |
| `POST /batches/:id/items` | `apps/api/src/routes/batch-items/handlers/create.ts` | ✅ | Behind `requireSession`; bulk create in a single transaction. **No row cap** (carries PR #80 LOW-1). |
| `PATCH /batch-items/:id` | `apps/api/src/routes/batch-items/handlers/update.ts` | ✅ | Behind `requireSession`; rejects `id`/`batchId`/`productId`/`createdAt`/`updatedAt` in body; status=`sold` in body → 400 (use the sale endpoint). **Sold-item patch guard** in `batch-items/helpers.ts::batchItemSoldStatusChangeGuardResponse` (PR #81). |
| `DELETE /batch-items/:id` | `apps/api/src/routes/batch-items/handlers/delete.ts` | ✅ | Behind `requireSession`; 409 if a sale references the item. |
| `POST /batch-items/:id/sale` | `apps/api/src/routes/batch-items/handlers/sale.ts` | ✅ | Behind `requireSession`; `SELECT … FOR UPDATE` lock in `recordSaleTx`; 409 if already sold; 404 if unknown. |
| `DELETE /sales/:id` | `apps/api/src/routes/sales/handlers/undo.ts` | ✅ | Behind `requireSession`; `undoSaleTx` flips item to `sellable` and deletes the sale in one transaction. |
| `GET /batches/:id/sales` (new in I32) | `apps/api/src/routes/batches/handlers/get-sales.ts` | ✅ | Behind `requireSession`; returns `Sale[]` for the batch. |
| `POST /uploads` | `apps/api/src/routes/uploads/handlers/create.ts` | ✅ | Behind `requireSession`; busboy streaming; 10 MB cap; MIME allowlist; R2 credentials never logged. Trusts Content-Type header (LOW-1). |
| `POST /enquiries` | `apps/api/src/routes/enquiries.ts` | ✅ | Public; Zod-validated (name, email, productId?, message); persist-first then SMTP best-effort; 400 on FK violation. |
| SMTP send | `apps/api/src/services/mail.ts` | ✅ | 10s timeout; never throws; **exposes the Nodemailer addressparser DoS** (HIGH-2). |
| `POST /waitlist` | `apps/api/src/routes/waitlist.ts` | ✅ | Public; Zod-validated; unique-constraint 409 with generic message (no email enumeration). |
| `GET /health` | `apps/api/src/app.ts:30-37` | ✅ | Inline; pinned to the shared `HealthResponseSchema`. |
| Website enquiry proxy | `apps/website/app/api/enquiry/route.ts` | ✅ | Zod pre-validate; forwards `X-Internal-API-Key` (LOW-3); forwards verbatim response; 502 envelope on upstream failure. Drops `productInterest` before forwarding. |
| Website waitlist proxy | `apps/website/app/api/waitlist/route.ts` | ✅ | Same pattern as enquiry. 409 → user-friendly message. |
| Website products proxies (deprecated) | `apps/website/app/api/{products,products/[slug]}/route.ts` | ✅ | `@deprecated`; still send `INTERNAL_API_KEY`; not used by current client code (INFO-2). |
| Website api-client | `apps/website/lib/api-client.ts` | ✅ | `Authorization: Bearer ${API_KEY}`; 60s `revalidate` cache; `ApiError` with status + code. |
| Business-app login proxy | `apps/business-app/app/api/auth/login/route.ts` | ✅ | Zod pre-validate (shared `LoginRequestSchema`); forwards API's `Set-Cookie` to the browser; 502 envelope on upstream failure. |
| Business-app logout proxy | `apps/business-app/app/api/auth/logout/route.ts` | ✅ | Reads cookie → 401 if absent → forwards to API; clears the cookie either way. |
| Business-app me proxy | `apps/business-app/app/api/auth/me/route.ts` | ✅ | 401 short-circuit on missing cookie; passthrough. |
| Business-app `(protected)` layout | `apps/business-app/app/(protected)/layout.tsx` | ✅ | Server-side `requireAuthUser()` → `redirect('/login')` on 401; `force-dynamic` so the session is re-validated on every request. |
| Business-app products proxy | `apps/business-app/app/api/products/{route,[id]/route}.ts` | ✅ | Zod pre-validate (shared `CreateProductRequestSchema` / `UpdateProductRequestSchema`); session-cookie forward; 204 passthrough on DELETE. |
| Business-app batches proxy | `apps/business-app/app/api/batches/{route,[id]/{route,items/route,sales/route}}.ts` | ✅ | Same pattern; UUID path validation via `parseUuid`; 502 on upstream failure. |
| Business-app batch-items proxy | `apps/business-app/app/api/batch-items/{[id]/{route,sale/route}}.ts` | ✅ | Same pattern; sale proxy uses `RecordSaleRequestSchema`. |
| Business-app sales proxy | `apps/business-app/app/api/sales/[id]/route.ts` | ✅ | Same pattern; 204 passthrough on DELETE. |
| Logging | grep across `apps/api/src/`, `apps/website/`, `apps/business-app/` | ✅ | 16 `console.*` matches total; all are config-error logs, `unhandled error` server logs, or `mail` module log lines. **Zero `console.log` of request bodies, headers, cookies, tokens, passwords, PII.** No `JSON.stringify(session|cookie|password|token)` anywhere except the login form's `body: JSON.stringify({ email, password })` POST. |
| Error envelope | `apps/api/src/app.ts:39-86` | ✅ | `app.notFound` and `app.onError` both produce the canonical `ErrorResponseSchema.parse(...)` shape. Production message is the fixed string `"Internal server error"`. Non-prod surfaces `err.message`. **No stack trace, no DB driver message, no internal path leaks through the envelope.** |
| Env-var handling | `apps/api/src/env.ts`, `apps/website/lib/api-client.ts`, `apps/business-app/lib/api-server.ts` | ✅ | All required vars validated on boot; `R2_*` and `SMTP_*` are optional with a documented fallback. `INTERNAL_API_KEY` required but unenforced (HIGH-1). |
| `.env` / secret hygiene | `git log --diff-filter=A`, `.gitignore` | ✅ | Only `.env.example` ever committed; `.env`, `.env.local`, `.env.*.local` are gitignored. No committed secrets. |
| Dependency CVEs | `pnpm audit --prod` | ✅ | 12 HIGH (analysed in HIGH-2), 10 MODERATE, 3 LOW, 0 CRITICAL. |
| File-line cap (≤ 200) | `find … -exec wc -l` | ⚠️ | One file over by 46 lines: `apps/api/src/routes/batch-items/helpers.ts` (INFO-1). |

---

## Outstanding items / waived risks

The following items are not blocking but are documented as outstanding work for the post-launch hardening sweep:

1. **HIGH-1 (`INTERNAL_API_KEY` enforcement)** — owner decision required before launch. Either close the gap (preferred) or explicitly waive with a tracking ticket that ties the gap to the first internal-only endpoint.
2. **HIGH-2 Nodemailer addressparser DoS upgrade** — `^6.10.0` → `^7.0.11` in `apps/api/package.json`. Single-line dep bump, blocks launch.
3. **HIGH-2 Drizzle-orm and Next.js upgrades** — `drizzle-orm@^0.36.0` → `^0.45.2`, `next@16.2.2` → `>=16.2.6`. Recommended before launch; required before the first user-data growth milestone.
4. **MEDIUM-1 (no rate-limiting on `/auth/login`)** — `junior-api` follow-up. Not blocking for the single-owner launch.
5. **MEDIUM-2 (no HTTP security headers)** — `junior-api` (API) + `junior-fe` (Next.js apps) follow-up.
6. **MEDIUM-3 (no global body-size limit + no bulk-add row cap)** — `junior-api` follow-up; the row cap on `CreateBatchItemsBulkRequestSchema` is the more important half.
7. **LOW-1 (no magic-byte sniffing on uploads)** — `junior-api` follow-up.
8. **LOW-2 (PII at rest)** — documented; revisit before any multi-tenant expansion.
9. **LOW-3 (two header conventions for `INTERNAL_API_KEY`)** — rolls into HIGH-1's fix.
10. **LOW-4 (dead code `apps/website/lib/mail.ts`)** — `junior-fe` housekeeping deletion.
11. **INFO-1 (one file over 200-line cap)** — `junior-api` optional refactor.
12. **INFO-2 (deprecated website products proxies)** — `junior-fe` follow-up deletion.
13. **INFO-3 (no `.max(N)` on PII string fields)** — rolls into MEDIUM-3.

---

## Appendix

### Prior audits consulted

- `docs/security/pr-66-i21-audit.md` — I21 audit. The canonical template; the first to flag the `INTERNAL_API_KEY` gap as INFO-2.
- `docs/security/pr-79-i30-audit.md` — I30 audit. Confirms the session-cookie-forwarding pattern on the new business-app proxies.
- `docs/security/pr-80-i31-audit.md` — I31 audit. Confirms the pattern on the batch-items proxy; flags the bulk-add row-cap gap (carried into MEDIUM-3 here).
- `docs/security/pr-82-i32-audit.md` — I32 audit. Confirms the new `GET /batches/:id/sales` endpoint and the three new business-app proxies. Notes the PR #81 sold-item patch guard that landed in parallel.

### Commands used

```bash
# Setup
git fetch origin && git pull --ff-only origin main
git worktree add -b audit/i34-pre-launch-security-audit \
  /Users/damilolaoduronbi/Projects/printsbytee-i34-pre-launch-audit origin/main

# Auth / session / cookies
grep -rn "requireSession" apps/api/src/routes/
grep -rn "printsbytee_session" apps/api/src/ apps/business-app/lib/ apps/business-app/app/api/
cat apps/api/src/services/sessions.ts
cat apps/api/src/services/passwords.ts
cat apps/api/src/middleware/requireSession.ts
cat apps/api/src/routes/auth.ts
cat apps/api/src/db/schema/auth.ts

# INTERNAL_API_KEY — the central question
grep -rn "INTERNAL_API_KEY\|internal-api-key\|x-internal-api-key\|Internal-Api-Key" apps/ packages/
cat apps/website/lib/api-client.ts
cat apps/website/app/api/enquiry/route.ts
cat apps/website/app/api/waitlist/route.ts
cat apps/website/app/api/products/route.ts
cat apps/website/app/api/products/[slug]/route.ts

# Public + auth endpoints
cat apps/api/src/app.ts
cat apps/api/src/routes/index.ts
cat apps/api/src/routes/products/index.ts
cat apps/api/src/routes/products/handlers/list.ts
cat apps/api/src/routes/products/handlers/update.ts
cat apps/api/src/routes/batches/index.ts
cat apps/api/src/routes/batch-items/index.ts
cat apps/api/src/routes/sales/index.ts
cat apps/api/src/routes/uploads/{index,handlers/create,streaming,helpers,errors}.ts
cat apps/api/src/services/r2.ts
cat apps/api/src/routes/enquiries.ts
cat apps/api/src/services/mail.ts
cat apps/api/src/routes/waitlist.ts

# Business-app proxies
cat apps/business-app/lib/{api-server,auth-cookie,uuid}.ts
cat apps/business-app/app/api/auth/{login,logout,me}/route.ts
cat apps/business-app/app/api/products/{route,[id]/route}.ts
cat apps/business-app/app/api/batches/{route,[id]/{route,items/route,sales/route}}.ts
cat apps/business-app/app/api/batch-items/{[id]/{route,sale/route}}.ts
cat apps/business-app/app/api/sales/[id]/route.ts
cat apps/business-app/app/(protected)/{layout,error}.tsx

# Cross-cutting
grep -rn "cors\|CORS" apps/api/src/
grep -rn "Strict-Transport\|X-Frame\|Content-Security\|Referrer-Policy\|X-Content-Type\|helmet" apps/
grep -rn "rate.limit\|throttle\|rateLimit" apps/api/
grep -rn "bodyLimit\|maxBodySize\|bodySize" apps/api/src/
grep -rn "console\." apps/api/src/ apps/website/ apps/business-app/
grep -rn "logger\.\|JSON.stringify.*session\|JSON.stringify.*cookie\|JSON.stringify.*password" apps/api/src/ apps/website/ apps/business-app/
grep -rn "dangerouslySetInnerHTML\|eval(" apps/
grep -rn "sql\.raw\|sql\.identifier" apps/api/src/
grep -rn "magic\|signature\|file-type\|fileType" apps/api/src/routes/uploads/

# Repo constraint checks
find apps/api/src -name "*.ts" -exec wc -l {} + | sort -n
find apps -name ".env*"
git log --all --diff-filter=A --pretty=format:"%H %s" --name-only -- 'apps/api/.env*' 'apps/website/.env*' 'apps/business-app/.env*'

# Smoke check
DATABASE_URL=postgres://test:test@localhost:5432/test \
  SESSION_SECRET=test-session-secret \
  INTERNAL_API_KEY=test-internal-key \
  pnpm --filter @printsbytee/api exec tsx scripts/smoke-check-routes.ts
# → All 20 required routes registered

# Dependency CVEs
pnpm audit --prod
pnpm audit --prod --json | python3 -c "..."   # parsed per-advisory
```

### Cross-references

- `docs/api-surface.md` — wire-contract surface.
- `docs/architecture.md` — topology and data flow.
- `docs/data-model.md` — table shapes and FK cascade behaviour.
- `apps/api/README.md` — env-var table and session-cookie contract.
- `docs/deploy/r2-image-upload.md` — R2 bucket configuration.
- `docs/deploy/business-app-env.md` — `API_INTERNAL_KEY` deploy-doc row (the deploy doc also confirms the intended contract).
- `.pi/agents/security-auditor.md` — auditor scope and routing rules.
