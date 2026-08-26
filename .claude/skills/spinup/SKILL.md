---
name: spinup
description: Bootstrap one or more isolated git worktrees for parallel Claude sessions, each in its own VS Code window. Use when the user wants to start or parallelize work on a separate branch without disturbing the branch this checkout is on. Derives the feature name, pre-flights collisions, and runs scripts/worktree-new.sh for each.
---

# Spin Up Parallel Worktree Sessions

Bootstrap isolated git worktrees so several Claude sessions can work different branches in
parallel — one branch per VS Code window. This skill is the master-session front door to
`scripts/worktree-new.sh`; that script remains the source of truth for how a worktree is
created and bootstrapped. Keep this skill a thin wrapper — selection, naming, and reporting
only. Do not reimplement the script's steps here.

**The reason this exists:** a second session must never `git checkout` a different branch in
this directory. Another window is working here. A worktree gives the new branch its own
directory and leaves this one alone.

## What this skill does NOT do

It bootstraps worktrees and opens VS Code windows. It does **not** drive the child sessions —
each new window runs its own Claude that the user interacts with by hand. The master session's
job ends once the windows are open and the mapping is reported.

## Every worktree starts from a plan file

**No worktree without one.** A feature name and a plan file are both required. Adopted
2026-08-24, reversing the older rule that a plan was optional.

The reason is what happens at the other end. `/start` reconstructs the task from the plan, the
branch's commits, and its uncommitted changes — and on a _freshly_ spun-up worktree the last
two are empty by construction, because the branch just forked and nobody has done anything on
it. With no plan, the new window has nothing but a branch name, and the context that produced
it is stranded in the master session where the user can't get at it.

**Most of the time no plan will exist**, because much of the work here comes off a running
task list or straight from conversation. That is not a reason to skip the file — it is
the case the file exists for. Write one. It does not have to be a deliberated plan; a brief
that records what the master session just worked out is exactly the point, and step 2 says what
goes in it.

A brief and a plan live in the same place and follow the same naming rule. They differ in how
much thought went in, not in kind: both are forward-looking instructions to whoever opens the
new window.

## Procedure

1. **Determine what to spin up.** This skill runs inline in the master session, so it sees the
   whole conversation — use it.
   - **From context first.** If the user named the work, or the recent conversation has clearly
     been about a specific piece of it, infer the feature name from that. Confirm before acting
     ("Spinning up `superpowers-planes` — go?") rather than silently, in case the inference is
     off.
   - **Ask only when context doesn't settle it.** A short question beats a menu: "What should I
     call the branch?" If the work belongs to an existing plan, Glob `plans/*.md` (excluding
     `completed/`) and offer those as a numbered text list — not AskUserQuestion, which caps at
     four options.

2. **Derive the feature name, then get a plan file at `plans/<feature>.md`.**

   The name: short, kebab-case, descriptive of the work rather than the artifact —
   `superpowers-planes`, not `bpmn-edits`. From an existing plan, take the filename without
   `.md` and strip a leading `YYYY-MM-DD-` prefix. Show the user the derived name and let them
   override.

   **The branch name, the directory suffix, and the plan's basename are all the same string.**
   `/land` and `/teardown` reconstruct each from the other, and `/start` finds the plan by
   matching its basename to the branch. A worktree at `<repo>-foo` whose branch is `foo-bar`
   will confuse all three. If you find one, say so.

   Then, if no plan matches, **write the brief yourself from the conversation.** You are in the
   master session and have the context the new window won't. Keep it short — half a page is
   plenty — and cover:

   - **What the work is**, in a sentence, and **why now**.
   - **What was already decided here**, so the new session doesn't reopen it. This is the
     load-bearing part; it is the thing that would otherwise be lost.
   - **Where to start** — the first file or the first question.
   - **What's out of scope**, if the conversation drew a line anywhere.
   - **What done looks like**, including which validators have to pass.

   Say it is a brief rather than a deliberated plan, and date it. Then **show it to the user
   and get an explicit okay before creating the worktree** — a wrong brief costs the new
   session more than no brief, since it will be believed.

   Commit it on the base branch before spinning up, so the worktree inherits it tracked and
   there is no untracked copy left behind here. (`worktree-new.sh` will also copy an
   uncommitted plan into the worktree, but that leaves the original sitting untracked in this
   checkout.)

3. **Pre-flight each name** (surface collisions, never clobber):
   - No branch already named `<feature>`
     (`git show-ref --verify --quiet refs/heads/<feature>`).
   - No worktree dir at `~/Documents/Documents/code/.worktrees/<repo>-<feature>`.
   - `plans/<feature>.md` exists — step 2 either found it or wrote it. If it doesn't, go back
     to step 2 rather than spinning up without it. If anything collides, tell the user and ask
     for a different name.

4. **Run the script for each**, one atomic command each, from the repo root (not from inside a
   worktree):

   ```
   scripts/worktree-new.sh <feature> plans/<feature>.md
   ```

   By default the script branches off the branch THIS checkout is on — so the worktree inherits
   the master session's work, including local unpushed commits. That is usually what you want.
   To branch from somewhere else, pass `--base <ref>`.

   **This repo has no remote**, so `--base origin/main` will not resolve; the script says so
   rather than failing obscurely. Everything integrates locally.

   The script also copies `.claude/settings.local.json` (gitignored, and without it the new
   session re-prompts for every permission already approved), runs `npm install` in
   `workflows/diagram/tools/`, and opens a new VS Code window.

5. **Report the mapping** back to the user — for each: `branch -> worktree dir -> plan`, and
   note the window is open. Then the handoff:

   > Start a fresh Claude session in each new window — **a session in the VS Code extension,
   > not a terminal one.** Terminal Claude with `/ide` is one-way: it can open files and show
   > diffs, but it never receives the editor's selection or active-file context, and the
   > highlight-a-line-and-discuss workflow dies with it.

## Notes

- Worktrees live in the corral `~/Documents/Documents/code/.worktrees/`, named
  `<repo>-<feature>` — a hidden dot-dir, sibling to the repos, never nested inside one. Nesting
  makes editors and test runners recurse and double-index.
- **Why `workflows/diagram/tools/` and not the repo root** for `npm install`: that is this
  repo's only npm package, and it holds `bpmnlint` plus the deps `check-di.mjs`, `render.mjs`
  and `autolayout.mjs` need. Every other workflow's tools are plain node with no dependencies
  at all. A worktree without them can edit a `.bpmn` but cannot validate it, which is the one
  thing every diagram change must do.
- The lifecycle is `/spinup` → `/start` (in the new window) → work → `/land` → close the window
  → `/teardown`.
- If the user asks to spin up several at once, run the script once per feature; each opens its
  own window.
