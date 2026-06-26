## Final Review Gate

- The repository owner is the last line of review.
- No PR should be merged until the owner has reviewed and approved it.
- This applies even when automated reviews (for example, `senior-fullstack` or `security-auditor`) return `ALL_GREEN`.

## Parallel Agent Worktrees

- When two or more agents are working on the repo in parallel (subagents, parallel subagent calls, or multiple concurrent sessions), each agent **must** work in its own dedicated git worktree.
- Never have parallel agents share a single working directory or branch — concurrent edits to the same working tree cause lost work, false "all green" reviews, and impossible-to-merge conflicts.
- One worktree per agent, one branch per worktree, one PR per branch. Coordinate branch names up front (e.g. `feat/<task>-<agent>`) so they do not collide.
- The orchestrating session owns the main checkout and only dispatches work — it does not edit code in parallel with its subagents.

## Branching From main

- For every fresh task, branch off the **latest** `main` (or the repo's default branch). Refresh `main` (fetch + pull, or rebase) before creating the worktree so the new branch starts on the most current base.
- Only branch off a non-`main` branch when the user **explicitly** names that branch (e.g. "branch off `feat/auth`"). Do not infer it.
- Stale-base branches drift, accumulate merge conflicts, and force the owner to re-review the same upstream noise — defeating the Final Review Gate.

## Git Configuration

- **NEVER** run `git config user.name` or `git config user.email` without the `--global` flag.
  - Running without `--global` writes to `.git/config` and overrides the repository owner's identity for all future commits in that repo and all its worktrees.
  - Always use `--global` to write to `~/.gitconfig` instead.
- For bot/agent commits that need a specific identity, pass git identity via environment variables instead of modifying config:
  ```bash
  GIT_AUTHOR_NAME="Bot Name" GIT_AUTHOR_EMAIL="bot@example.com" git commit ...
  ```
- If an agent needs a persistent bot identity in a worktree, use `git -c user.name="Bot" -c user.email="bot@example.com" commit ...` (the `-c` flag is session-scoped and doesn't persist).

**Why this matters:** Commits attributed to bot accounts look like they're from a different contributor on GitHub, breaking attribution and requiring force-pushes to fix.
