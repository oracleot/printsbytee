# @printsbytee/shared

Shared Zod schemas and TypeScript types for the PrintsbyTee monorepo.

This package is the source of truth for API contracts consumed by `apps/api`, `apps/website`, and `apps/business-app`. It stays framework-free: pure TypeScript plus Zod only.

## Exports

Import schemas and inferred types from the package root:

```ts
import { ProductSchema, type Product } from '@printsbytee/shared';
```

The package currently exports contracts for:

- Common primitives: UUIDs, ISO timestamps, pence amounts, cursors
- Products: `Product`, `ProductWithStock`, product requests and filters
- Production: `ProductionBatch`, `BatchItem`, production cost, totals, batch item requests
- Sales: `Sale`, `RecordSaleRequest`
- Leads: `Enquiry`, `WaitlistEntry`, create requests
- Auth: `User`, `Session`, login and `/auth/me` responses
- API wrappers: error and health responses

## Scripts

```sh
pnpm --filter @printsbytee/shared build
pnpm --filter @printsbytee/shared typecheck
```

`build` emits ESM JavaScript and declaration files to `dist/`.

## Adding a schema

1. Check `docs/data-model.md` and `docs/api-surface.md` first.
2. Add or update the relevant file in `src/schemas/`.
3. Export both `XxxSchema` and `type Xxx = z.infer<typeof XxxSchema>`.
4. Re-export the schema file from `src/index.ts` if it is new.
5. Keep the package free of Hono, Drizzle, React, and app-specific types.
6. Run build and typecheck before using the contract in an app.
