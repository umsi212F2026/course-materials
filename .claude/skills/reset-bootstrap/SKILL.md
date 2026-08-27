---
name: reset-bootstrap
description: Put a test machine back to before first-day setup, so setup-workspace can be run against a folder that has not already been set up. Use between iterations of a bootstrap test run. Deletes the clones and removes the SI 212 block from ~/.codex/AGENTS.md; the installs it deliberately leaves alone. Run here, in Claude Code, never in Codex.
---

# Reset the first-day bootstrap

Codex runs the setup; this undoes it. Run it here between iterations of a test run of
`workflows/bootstrap/skills/setup-workspace/SKILL.md`.

**A new Codex project pointed at a new folder is not a reset**, which is the reason this
exists. A fresh folder isolates the clones and the tour artifact — phases 3 and 5 — and nothing
else. Two things survive it, and one of them corrupts the result:

- `~/.codex/AGENTS.md` is machine-global, and `setup-addressing` is told to merge into it
  rather than overwrite. The second run finds the first run's block still there.
- `check-setup.mjs` **prefers the paths recorded in `AGENTS.md`** over the parent of its own
  clone. So the second run's setup check checks the first run's repositories, and passes.
  Repeated runs get quietly more likely to pass, which is the wrong direction for a test.

## What it resets, and what it deliberately does not

| survives a new folder               | this skill                                                        |
| ----------------------------------- | ----------------------------------------------------------------- |
| the three clones, `tour.md`         | deletes                                                           |
| `<parent>/.si212-editors.json`      | deletes — see below                                               |
| the SI 212 block in `AGENTS.md`     | removes                                                           |
| git, Node                           | **leaves** — phase 2 passes free on every run after the first     |
| Zettlr, Camunda, Zettlr's autosave  | **leaves** — phase 6, same                                        |
| `~/.codex/config.toml`, `auth.json` | **leaves** — prompt steps 3–5 are U-M GPT's part, not this one's  |
| the Codex project itself            | leaves, and the folder path with it, so the project keeps working |

Say that second column out loud at the end of every run. It is the definition of what the next
iteration does **not** test: this loop exercises phases 3, 4, 5 and the orchestration honestly.
Phases 2 and 6 are only ever tested once per machine, and after that need a VM snapshot.

Nothing global needs undoing beyond `AGENTS.md`: `setup-repos` sets the git identity per
repository, with `git -C <repo> config`, so it dies with the clones.

## Levels

Ask which, unless the conversation already settled it. Default to **full**.

| level               | removes                                             | next run's setup check | what that tests                                                                           |
| ------------------- | --------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| **full**            | all three clones, `tour.md`, `hello.txt`, the block | nothing cloned         | the whole thing: the URL→disk boundary, every skill in order                              |
| **from addressing** | the block and `tour.md`; keeps the clones           | reached 3 of 7         | the resume path, and `setup-repos` updating instead of cloning                            |
| **from smoke**      | `tour.md` only                                      | reached 4 of 7         | that `setup-addressing` **merges** into an existing `AGENTS.md` rather than clobbering it |

Both partial levels re-enter at `setup-addressing`, which owns phases 4 and 5. The difference
between them is whether `AGENTS.md` already exists, and that difference is the point of the
second one.

## Procedure

1. **Capture the outcome of the run you are ending, before deleting anything.**

   ```
   node <parent>/course-materials/workflows/bootstrap/tools/check-setup.mjs
   ```

   The setup check lives inside the clone, so deleting the clone destroys the only account of
   where the run got to. Print its full output. If the clone never got made, say that instead —
   that is itself the result.

2. **Establish `<parent>`. Ask; never infer, and never default to the working directory.** The
   working directory here is the course repository. Getting this wrong is the one way this
   skill does real damage.

3. **Refuse the dangerous targets outright**, without asking: `/`, `$HOME`, any `Documents`
   level, anything inside this repository or any of its worktrees, and anything that is itself
   a git checkout. A test parent is a plain folder holding three clones.

4. **Check it is a test folder and not real work.** `ls -A <parent>` — if it holds anything
   other than the three clones, `tour.md`'s repository, and the step-7 `hello.txt`, name what
   else is there and ask before going on. Then, for `learning-topics` and `assignments`:

   ```
   git -C <parent>/<repo> status --porcelain
   git -C <parent>/<repo> log --oneline @{upstream}..HEAD
   ```

   `learning-topics/tour.md` shows up untracked and is expected. Commits, or anything else
   modified, mean this is not a folder that exists to be thrown away — stop and say so.

5. **Show the exact list of paths you are about to delete and get a yes.** Delete each named
   child individually. Never `rm -rf` the parent, and never a glob — the parent survives,
   because the Codex project points at it.

   **`<parent>/.si212-editors.json` goes with them.** It is not a clone, so a folder reset
   leaves it, and it holds `setup-editors`' record that it watched the student open a file in
   each editor. Left in place, the next run's setup check reports both editors `CONFIRMED`
   without anyone having opened anything — a pass carried over from a previous student on a
   previous day.

6. **Strip the SI 212 block from `~/.codex/AGENTS.md`**, in place: from the `# SI 212` heading
   to the next top-level heading or the end of the file. Leave everything else exactly as it
   is; it is a personal configuration file that this course is a guest in.

   **If nothing but whitespace remains, delete the file.** Blanking it is not equivalent and is
   worse than doing nothing: `check-setup.mjs` tests the file's contents for truthiness, so a
   file containing only a newline counts as present. At the **from addressing** level, where
   the clones are still there, that makes phase 4 report `0 lines, paths resolve` and **pass**
   — addressing checks out as done when it has been deleted, and the resume starts in the wrong
   place. An absent file reports the honest `not yet`.

7. **Report what survived**, from the second column of the table above, and therefore which
   phases the next run will pass without testing anything.

## Rules

**Touch nothing else in `~/.codex/`.** Not `auth.json`, not `config.toml`, not the session
history. The sign-in and the gateway configuration are what make Codex work at all, and redoing
them each iteration tests U-M GPT's half of the bootstrap prompt, not this half.

**Do not fix anything on the way past.** If the reset turns up a state that looks wrong — a
clone with a remote nobody set, an `AGENTS.md` block with a stale path — that is a finding
about the run you are ending. Report it and delete it as-is. Repairing it silently is how a
test loop stops reporting the bug it just found.

**Delete, do not rearrange.** No moving a folder aside "just in case", no `.bak` copies. A
half-reset machine is harder to reason about than either a clean one or a used one, and the
next run's setup check cannot tell you which it got.

## Notes

- Written 2026-08-25, before the first repeat run. The `AGENTS.md` precedence in step 6 is read
  off `check-setup.mjs`, not observed — if the setup check's handling of that file changes,
  this changes with it.
- The public `course-materials` repository must actually contain the skills, the tools and the
  tour before any of this is worth running. As of writing it holds the config and the bootstrap
  prompt only, so step 8 of the prompt fetches a 404.
