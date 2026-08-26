---
name: teardown
description: From the master session, clean up one or more finished worktrees via scripts/worktree-rm.sh. Use when a parallel branch is merged or abandoned and its worktree is no longer needed. Lists live worktrees, confirms which to remove, checks for uncommitted and unmerged work first, and tears them down. Counterpart to /spinup.
---

# Tear Down Worktree(s)

Counterpart to `/spinup`. Removes worktrees created by `worktree-new.sh` once their branch is
merged or abandoned. Thin wrapper over `scripts/worktree-rm.sh` — selection, safety checks, and
reporting only. Run from the main checkout, not from inside a worktree.

## Procedure

1. **List candidates.** Run `git worktree list`. Exclude the main checkout (the repo-root entry
   whose path is the first entry `git worktree list` prints). Each remaining entry maps to
   `<feature>` = its directory basename minus the `<repo>-` prefix, `<repo>` being the main
   checkout's basename.
   - If nothing but the main checkout remains: say so and stop.
   - **If a directory suffix and its branch name disagree**, note it. `/spinup` keeps them
     identical; a mismatch means the worktree was created by hand, and the branch to check is
     the one `git worktree list` reports, not the one implied by the directory.

2. **Determine which to remove.** Context first: if the user named a branch, or we've just been
   discussing one that's now done, use that. Otherwise present the list (feature, branch, path)
   and ask. Accept one or several.

3. **Safety-check each — surface, never silently override:**
   - **Determine the integration branch first.** This is the branch the main checkout is
     currently on (`git -C <repo> rev-parse --abbrev-ref HEAD`) — i.e. what `/spinup` forked
     the worktree from. Do **not** assume `main`: this repo works on long-lived topic branches
     and never pushes. Call it `<integration-branch>`.
   - **Uncommitted work:** `git -C <worktree> status --short`. If dirty, warn and ask before
     using `--force`. Plain `worktree-rm.sh` already refuses on a dirty tree, which is the
     desired default.
   - **Unmerged work:** ask git directly rather than reading a listing:

     ```
     git -C <repo> log --oneline <integration-branch>..<feature>
     ```

     Empty means everything is on the integration branch. Anything listed is work that removing
     the worktree would leave stranded — warn that the branch survives but the work isn't
     merged, and confirm before proceeding. Since nothing is ever pushed, that stranded branch
     is the one way work actually gets lost here: it lives on as a local ref nobody is looking
     at.

     Do **not** grep `git branch --merged` for the name. Git marks the branch checked out in a
     _worktree_ with `+ `, not the two spaces an unchecked-out branch gets — and every branch
     this skill inspects is checked out in a worktree, so a naive match misses all of them and
     reports merged work as unmerged.

   - **Unpushed work:** not applicable — this repo has no remote. Skip it rather than reporting
     a scary-looking nothing.

4. **Remove.** `scripts/worktree-rm.sh <feature>`. Add `--force` only after the user okays
   removing a dirty or orphaned/broken-link worktree. This repo has no submodules, so `--force`
   is never merely defeating a submodule check — it always means discarding real changes or
   clearing a broken link. Treat it as destructive.

5. **Report** what was removed and any branches left behind. The worktree's VS Code window
   should already be closed — `/land` prompts for that before teardown, because of a VS Code
   bug where removing a worktree whose window is still open misbehaves. If it's still open,
   note that the user should close it now; the script can't.

6. **Check the plan got filed.** `/spinup` takes an optional plan file but records the
   association nowhere, so ask git what the branch actually touched:

   ```
   git -C <repo> diff --name-only $(git merge-base <integration-branch> <feature>) <feature> -- plans/
   ```

   Read from the fork point, not `<integration-branch>..<feature>` — that range empties the
   moment the branch merges, which is exactly when this runs.

   Anything still at `plans/<name>.md` rather than `plans/completed/<name>.md` is a plan this
   branch worked on and didn't file. Ask whether it's finished, and **don't infer that from the
   merge.** A branch can land with its plan honestly unfinished, the rest of the work
   continuing on the integration branch — that is a normal outcome here, not an oversight. Move
   it only on a yes.

7. **Offer branch cleanup.** Removing a worktree leaves its branch intact. If `<feature>` is
   merged into the `<integration-branch>` (from step 3), offer `git branch -d <feature>` —
   safe, because git refuses if it isn't actually merged. If it is unmerged, do NOT offer `-D`:
   just note the branch remains and why. With no remote, `-D` on unmerged work is unrecoverable
   outside the reflog.

## Notes

- Keep this slim: list, confirm, check, remove. It does not create worktrees (that's `/spinup`)
  or merge them (that's `/land`).
- The safety checks exist because removing a worktree is easy to do casually but can strand
  unmerged work on a branch you then forget about.
- **Plans do get archived, as of 2026-08-24** — `plans/completed/` exists, which is why step 6
  does. This note used to say the opposite.
- **Every worktree has a plan**, also since 2026-08-24: `/spinup` refuses to create one without
  `plans/<feature>.md`, writing a brief from the conversation when no deliberated plan exists.
  So step 6 always has something to check, and finding nothing means the worktree predates the
  rule or was made by hand.
