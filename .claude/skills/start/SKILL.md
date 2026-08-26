---
name: start
description: Run in a fresh worktree window to work out what this worktree is for — from its branch, its plan file if it has one, and its unmerged commits — and pick up where the last session left off. Use as the first thing in a new <repo>-<feature> worktree session.
---

# Start This Worktree

Run this in a fresh session inside a worktree created by `/spinup` or
`scripts/worktree-new.sh`. It works out what this worktree is for and loads the context, so you
don't have to re-explain the task to a new session.

Counterpart to `/spinup`, which created this worktree from the master window. The lifecycle is
`/spinup` → **`/start`** → work → `/land` → close the window → `/teardown`.

## There should always be a plan file

Since 2026-08-24 `/spinup` refuses to create a worktree without one, so `plans/<branch>.md` is
the expected case, not a bonus. It may be a deliberated plan or a brief the master session
wrote from the conversation that led here — either way it is where the intent lives.

**If it's missing, say so.** It means the worktree was made by hand, or made before this rule.
Fall back to the branch name and the commits, but tell the user the brief is absent rather than
quietly guessing — on a fresh worktree there are no commits either, so a silent guess is a
guess from a branch name alone.

## Procedure

1. **Find the master checkout, and derive the repo name from it.** Nothing here names a
   repository — these skills work in any checkout that uses the corral convention.

   ```
   MAIN="$(git worktree list --porcelain | head -1 | cut -d' ' -f2)"   # the master checkout
   REPO="$(basename "$MAIN")"                                          # e.g. course-materials
   ```

   `git worktree list` puts the main worktree first, from wherever it is run, so this works
   from inside a worktree as well as from the master checkout.

2. **Confirm this is a worktree, and get the feature name.**
   - Feature name = the current git branch (`git branch --show-current`).
   - Cross-check it against the directory: `git rev-parse --show-toplevel` -> basename -> strip
     the leading `<REPO>-`. `/spinup` keeps these identical. **If they disagree**, say so — the
     worktree was made by hand, and `/land` and `/teardown` both reconstruct one from the
     other.
   - If `git rev-parse --show-toplevel` equals `$MAIN`, you are in the master checkout rather
     than a worktree. Say so and stop; this skill is for worktree windows.

3. **Find the plan.** Glob `plans/*.md` (exclude `plans/completed/**`). Match a file whose
   basename, minus `.md` and minus any leading `YYYY-MM-DD-` prefix, equals `<feature>`.
   - Exactly one match: use it. This is the expected case.
   - Several: list them and ask which.
   - **None: report it as a gap**, then rebuild from the branch in step 3. Don't hunt for
     near-misses or offer a menu, and don't treat it as routine — `/spinup` is supposed to
     guarantee this file exists.

4. **Read what the branch has already done.** Determine the base branch (see below), then:

   ```
   git log --oneline <base>..HEAD
   git status --short
   ```

   Commits on this branch tell you what a previous session accomplished; uncommitted changes
   tell you where it was interrupted mid-thought.

   **On a worktree nobody has worked in yet, both come back empty** — the branch forked and
   stopped. That is not a signal that something is wrong; it means step 2's plan is the only
   context there is, which is why it is required.

5. **Open the plan in this window** so the user can read along. Use `-r`/`--reuse-window` so it
   opens in the _current_ window rather than spawning a new one: `code -r <plan-path>`. `code`
   may not be on PATH — fall back to
   `/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`.

6. **Report and hand off.** Two or three lines: what this worktree is for, what has landed on
   the branch so far, and what looks like the next step. Then stop and wait.
   - **With a plan:** follow the repo's `CLAUDE.md` rules — present it for explicit approval
     before implementing. Do not start editing until the user approves.
   - **Without one:** say what you've inferred the task to be and ask the user to confirm or
     correct it. A wrong inference costs a whole session of work on the wrong thing; the
     question costs one line.

## The base branch

This repo works on long-lived topic branches, and the fork point is not recorded anywhere.
`worktree-new.sh` defaults `--base` to whatever branch the **master checkout** was on at spinup
time, so that is what to reconstruct against — do **not** assume `main`.

To find it: `git branch --contains $(git merge-base HEAD main)` is a weak hint; the reliable
move is to check what the master checkout is on now —
`git -C "$MAIN" rev-parse --abbrev-ref HEAD`, using the `$MAIN` from step 1 — since `/land`
merges into exactly that. If the two candidates disagree, ask rather than guess.

## Rebasing later in the session

If the user asks to rebase this worktree's branch, rebase onto the **local tip** of the base
branch, using the unambiguous `refs/heads/<base>` spelling:

```
git rebase refs/heads/<base>
```

- Use `refs/heads/<base>`, not the bare short name. We want the master window's local commits —
  including ones never committed anywhere else — which is exactly what the worktree forked
  from.
- **This repo has no remote.** Do not `git fetch` or rebase onto `origin/...`; it will not
  resolve. Everything integrates locally.

## Notes

- Keep this slim: detect, load, confirm. It does not create worktrees (that's `/spinup`), does
  not merge (`/land`), and does not implement on its own.
- If the worktree can't validate diagrams (`workflows/diagram/tools/node_modules` missing
  because `npm install` didn't run at spinup), say so now rather than at the first `.bpmn` edit
  — every diagram change has to pass `workflows/diagram/tools/check-di.mjs` and `bpmnlint`
  before it can land.
