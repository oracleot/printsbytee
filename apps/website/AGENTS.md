<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Project Rules

**Inherits from:** `~/.openclaw/workspace/AGENTS.md` (workspace-level rules apply)

### File Size Rule (Non-Negotiable)
No source file may exceed **200 lines**. If a file grows beyond 200 lines, split it into smaller, focused modules.

### Required Pipeline
All changes must follow:
1. Feature branch (`feat/feature-name`)
2. Build + code review (lint + typecheck + build → 0 errors)
3. File size check — no file > 200 lines
4. Architect review gate (security-auditor) before PR
5. Raise PR for review

### Working Docs
All specs, audit reports, AI logs, and review notes go in `docs/`. This directory is gitignored — never commit working docs to the repo root.

### Tech Stack
- Next.js 15+ (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion

### Visual Verification Rule
After every UI change, visit the affected page(s) in the browser (using agent-browser) and take a screenshot to verify the change looks correct before considering the task complete. At minimum, check the landing page (`/`), products page (`/products`), and any specific page that was modified.
