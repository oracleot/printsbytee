# Business App — Environment Variables

Vercel project: **printsbytee-business-app**
Deploy target: `https://business-app-*.vercel.app` (preview) / `business-app.printsbytee.co.uk` (production, TBC)

---

## Required at deploy time

| Variable | Description | Source / Owner | Sensitive |
|---|---|---|---|
| `SESSION_SECRET` | Cookie-signing key for owner session. Min 32 chars, random. | I20 / senior-api | ✅ |
| `SESSION_COOKIE_DOMAIN` | Cookie domain for auth — `printsbytee.co.uk` or `.printsbytee.co.uk`. Set once I27 lands. | I27 / senior-api | ❌ |
| `API_BASE_URL` | Internal Railway URL for `apps/api`, e.g. `https://printsbytee-api.railway.internal`. Used by business-app SSR/Route Handlers to call the API. | I05 / devops | ❌ |
| `API_INTERNAL_KEY` | Bearer token for business-app → API server-to-server calls (bypasses session cookie). | I20 / senior-api | ✅ |

## Required for image upload (I22)

| Variable | Description | Source / Owner | Sensitive |
|---|---|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID for R2. | I03 / devops | ❌ |
| `R2_ACCESS_KEY_ID` | R2 access key ID. | I03 / devops | ✅ |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key. | I03 / devops | ✅ |
| `R2_BUCKET_NAME` | R2 bucket name, e.g. `printsbytee-images`. | I03 / devops | ❌ |
| `R2_PUBLIC_URL` | Public-facing R2 URL, e.g. `https://pub-xxx.r2.dev`. | I03 / devops | ❌ |

## Future / TBD (not yet wired in I26/I27)

| Variable | Description | Expected in |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Public API base for client-side calls (if any). | I33 |
| `SMTP_*` vars | Mail sending — owned by `apps/api`, not the business-app directly. | N/A |

---

## Vercel dashboard steps (manual — owner action required)

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import `oracleot/printsbytee`.
2. Configure:
   - **Root Directory**: `apps/business-app` (or leave at repo root — `vercel.json` inside `apps/business-app/` will be picked up).
   - **Build Command**: leave blank — `vercel.json` declares it.
   - **Install Command**: leave blank — `vercel.json` declares it.
   - **Framework Preset**: Next.js (auto-detected).
3. On the **Environment Variables** screen, add all variables marked ✅ and ❌ above. Leave blank / unset any that are not yet available — the app will log warnings at startup for missing optional vars.
4. Assign to **Preview** and **Production** environments.
5. Trigger a manual deploy to confirm the build succeeds.

## Secrets rotation

- `SESSION_SECRET` — rotate via Vercel dashboard → Environment Variables. Any in-flight sessions are invalidated; owner must re-log-in.
- `API_INTERNAL_KEY` — rotate in Vercel and update the matching Railway secret for `apps/api`.
- R2 keys — rotate in Cloudflare dashboard; update both Vercel env vars and Railway env vars.