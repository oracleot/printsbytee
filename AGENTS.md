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
