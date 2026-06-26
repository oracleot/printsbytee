# PrintsbyTee

The PrintsbyTee platform monorepo: public website, internal business app, and shared API.

## Structure

- `apps/website` — Public Next.js catalogue (printsbytee.co.uk)
- `apps/api` — Hono + Postgres + Drizzle API (planned)
- `apps/business-app` — Internal Next.js app for the owner (planned)
- `packages/shared` — Zod schemas + TypeScript types shared between apps
- `docs/` — Design and architectural docs (`CONTEXT.md`, `docs/architecture.md`, `docs/api-surface.md`, `docs/data-model.md`, `docs/adr/`)
- `.pi/agents/` — Project-scoped subagents for AI-assisted development

## Development

```bash
pnpm install
pnpm dev:website      # local website (consumes apps/api when ready)
pnpm dev:api          # local API + Postgres
pnpm dev:business-app # local business app
```

See `docs/architecture.md` for the full topology and deploy targets.
