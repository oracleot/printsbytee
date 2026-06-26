# PrintsbyTee delivery plan

## 1. Milestones

### M1 — Foundation + first live API
Stand up infra, clean repo leftovers, and deploy the first Railway API service.
**Deployed at end:** Railway API reachable at `GET /health` returning `{ "status": "ok" }`.

### M2 — Catalog data backbone
Create the Postgres schema, migrate seed assets/data, and expose public catalog reads from the API.
**Deployed at end:** Railway API serves catalog data from Postgres; product images are in R2.

### M3 — Website cutover
Refactor the public website to consume the API for catalog and public form submissions.
**Deployed at end:** `printsbytee.co.uk` on Vercel reads catalog data from `apps/api` and submits enquiries/waitlist via API-backed flows.

### M4 — Operations API
Add auth plus the write-side API for products, uploads, batches, items, and sales.
**Deployed at end:** Railway API supports authenticated business workflows end-to-end.

### M5 — Business app + hardening
Ship the owner-facing app on Vercel and finish pre-go-live hardening.
**Deployed at end:** `apps/business-app` is live with core workflows; security audit completed before sensitive use.

---

## 2. Issue list

### I01 — Remove stale website-local agent definitions
**Description:** Delete `apps/website/.pi/agents/` so the repo uses the monorepo-root agent set only. This avoids split ownership and stale instructions while planning and implementation proceed.
**Acceptance criteria:**
- `apps/website/.pi/agents/` is removed
- No app-local agent files remain under `apps/website/.pi/`
- Monorepo root `.pi/agents/` remains the only active agent source
**Labels:** chore, web  
**Milestone:** M1  
**Owning agent:** senior-fullstack  
**Blocked-by:** None

### I02 — Provision Railway project + Postgres
**Description:** Create the Railway project for `apps/api` and attach a Postgres database. This is the first critical platform dependency and unblocks the earliest live deployment.
**Acceptance criteria:**
- Railway project exists for the monorepo API
- Railway Postgres instance exists and is attached
- Connection details are available for app configuration
- Deployment URL or service hostname is recorded
**Labels:** infra, db, deploy  
**Milestone:** M1  
**Owning agent:** devops  
**Blocked-by:** None

### I03 — Provision Cloudflare R2 bucket + access keys
**Description:** Create the production R2 bucket for product images plus scoped access keys for the API. This must happen early so image migration and upload endpoint work can target the final bucket.
**Acceptance criteria:**
- R2 bucket exists for product assets
- Access key ID and secret are generated
- Bucket name, account ID, and public base URL are recorded
- Secrets are ready for Railway/Vercel config
**Labels:** infra, deploy  
**Milestone:** M1  
**Owning agent:** devops  
**Blocked-by:** None

### I04 — Verify existing Vercel website project builds from `apps/website/`
**Description:** The user will change Vercel settings, but the repo still needs a verification issue to confirm monorepo root, install/build commands, and env wiring are correct. This protects the public site during refactor.
**Acceptance criteria:**
- Existing Vercel project points at `apps/website/` as build root
- Preview build succeeds from the monorepo
- Required env vars for website-to-API proxying are identified
- Verification notes are captured in the issue
**Labels:** web, deploy, chore  
**Milestone:** M1  
**Owning agent:** devops  
**Blocked-by:** None

### I05 — Create Vercel project for `apps/business-app`
**Description:** Create the second Vercel project now so business-app work can deploy incrementally instead of waiting until the end. This matches the "deploy early" constraint.
**Acceptance criteria:**
- Dedicated Vercel project exists for `apps/business-app`
- Build root is `apps/business-app/`
- Preview deployment target is ready
- Required env vars are listed
**Labels:** app, deploy, chore  
**Milestone:** M1  
**Owning agent:** devops  
**Blocked-by:** None

### I06 — Scaffold `apps/api` with Hono + TypeScript + Drizzle + Zod and deploy `/health`
**Description:** Create the API service shell with a minimal Hono app, TypeScript config, Drizzle wiring, and Zod-ready structure. Deploy it to Railway immediately with `GET /health` returning the canonical status payload.
**Acceptance criteria:**
- `apps/api` has runnable Hono + TypeScript scaffold
- Railway deploy succeeds from the monorepo
- `GET /health` returns HTTP 200 with `{ "status": "ok" }`
- Basic app/package scripts exist for dev, build, and start
**Labels:** api, deploy  
**Milestone:** M1  
**Owning agent:** senior-api  
**Blocked-by:** I02

