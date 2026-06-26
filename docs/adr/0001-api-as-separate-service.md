# API runs as a separate service, not inside the Next.js website

The new business app and the existing website both need a shared backend. We chose to build the API as its own service in a pnpm monorepo (`apps/api/`) rather than as `app/api/*` routes inside the Next.js website, because the new app is shipping in parallel and must not depend on the website being deployed or healthy. The website stays on Vercel; the API and Postgres deploy to Railway. Shared types live in `packages/shared/` so the website and the business app consume the same `Product` / `ProductionBatch` / `BatchItem` shapes without drift.

## Considered Options

- **API inside Next.js (`app/api/*` routes)** — fastest to start and one deploy, but the new app becomes a child of the website, business logic creeps into the UI codebase, and a website outage takes sales recording down with it.
- **All on Vercel (API as serverless functions)** — single platform, but cold starts on every authenticated request and Postgres connection-pool friction. Wrong fit for a stateful, auth-heavy API.
- **Separate service in a monorepo (chosen)** — clean domain boundary, independent deploys, shared types, the new app talks to the same backend the website does.
