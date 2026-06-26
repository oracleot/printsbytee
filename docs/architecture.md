# Architecture

## Topology

```
printsbytee/                          ← pnpm workspace root
├── apps/
│   ├── website/                      ← Next.js 16 (existing)
│   ├── api/                          ← Hono + Postgres (new)
│   └── business-app/                 ← Next.js (new)
└── packages/
    └── shared/                       ← Zod schemas + TS types
```

## Packages

### `apps/website` — the public catalogue
Reads products, handles contact-form submissions and waitlist signups. Currently reads from `data/products.json`; refactored to consume `apps/api`. No checkout — sales happen offline and are recorded in `apps/business-app`.

### `apps/api` — the single source of truth
Owns the Postgres database and the Cloudflare R2 image bucket. Public read endpoints serve the website; authenticated write endpoints serve the business app. Also handles image uploads. Sends transactional email for new enquiries (SMTP).

### `apps/business-app` — the owner's tool
Production, cost, and profit management. CRUD for products, production batches, batch items, sales. Computes per-batch profit projections and tracks actuals as items are sold. Single-user auth.

### `packages/shared` — the contract
Zod schemas and TypeScript types shared between all three apps. The API's request/response shapes, the website's data layer, and the business app's data layer all import from here. Prevents shape drift across consumers.

## Data flow

| Direction | Path |
|---|---|
| Public read | website → api → Postgres |
| Authenticated read | business-app → api → Postgres |
| Authenticated write | business-app → api → Postgres |
| Public write (enquiry, waitlist) | website → api → Postgres (+ SMTP for enquiry) |
| Image upload | business-app → api → Cloudflare R2 |
| Auth | business-app → api (`POST /auth/login`) → session cookie → cookie sent on every authed request |

## Deploy targets

| Package | Host | Notes |
|---|---|---|
| `apps/website` | Vercel | Existing, unchanged target. Build root: `apps/website/`. |
| `apps/business-app` | Vercel | New. Same target as website for consistency. |
| `apps/api` | Railway | New. Single Node service. |
| Postgres | Railway | Attached to the API service. |
| Images | Cloudflare R2 | S3-compatible, UK edge. |
| Sessions | Postgres-backed | No external session store. |
| Email | SMTP (same provider as today) | `apps/api` sends enquiry notifications. |

## Storage

- **Postgres** — products, batches, items, sales, enquiries, waitlist, users, sessions.
- **Cloudflare R2** — product images. URLs stored in `products.images`, served via R2's CDN.
- **No other storage** — emails are sent but not persisted beyond the enquiry row.
