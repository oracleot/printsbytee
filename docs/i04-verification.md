# I04 — Vercel website build verification

**Status:** PASS  
**Branch:** `ops/i04-verify-vercel-website`  
**Commit verified:** `4ba8de9`

## Build root

`apps/website/` is correctly wired in the monorepo:
- `pnpm-workspace.yaml` includes `apps/*`
- `apps/website/package.json` build script: `next build`
- Monorepo root: `pnpm --filter website build`
- No `vercel.json` required (framework preset handles detection)

## Build result

`pnpm --filter website build` — ✅ PASS (Next.js 16.2.2, Turbopack)

Static pages: `/`, `/contact`, `/products`  
Dynamic routes: `/api/enquiry`, `/api/products`, `/api/products/[slug]`, `/api/waitlist`, `/products/[slug]`

## Pipeline gate

| Check | Result |
|---|---|
| `pnpm lint` | ✅ 0 errors, 2 pre-existing warnings |
| `pnpm typecheck` | ✅ |
| `pnpm build` | ✅ |

## Env vars required on Vercel

| Variable | Used by | Required now? |
|---|---|---|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | ProductCTA, WhatsAppButton, ContactInfo | Yes |
| `SMTP_HOST` | lib/mail.ts | Yes |
| `SMTP_PORT` | lib/mail.ts | Yes |
| `SMTP_USER` | lib/mail.ts | Yes |
| `SMTP_PASS` | lib/mail.ts | Yes |
| `ENQUIRY_EMAIL` | lib/mail.ts | Optional |
| `NEXT_PUBLIC_WHATSAPP_DISPLAY_NUMBER` | ContactInfo | Optional |

### Future env vars (blocks I17, I18, I19)

| Variable | Used by |
|---|---|
| `INTERNAL_API_KEY` | `app/api/waitlist`, `app/api/enquiry` proxies → Railway API |
| `NEXT_PUBLIC_API_URL` | Website pages → Railway API (catalog reads) |

## Manual Vercel actions for owner

1. **Root Directory**: Settings → General → Root Directory → `apps/website/`
2. **Build command**: `pnpm --filter website build` (or auto-detect)
3. **Env vars**: Add all required vars in Settings → Environment Variables (all scopes)
4. **Deploy**: Trigger a preview deploy to confirm build on Vercel infra
