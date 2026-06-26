# Bulk-uploading website images to Cloudflare R2 (issue I13)

One-shot migration that copies every product image currently served from
`apps/website/public/` into the production Cloudflare R2 bucket so the
API and website can reference stable object URLs.

The migration is implemented as a TypeScript script in
`apps/api/scripts/upload-website-images-to-r2.ts`. This runbook is the
operator procedure for running it against the real bucket.

> **Owner's responsibility.** Issue I13 is scoped to the script and a
> successful dry-run. Running the script against the real R2 bucket is
> the owner's call — it requires real credentials and creates real
> objects. Do this from a workstation with the env vars below set, not
> from CI.

## Prerequisites

1. The R2 bucket from issue I03 has been provisioned in Cloudflare.
2. Public-read access is enabled on the bucket (either via a custom
   domain or the `*.r2.dev` public URL).
3. Scoped access keys exist with read/write on the bucket.
4. You have the bucket's public base URL (e.g.
   `https://images.example.com`).
5. The repo is checked out and `pnpm install` has been run.

## Environment variables

Set these in your shell or a local `.env` (the script's env loader reads
from `process.env`; it does **not** auto-load `.env` files).

| Var | Example | Notes |
|---|---|---|
| `R2_ACCOUNT_ID` | `abc123…` | Cloudflare account ID. |
| `R2_BUCKET` | `printsbytee-images` | Bucket name. |
| `R2_ACCESS_KEY_ID` | `…` | Scoped R2 access key. |
| `R2_SECRET_ACCESS_KEY` | `…` | Scoped R2 secret key. |
| `R2_PUBLIC_BASE_URL` | `https://images.example.com` | Public base URL. Must be a valid URL with no trailing slash. |

These mirror the same-named vars already validated by
`apps/api/src/env.ts` so a script run and an API deploy agree on the
configuration surface.

## Dry-run (always do this first)

Validates everything except the actual upload — no credentials required.

```bash
pnpm --filter @printsbytee/api upload:website-images --dry-run
```

You should see:

- `[i13] Mode: dry-run`
- `[i13] Discovered 33 image file(s).`
- One `[i13] [dry-run] <basename> -> products/<basename> (<size> B)` line per file
- `[i13] Wrote image map: …/apps/api/scripts/.image-map.json`
- `[i13] Summary: 33 discovered, 0 uploaded, 33 skipped, 0 failed`

The `.image-map.json` file is gitignored.

## Live run

```bash
export R2_ACCOUNT_ID=…
export R2_BUCKET=printsbytee-images
export R2_ACCESS_KEY_ID=…
export R2_SECRET_ACCESS_KEY=…
export R2_PUBLIC_BASE_URL=https://images.example.com

pnpm --filter @printsbytee/api upload:website-images
```

Behaviour:

- Every image in `apps/website/public/` is uploaded under the key
  `products/<original-filename>` with the correct `Content-Type`.
- Existing objects with the same `Content-Length` as the local file are
  **skipped** (HEAD-only check). The script is safe to re-run; new files
  are uploaded, unchanged files are skipped, no duplicates are created.
- On completion the script rewrites `.image-map.json` and prints it to
  stdout.
- Exit code is `0` when every file either uploaded or skipped cleanly,
  `1` if any file failed.

## What gets uploaded

The walker filters `apps/website/public/` (non-recursive) to common
raster image extensions:

- `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` (case-insensitive)

SVG, ICO, font, and other asset files are **not** uploaded — those stay
on Vercel with the website.

## Object-key layout

```
products/<original-filename>
```

Flat by design:

- The original filename already encodes the product (e.g.
  `lora-set-turquoise-back.jpg`).
- It keeps the join with `apps/website/data/products.json` trivial —
  strip the leading `/` from each `images[]` entry and look up the
  basename in `.image-map.json`.
- Object listing and CDN cache purges stay simple.

If we ever need per-product grouping we can bump the layout to
`products/<slug>/<filename>` and migrate in place.

## Mapping output (`apps/api/scripts/.image-map.json`)

The script writes a JSON document next to itself. Format:

```json
{
  "generatedAt": "2026-06-26T15:34:04.505Z",
  "bucket": "printsbytee-images",
  "publicBaseUrl": "https://images.example.com",
  "keyPrefix": "products",
  "items": {
    "lora-set-turquoise.jpg": {
      "key": "products/lora-set-turquoise.jpg",
      "url": "https://images.example.com/products/lora-set-turquoise.jpg",
      "contentType": "image/jpeg",
      "size": 1231694,
      "etag": "abc123…",
      "skipped": false
    }
  }
}
```

- `items` is keyed by basename. I14 joins by stripping the leading `/`
  from each entry in `apps/website/data/products.json#images`.
- `etag` is R2's ETag for the uploaded object (may be `null` if R2
  didn't return one in HEAD responses).
- `skipped: true` means HEAD reported the object already present with
  the same `Content-Length` — the script did not re-upload.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Missing required R2 env vars: …` | Live run without all five vars set | Set the missing vars or pass `--dry-run` |
| `ENOENT: no such file or directory` (source) | `--source` points at a missing dir | Verify path; default is `apps/website/public/` |
| `403 Forbidden` from R2 | Wrong access key or scope | Re-issue scoped keys for the bucket |
| `400 Bad Request` on endpoint | Wrong `R2_ACCOUNT_ID` or bucket name | Cross-check the Cloudflare dashboard |
| Files uploaded but `url` is empty in the map | `R2_PUBLIC_BASE_URL` unset | Set it; the URL is required for I14 to consume the map |

## Post-upload checks

1. Pick a few URLs from `.image-map.json` and `curl -I` them — they
   should return `200` with the correct `Content-Type`.
2. Confirm the website's products page (run locally against the API) is
   still rendering images after the migration.
3. Hand `.image-map.json` to I14 — that's its input for seeding
   `products.images` in Postgres.

## File layout (for context)

```
apps/api/scripts/
├── upload-website-images-to-r2.ts   # CLI entry
├── lib/
│   ├── cli.ts                       # arg parsing + --help
│   ├── env.ts                       # Zod loader for R2_* env vars
│   ├── walk-images.ts               # filesystem walker (image-only filter)
│   ├── r2-client.ts                 # S3 client + HEAD / PUT helpers
│   └── image-map.ts                 # key/url/content-type helpers + JSON I/O
├── tsconfig.json                    # separate tsconfig for the scripts dir
├── .gitignore                       # ignores .image-map.json
└── .image-map.json                  # generated on run (gitignored)
```