### I07 — Add API env loader + secrets management
**Description:** Centralize config loading for `apps/api`, including DB, session, SMTP, R2, and internal API key settings. This avoids ad hoc env usage as endpoints are added.
**Acceptance criteria:**
- `apps/api` has validated env loading
- Missing/invalid required env vars fail fast
- Railway secrets for current API scaffold are set
- Internal API key, DB, and future SMTP/R2 placeholders are defined
**Labels:** api, chore, deploy  
**Milestone:** M1  
**Owning agent:** senior-api  
**Blocked-by:** I02, I06

### I08 — Scaffold `packages/shared` API contracts
**Description:** Set up shared Zod schemas and TypeScript exports used by API, website, and business app. This keeps request/response and domain shapes from drifting across apps.
**Acceptance criteria:**
- `packages/shared` exports initial domain/API schema entrypoints
- Package can be imported from `apps/api`
- Build/typecheck path for shared package is defined
- Product/auth/batch schema placeholders are organized for incremental fill-in
**Labels:** chore, api, app  
**Milestone:** M1  
**Owning agent:** senior-fullstack  
**Blocked-by:** None

### I09 — Add GitHub Actions for lint/typecheck/build on PRs
**Description:** Add a monorepo CI workflow early so new apps and shared packages do not regress silently. This should cover the repo as it grows rather than being added near the end.
**Acceptance criteria:**
- GitHub Actions workflow runs on pull requests
- Workflow runs lint, typecheck, and build
- Current workspace passes or intentionally documents temporary failures
- Status checks are visible in GitHub
**Labels:** chore, deploy  
**Milestone:** M1  
**Owning agent:** devops  
**Blocked-by:** I06, I08

### I10 — Implement Drizzle schema to match `docs/data-model.md`
**Description:** Translate the documented Postgres model into Drizzle, including enums, tables, relations, and key constraints. The schema must match the ADRs and glossary exactly.
**Acceptance criteria:**
- Drizzle schema covers products, production_batches, batch_items, sales, enquiries, waitlist_entries, users, sessions
- Enums match documented values
- FK/unique/delete behaviors match `docs/data-model.md`
- Money/timestamp conventions match docs
**Labels:** db, api  
**Milestone:** M2  
**Owning agent:** db  
**Blocked-by:** I06, I08

### I11 — Generate and apply the first migration to Railway Postgres
**Description:** Create the initial migration from the Drizzle schema and apply it to Railway Postgres. This establishes the first real persistence layer for the API.
**Acceptance criteria:**
- Initial migration file exists
- Migration applies successfully to Railway Postgres
- Tables/enums/constraints exist in the deployed DB
- Migration command is documented in repo scripts or README
**Labels:** db, deploy  
**Milestone:** M2  
**Owning agent:** db  
**Blocked-by:** I02, I10

### I12 — Implement public `GET /products` and `GET /products/:slug`
**Description:** Add the public catalog read endpoints backed by Postgres. Responses must include derived `inStock`, `stockCount`, and `stockLabel` fields per the API surface doc.
**Acceptance criteria:**
- `GET /products` returns documented shape and filter support
- `GET /products/:slug` returns a single product or `NOT_FOUND`
- Derived stock fields are computed, not stored
- Responses match shared contract types
**Labels:** api  
**Milestone:** M2  
**Owning agent:** senior-api  
**Blocked-by:** I10, I11, I08

### I13 — Bulk-upload current website images from `apps/website/public/` to R2
**Description:** Create the one-time migration path for existing product images into R2 so catalog data can reference stable object URLs. This prepares the website and API for a clean storage cutover.
**Acceptance criteria:**
- Script uploads current product images from `apps/website/public/`
- Uploaded objects are accessible at expected R2 URLs
- Duplicate-safe or rerunnable behavior is defined
- Mapping output is available for product import
**Labels:** migration, infra  
**Milestone:** M2  
**Owning agent:** senior-api  
**Blocked-by:** I03

### I14 — Import `data/products.json` into Postgres
**Description:** Migrate the current catalog seed from `apps/website/data/products.json` into Postgres, mapping image fields to R2 URLs where needed. This is the bridge between the existing site and the new API source of truth.
**Acceptance criteria:**
- Import script reads current JSON catalog
- Products are inserted into Postgres with valid categories/slugs
- Image arrays reference intended URLs after migration
- Script is rerunnable without corrupting data
**Labels:** migration, db  
**Milestone:** M2  
**Owning agent:** db  
**Blocked-by:** I11, I13

