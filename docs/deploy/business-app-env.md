# Business App — Environment Variables

Vercel project: **printsbytee-business-app**
Deploy target: `https://business-app-*.vercel.app` (preview) / `business-app.printsbytee.co.uk` (production, TBC)

> **Principle:** env vars live in the service that uses them.
> R2 credentials, SMTP credentials, and `SESSION_SECRET` all belong on the **API service (Railway)** — do not duplicate them on Vercel.
> The business-app receives R2 image URLs back in API responses and forwards session cookies on requests; it never reads, signs, or uploads to those systems directly.

---

## Required at deploy time

| Variable | Description | Sensitive |
|---|---|---|
| `API_BASE_URL` | **Public** Railway URL for `apps/api`, e.g. `https://printsbytee-api.up.railway.app`. Used by business-app SSR and Route Handlers to call the API. Must be the public hostname — Vercel cannot reach Railway's private internal hosts. | ❌ |

## Conditional (only when I20 / I22 wire internal-key auth)

| Variable | Description | Sensitive |
|---|---|---|
| `API_INTERNAL_KEY` | Bearer token for business-app → API server-to-server calls that should bypass session auth. I20 has it as a placeholder; safe to leave unset until that path is built. | ✅ |

## Future (not yet wired)

| Variable | Description | Expected in |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Public API base for browser-side calls from the business-app, if any direct calls are needed. | I33 |

---

## Vercel dashboard steps (manual — owner action required)

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import `oracleot/printsbytee`.
2. Configure:
   - **Root Directory**: `apps/business-app` (or leave at repo root — `vercel.json` inside `apps/business-app/` will be picked up).
   - **Build Command**: leave blank — `vercel.json` declares it.
   - **Install Command**: leave blank — `vercel.json` declares it.
   - **Framework Preset**: Next.js (auto-detected).
3. On the **Environment Variables** screen, add `API_BASE_URL` for **Preview** and **Production**. Leave `API_INTERNAL_KEY` unset for now.
4. Trigger a manual deploy to confirm the build succeeds.

## Secrets rotation

- `API_INTERNAL_KEY` — rotate in Vercel and update the matching Railway secret for `apps/api`.
- All other secrets (`SESSION_SECRET`, R2 keys, SMTP credentials) are rotated on the **API service (Railway)**, not here.
