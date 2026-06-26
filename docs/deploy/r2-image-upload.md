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
> objects.

## Where this runs

The script needs the website's `apps/website/public/` files **on disk**
(the deployed API image on Railway doesn't carry them). So the script
executes on a workstation that has the repo checked out, but it pulls
its `R2_*` secrets directly from the Railway API service — no copying,
no manual export.

Concretely: the [Railway CLI](https://docs.railway.com/guides/cli)
`railway run` command injects the linked service's environment
variables into the local shell, then executes the given command. The
secrets never appear in your terminal, never land in your local `.env`,
and never need to be rotated separately from Railway.

## Prerequisites

1. The R2 bucket from issue I03 has been provisioned in Cloudflare.
2. Public-read access is enabled on the bucket (either via a custom
   domain or the `*.r2.dev` public URL).
3. Scoped access keys exist with read/write on the bucket.
4. The repo is checked out and `pnpm install` has been run locally.
5. The Railway CLI is installed and linked to this project:
   ```bash
   railway login
   railway link --project printsbytee --service api
   ```
6. The five `R2_*` variables are set on the **Railway `api` service**
   (not Vercel, not your local shell):

   | Var | Example | Notes |
   |---|---|---|
   | `R2_ACCOUNT_ID` | `abc123…` | Cloudflare account ID. |
   | `R2_BUCKET` | `printsbytee-images` | Bucket name. |
   | `R2_ACCESS_KEY_ID` | `…` | Scoped R2 access key. |
   | `R2_SECRET_ACCESS_KEY` | `…` | Scoped R2 secret key. |
   | `R2_PUBLIC_BASE_URL` | `https://images.example.com` | Public base URL. Must be a valid URL with no trailing slash. |

   These are the same vars already validated by `apps/api/src/env.ts`,
   so the script and the running API agree on the configuration
   surface.

## Dry-run (always do this first)

Validates everything except the actual upload. No credentials needed —
the script just walks `apps/website/public/` and emits the map.

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

## Live run — secrets sourced from Railway

```bash
railway run --service api -- \
  pnpm --filter @printsbytee/api upload:website-images
```

What happens:

- `railway run` connects to the Railway API service, fetches the
  service's env vars, and injects them into a local shell.
- The script runs locally (so it has access to
  `apps/website/public/`), reads the injected `R2_*` vars, and
  uploads.
- Secrets are not echoed, not written to disk, and not visible in
  `ps`/`env` of the parent shell.

Behaviour:

- Every image in `apps/website/public/` is uploaded under the key
  `products/<original-filename>` with the correct `Content-Type`.
- Existing objects with the same `Content-Length` as the local file
  are **skipped** (HEAD-only check). The script is safe to re-run;
  new files are uploaded, unchanged files are skipped, no duplicates
  are created.
- On completion the script rewrites `.image-map.json` and prints it
  to stdout.
- Exit code is `0` when every file either uploaded or skipped
  cleanly, `1` if any file failed.

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
`products/<slug>/<basename>` and migrate in place.

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
  didn't return one).
- `skipped: true` means the script found an existing object with the
  same size and did not re-upload.

## Why not run this on Railway directly?

The deployed `api` service image is built from `apps/api` only — it
doesn't carry `apps/website/public/`. Two alternatives we considered
and rejected:

- **Railway "Run Command" UI** — would need the website images baked
  into the API image. Pollutes the production image with one-off
  data and grows the image by tens of MB.
- **Re-deploy after bundling the images** — same problem; the API
  image shouldn't carry website assets.

`railway run` from a workstation gives us the best of both: secrets
stay in Railway as the single source of truth, and the script has
access to the website's image files on disk.

## After the run

The output `.image-map.json` is the input to issue I14 (Postgres
product import). Keep it on disk until I14 lands; commit only the
mapping summary if anything noteworthy changed.

If you want to verify a specific image landed, the R2 dashboard shows
the object list, or from your workstation:

```bash
railway run --service api -- \
  curl -sI "$(jq -r '.items["lora-set-turquoise.jpg"].url' apps/api/scripts/.image-map.json)"
```
