---
name: land
description: From the master session, merge a finished worktree's branch back into the integration branch it forked from, leaving it ready for /teardown. Use when a worktree's work is done and you want to land it. Checks the worktree is clean, checks there is something to land, merges --no-ff, and reminds you to close the worktree's VS Code window before /teardown.
---

# Land a Finished Worktree's Branch

The middle step between a worktree finishing its work and `/teardown` removing it. Merges the
feature branch back into the branch it forked from, then hands off to `/teardown`. Run from the
**master / orchestrator session**, not from inside the worktree.

## Why this runs in the master session, not the worktree

The merge target is checked out in the main checkout. Git forbids checking out the same branch
in a second worktree, and these merges are routinely non-fast-forward once more than one branch
is in flight. A non-ff merge commit can only be created on the main checkout's branch, so the
worktree cannot perform it.

## What this skill does NOT do

- **It does not close the worktree's VS Code window** (a skill can't) — it reminds you to,
  because `/teardown` misbehaves on an open window.
- **It does not remove the worktree** (that's `/teardown`).
- **It does not push.** Landing is a local merge. Pushing is a separate, deliberate act.
- **It does not land a private branch.** See below — this is a refusal, not a caution.

## Private branches are not landed

**This repository is public.** Work that is not ready, or not for students — an unreleased
assignment, notes about a particular student, a rubric — is kept on a branch that is never
pushed and never merged.

Merging is what makes it public: it carries the branch's whole history onto `main`, including
everything written on the way, and no later commit takes that back.

**So: if the branch looks like private work, stop and say so.** Ask rather than assume. What
should reach `main` is copied across as a fresh commit — `git checkout <branch> -- <path>` — or
cherry-picked commit by commit. Never merged.

The awkward part is that this skill exists to merge, so the reflex and the rule point opposite
ways. That is exactly why it is written down here rather than left to be remembered.

## Procedure

1. **Pick the worktree to land.** Context first: if the user named a branch, or we've just been
   discussing one that's now done, use that. Otherwise run `git worktree list`, exclude the
   main checkout (the first entry `git worktree list` prints), present the rest (feature,
   branch, path), and ask. `<feature>` = the worktree directory basename minus the `<repo>-`
   prefix, where `<repo>` is the basename of the main checkout.

   **If the directory suffix and the branch name disagree**, say so before doing anything —
   `/spinup` keeps them identical, and a mismatch means the worktree was made by hand. Use the
   actual branch name from `git worktree list`, not the one reconstructed from the directory.

2. **Determine the integration branch** = the branch the main checkout is on:
   `git -C <repo> rev-parse --abbrev-ref HEAD`. Do **not** assume `main`: this repo works on
   long-lived topic branches and the fork point isn't recorded anywhere, so this reconstruction
   is the source of truth. Call it `<integration-branch>`.

   Sanity-check it against the branch you're landing. If the main checkout has moved to
   something unrelated since the worktree was spun up, merging into it is probably not what the
   user wants — surface the pair and confirm.

3. **Readiness gates — surface, never override. Stop on any failure:**
   - **Worktree clean:** `git -C <worktree> status --short`. If dirty, stop and tell the user
     to commit or discard in the worktree window first — uncommitted work wouldn't be in the
     merge.
   - **Main checkout clean:** `git -C <repo> status --short`. If dirty, stop — can't cleanly
     merge into a dirty tree. This one bites often, because the master session tends to
     accumulate its own edits.
   - **Something to land:** `git -C <repo> log --oneline <integration-branch>..<feature>`. If
     empty, report "already merged / nothing to land", skip the merge, and go to step 5.
   - **Diagram work validates.** If the branch touched any `workflows/*/*.bpmn`, run both
     validators in the worktree before merging — a merge is the wrong place to discover a
     broken diagram:
     ```
     node workflows/diagram/tools/check-di.mjs workflows/<name>/<file>.bpmn
     node workflows/diagram/tools/node_modules/.bin/bpmnlint -c workflows/diagram/.bpmnlintrc workflows/<name>/<file>.bpmn
     ```
     `bpmnlint` needs the `-c`: it looks for `.bpmnlintrc` in the working directory, and this
     repo's lives with the diagram workflow, not at the root. If either fails, report it and
     ask whether to land anyway. Some failures are known and deliberate — an undrawn subprocess
     plane, a path into an external repo — so this is a question, not a hard gate.

4. **Merge into the integration branch.** In the main checkout (already on
   `<integration-branch>`):

   ```
   git -C <repo> merge --no-ff <feature> -m "merge: <summary>"
   ```

   `--no-ff` always records a merge commit, so the branch's shape survives in the history.
   `<summary>` is a short description derived from the work.
   - **Conflict:** stop, report the conflicted paths, and tell the user to resolve in the main
     checkout and commit. Do **not** auto-resolve or `git merge --abort` without asking.
   - **A `.bpmn` conflict is a special case.** Do not hand-merge one. The semantics half and
     the layout half conflict differently, and a textually clean resolution can still produce
     coordinates that belong to neither branch. Take one side whole (`git checkout --ours` /
     `--theirs`), then re-apply the other side's changes through the editor or a fresh edit,
     then run both validators and render before committing.

5. **Report, then the close-window reminder.** Report what landed: `<feature>` merged into
   `<integration-branch>`, and that the branch is left intact (removing it is `/teardown`'s
   job). Then the **key handoff**:

   > Before running `/teardown`: **close the VS Code window for this worktree first.** (VS Code
   > bug — `/teardown` misbehaves if the worktree's window is still open.) Then run
   > `/teardown <feature>` in this session.

   `/land` does **not** chain into `/teardown` itself — the window-close is a manual step in
   between.

## Notes

- Keep this slim: pick, gate, merge, remind. It does not create worktrees (`/spinup`) or remove
  them (`/teardown`).
- To revert a bad merge: `git -C <repo> reset --hard <integration-branch>@{1}` (the merge's
  pre-state in the reflog). Safe here because nothing is ever pushed.
- **No plan-status gate.** In a plan-driven repo this skill refuses to land until the plan says
  Completed. Every worktree here has had a plan since 2026-08-24 (`/spinup` requires one), but
  there is still nothing machine-checkable in it: status is written as prose wherever it fits —
  a bold `**Status:**` line at the top of some, a closing section in others, nothing in a
  brief. So this skill doesn't gate on it.

  **Landing does not mean the plan is finished**, and don't let it imply that. A branch can
  merge with real work still to do, the rest continuing on the integration branch. `/teardown`
  step 6 asks the question directly rather than inferring it. If a `## Status` convention is
  ever adopted, the gate belongs here — it's the cheapest place to catch "we landed something
  half-finished".