### I15 — Implement `POST /waitlist`
**Description:** Add the public waitlist endpoint backed by Postgres with the documented uniqueness rule on `(productId, email)`. This replaces the current no-op website handler.
**Acceptance criteria:**
- `POST /waitlist` validates with Zod/shared schema
- Entry persists to `waitlist_entries`
- Duplicate `(productId, email)` submissions return a sensible conflict/error
- Error format matches API standard
**Labels:** api  
**Milestone:** M3  
**Owning agent:** junior-api  
**Blocked-by:** I10, I11, I08

### I16 — Implement `POST /enquiries` with DB persistence + SMTP notification
**Description:** Add the enquiry endpoint so contact submissions are stored in Postgres and notification emails are sent via SMTP. This replaces the website-local email logic with the real backend path.
**Acceptance criteria:**
- `POST /enquiries` validates request payload
- Enquiry row persists to DB
- SMTP notification is attempted using configured secrets
- API behavior for SMTP failure is explicitly handled and tested
**Labels:** api  
**Milestone:** M3  
**Owning agent:** senior-api  
**Blocked-by:** I10, I11, I07, I08

### I17 — Refactor website catalog pages to fetch API and retire local catalog sources
**Description:** Refactor the existing public site routes `/`, `/products`, and `/products/[slug]` to stop reading `data/products.json` through `lib/products.ts`. Current website-local API routes are `app/api/products/route.ts` and `app/api/products/[slug]/route.ts`; they should be removed or retired once pages fetch the real API. Affected components include `components/home/BentoGrid.tsx`, `components/home/FeaturedProducts.tsx`, `components/products/*`, and any loader using `@/lib/data` or `@/lib/products`.
**Acceptance criteria:**
- Home, products list, and product detail pages read catalog data from `apps/api`
- `apps/website/data/products.json` is no longer a runtime dependency
- Website-local product API routes are removed or clearly deprecated
- Product UI still renders stock/featured/notify states correctly from API data
**Labels:** web, migration  
**Milestone:** M3  
**Owning agent:** senior-fe  
**Blocked-by:** I04, I12, I14, I08

### I18 — Replace website `/api/waitlist` route with API proxy
**Description:** Keep the website form posting to a same-origin route, but make `app/api/waitlist/route.ts` a thin proxy to `apps/api` using the internal API key. This preserves client simplicity while moving logic to the backend.
**Acceptance criteria:**
- Website `/api/waitlist` forwards to API `POST /waitlist`
- Internal API key is sent server-to-server only
- Client-visible success/error behavior remains sane
- `components/products/NotifyMeModal.tsx` works unchanged or with minimal call-site changes
**Labels:** web  
**Milestone:** M3  
**Owning agent:** junior-fe  
**Blocked-by:** I04, I07, I15

### I19 — Replace website `/api/enquiry` route with API proxy
**Description:** Convert `app/api/enquiry/route.ts` into a thin proxy to API `POST /enquiries`. This keeps the website form UX stable while moving persistence and SMTP to the separate service.
**Acceptance criteria:**
- Website `/api/enquiry` forwards to API `POST /enquiries`
- Internal API key is sent server-to-server only
- `components/contact/ContactForm.tsx` submits successfully through the proxy
- Website-local mail-sending logic is removed from runtime path
**Labels:** web  
**Milestone:** M3  
**Owning agent:** junior-fe  
**Blocked-by:** I04, I07, I16

### I20 — Implement API auth with single-user session cookie + bcrypt password
**Description:** Add login/logout/me endpoints, user/session persistence, password hashing, and cookie handling for the owner-only app. This is the gateway for all write-side business operations.
**Acceptance criteria:**
- `POST /auth/login`, `POST /auth/logout`, and `GET /auth/me` exist
- Passwords are stored as bcrypt hashes
- Session cookie is httpOnly and persisted via DB-backed sessions
- Unauthorized requests to protected routes are rejected consistently
**Labels:** api, auth  
**Milestone:** M4  
**Owning agent:** senior-api  
**Blocked-by:** I10, I11, I07, I08

