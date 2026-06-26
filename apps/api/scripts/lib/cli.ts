import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface CliArgs {
  dryRun: boolean;
  sourceDir: string;
  help: boolean;
}

// Resolve repo root from this file: apps/api/scripts/lib/cli.ts
// -> apps/api/scripts/lib -> apps/api/scripts -> apps/api -> apps -> <repo>
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
export const DEFAULT_SOURCE = path.join(REPO_ROOT, 'apps', 'website', 'public');

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false, sourceDir: DEFAULT_SOURCE, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run' || arg === '--dryRun') {
      args.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--source' || arg === '--source-dir') {
      const next = argv[++i];
      if (!next) throw new Error('--source requires a path argument');
      args.sourceDir = path.resolve(next);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

export function printHelp(imageMapFilename: string): void {
  // eslint-disable-next-line no-console
  console.log(`upload-website-images-to-r2

Bulk-upload the website's product images from apps/website/public/ to Cloudflare R2.

Usage:
  upload-website-images-to-r2.ts [--dry-run] [--source <dir>]

Options:
  --dry-run         Print what would be uploaded without calling R2.
                    R2 env vars are NOT required in dry-run mode.
  --source <dir>    Override the source directory
                    (default: apps/website/public/).
  -h, --help        Show this help.

Required env (only when not --dry-run):
  R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_BASE_URL

Output:
  Writes a JSON map to ${imageMapFilename} next to this script and prints
  the same JSON to stdout. The map is keyed by filename so I14 can join
  it with apps/website/data/products.json (whose image paths are
  "/<basename>").
`);
}