### I21 — Implement authenticated `POST/PATCH/DELETE /products`
**Description:** Add write-side catalog management after auth is in place. Updates must respect ADR-0002: `id` and `slug` stay immutable, and deletes refuse when batch items reference a product.
**Acceptance criteria:**
- `POST /products`, `PATCH /products/:id`, and `DELETE /products/:id` exist
- Protected routes require a valid session
- Update/delete rules match the documented constraints
- Request/response shapes use shared contracts
**Labels:** api, auth  
**Milestone:** M4  
**Owning agent:** senior-api  
**Blocked-by:** I20, I10, I11, I08

### I22 — Implement authenticated `POST /uploads` backed by R2
**Description:** Add multipart upload support for product images from the business app. Files should stream to R2 and return the stored object URL/metadata.
**Acceptance criteria:**
- `POST /uploads` accepts multipart file uploads
- Auth is required
- Uploaded files land in the configured R2 bucket
- Response returns `{ url, contentType, size }`
**Labels:** api, auth  
**Milestone:** M4  
**Owning agent:** senior-api  
**Blocked-by:** I03, I07, I20

### I23 — Implement full batch CRUD endpoints
**Description:** Add the production batch endpoints that own batch-level cost and profit context. Computed totals on read must match the formulas in `docs/api-surface.md` and ADR-0003.
**Acceptance criteria:**
- `GET /batches`, `POST /batches`, `GET /batches/:id`, `PATCH /batches/:id`, `DELETE /batches/:id` exist
- Protected routes require auth
- Computed totals match documented formulas
- Delete refuses when any item in the batch is sold
**Labels:** api, auth  
**Milestone:** M4  
**Owning agent:** senior-api  
**Blocked-by:** I20, I10, I11, I08

### I24 — Implement batch item endpoints with bulk create + status transitions
**Description:** Add the batch item operations that link products into production batches. Planned prices must snapshot from `Product.price` by default per ADR-0002.
**Acceptance criteria:**
- `GET /batches/:id/items`, `POST /batches/:id/items`, `PATCH /batch-items/:id`, `DELETE /batch-items/:id` exist
- Bulk create defaults `plannedSalePrice` from product master price
- `PATCH` refuses direct transition to `sold`
- Delete refuses when a sale exists
**Labels:** api, auth  
**Milestone:** M4  
**Owning agent:** senior-api  
**Blocked-by:** I20, I23, I10, I11, I08

### I25 — Implement sale recording + undo as transactional endpoints
**Description:** Add the sales endpoints that move items between `sellable` and `sold` states and track actual revenue. The write path should be transactional so item status and sale row cannot drift.
**Acceptance criteria:**
- `POST /batch-items/:id/sale` records sale and marks item sold atomically
- `DELETE /sales/:id` undoes sale and restores item to `sellable`
- Conflict handling exists for already-sold items
- Profit/revenue reads reflect the mutation correctly
**Labels:** api, auth  
**Milestone:** M4  
**Owning agent:** senior-api  
**Blocked-by:** I20, I24

### I26 — Scaffold `apps/business-app` with Next.js + Tailwind + shadcn
**Description:** Create the owner-facing app shell with the agreed stack and wire it into the monorepo and Vercel project. Ship it early with a reachable placeholder deploy.
**Acceptance criteria:**
- `apps/business-app` has a working Next.js scaffold
- Tailwind and shadcn are configured
- App builds in the monorepo and deploys to Vercel
- Placeholder page is reachable on preview/prod URL
**Labels:** app, deploy  
**Milestone:** M5  
**Owning agent:** senior-fe  
**Blocked-by:** I05, I08

### I27 — Implement business-app login screen
**Description:** Add the owner login UI and session handling against the API auth endpoints. This is the first usable business-app feature and should deploy as soon as it works.
**Acceptance criteria:**
- Login page exists in business app
- Valid credentials create a working session
- Invalid credentials show clear errors
- Protected app routes redirect or block when unauthenticated
**Labels:** app, auth  
**Milestone:** M5  
**Owning agent:** junior-fe  
**Blocked-by:** I20, I26

### I28 — Implement business-app dashboard overview
**Description:** Build the high-level dashboard showing batches and total profit-oriented summary data. This gives the owner immediate value once auth and operations endpoints exist.
**Acceptance criteria:**
- Dashboard route exists behind auth
- Overview shows batches summary and total profit/profit-so-far metrics
- Data comes from API, not local mocks
- Empty/error/loading states are handled
**Labels:** app  
**Milestone:** M5  
**Owning agent:** senior-fe  
**Blocked-by:** I23, I24, I25, I27

### I29 — Implement business-app batch list + detail views
**Description:** Build the browsing surfaces for production batches, including computed totals and item lists. These pages anchor the rest of the owner workflows.
**Acceptance criteria:**
- Batch list page exists
- Batch detail page exists
- Detail view shows item list and computed totals from API
- Navigation between list and detail is usable on desktop/mobile
**Labels:** app  
**Milestone:** M5  
**Owning agent:** senior-fe  
**Blocked-by:** I23, I24, I25, I27

### I30 — Implement business-app batch creation form
**Description:** Add the create/edit UI for production batches, including production cost breakdown and marketing cost. Inputs must map cleanly to the API batch shape.
**Acceptance criteria:**
- Owner can create a batch with name, production cost breakdown, and marketing cost
- Validation errors are shown inline
- Saved batch persists via API
- Edit flow for mutable batch fields works
**Labels:** app  
**Milestone:** M5  
**Owning agent:** junior-fe  
**Blocked-by:** I23, I27

### I31 — Implement business-app item management
**Description:** Add UI for bulk-adding items to a batch and marking items faulty. This is the production workflow that drives stock, loss, and future sales state.
**Acceptance criteria:**
- Owner can add batch items in bulk
- Default planned prices come through correctly
- Owner can mark items faulty
- UI reflects updated status counts after mutation
**Labels:** app  
**Milestone:** M5  
**Owning agent:** junior-fe  
**Blocked-by:** I24, I29

### I32 — Implement business-app sale recording UI
**Description:** Add the UI for recording and undoing sales from batch items. This closes the loop on actual revenue capture.
**Acceptance criteria:**
- Owner can record a sale for a sellable item
- Optional sale fields are supported
- Owner can undo a recorded sale
- Revenue/profit views refresh correctly after mutation
**Labels:** app  
**Milestone:** M5  
**Owning agent:** junior-fe  
**Blocked-by:** I25, I29

### I33 — Implement business-app product catalog CRUD UI
**Description:** Add the authenticated product management screens, including image upload integration. This gives the owner a full catalog control plane backed by the API.
**Acceptance criteria:**
- Product list/create/edit/delete flows exist
- Form fields map to product schema
- Image upload uses API `POST /uploads`
- Delete guardrails/errors are surfaced in the UI
**Labels:** app, auth  
**Milestone:** M5  
**Owning agent:** senior-fe  
**Blocked-by:** I21, I22, I27

### I34 — Run final security audit before sensitive endpoints go live
**Description:** Perform a focused security review of auth, cookies, internal API key usage, upload handling, and public form endpoints before the owner starts using sensitive workflows in production. This is the final gate for the live system.
**Acceptance criteria:**
- Auth/session/cookie configuration is reviewed
- Website proxy routes are reviewed for secret leakage and access control
- Upload, enquiry, and waitlist endpoints are reviewed for abuse vectors
- Findings are documented and critical issues are resolved or explicitly waived
**Labels:** auth, chore, deploy  
**Milestone:** M5  
**Owning agent:** security-auditor  
**Blocked-by:** I17, I18, I19, I21, I22, I23, I24, I25, I27, I33

---

## 3. Critical path

1. **I02 — Provision Railway project + Postgres**
2. **I06 — Scaffold `apps/api` with Hono + TypeScript + Drizzle + Zod and deploy `/health`**
3. **I07 — Add API env loader + secrets management**
4. Verify deployed Railway URL returns `GET /health → 200 { "status": "ok" }`

---

## 4. First batch

File these first:

1. **I01 — Remove stale website-local agent definitions**
2. **I02 — Provision Railway project + Postgres**
3. **I03 — Provision Cloudflare R2 bucket + access keys**
4. **I04 — Verify existing Vercel website project builds from `apps/website/`**
5. **I05 — Create Vercel project for `apps/business-app`**
6. **I06 — Scaffold `apps/api` with Hono + TypeScript + Drizzle + Zod and deploy `/health`**
7. **I07 — Add API env loader + secrets management**
8. **I08 — Scaffold `packages/shared` API contracts**
9. **I09 — Add GitHub Actions for lint/typecheck/build on PRs**
