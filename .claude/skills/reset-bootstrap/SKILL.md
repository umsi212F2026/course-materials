---
name: reset-bootstrap
description: Put a test machine back to before first-day setup, so setup-workspace can be run against a folder that has not already been set up. Use between iterations of a bootstrap test run. Deletes the clones, removes the SI 212 block from ~/.codex/AGENTS.md, and on Windows also strips the course safe.directory entry from the student's .gitconfig; the installs it deliberately leaves alone. Run here, in Claude Code, never in Codex.
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
| Zettlr, Camunda, their settings     | **leaves** — phase 6, same; see below                             |
| `~/.codex/config.toml`, `auth.json` | **leaves** — prompt steps 3–5 are U-M GPT's part, not this one's  |
| the Codex project itself            | leaves, and the folder path with it, so the project keeps working |

Say that second column out loud at the end of every run. It is the definition of what the next
iteration does **not** test: this loop exercises phases 3, 4, 5 and the orchestration honestly.
Phases 2 and 6 are only ever tested once per machine, and after that need a VM snapshot.

Nothing global needs undoing beyond `AGENTS.md`: `setup-repos` sets the git identity per
repository, with `git -C <repo> config`, so it dies with the clones.

**Zettlr's settings are part of what survives, and they hide its first-run onboarding.** The
config lives outside anything above — `~/Library/Application Support/Zettlr/` on macOS,
`%APPDATA%\Zettlr` on Windows — so once a machine has opened Zettlr, no later run sees the
welcome flow a student sees. That is not a reason to delete it by default: leaving the installs
alone is the whole design of this reset, and the onboarding is not what the loop is testing.

**Delete it only when the first run of Zettlr itself is the thing under test**, and say that
you have, because it makes the run's phase 6 stop being free.

The file-association step in `setup-editors` survives the same way and resets by the same rule.
On macOS a student's **Change All** writes an entry here:

```
plutil -p ~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist | grep -B4 markdown
```

No output means nobody has chosen, and whichever application registered the extension last is
what opens it — which is the state a student starts in, and the reason the step exists.

**On Windows the `.bpmn` association matters more, because that step now has to take.** The
student's choice lands in `HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.bpmn`,
which no folder reset touches. Left there, the next run's step 5 passes on a double-click nobody
in that run set up — and unlike Markdown there is no second application to make the omission
visible. Remove the key when the association is what is under test:

**It lands in one of two places, so clear both and then confirm.** Choosing among applications
Windows already knows writes a `UserChoice` under `FileExts`; browsing to an executable for an
extension nothing has ever claimed — which is what `.bpmn` is — writes the older per-user
association under `Software\Classes` instead. Measured 2026-09-02: `FileExts\.bpmn` did not
exist on a machine where the association was demonstrably working, so do not read its absence as
evidence of anything.

```powershell
Remove-Item -Recurse -ErrorAction SilentlyContinue "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.bpmn"
Remove-Item -Recurse -ErrorAction SilentlyContinue "HKCU:\Software\Classes\.bpmn"
Remove-Item -Recurse -ErrorAction SilentlyContinue "HKCU:\Software\Classes\Applications\Camunda Modeler.exe"
```

**Then check, rather than assuming the removals covered it** — `cmd /c assoc .bpmn` should say
the file association is not found. If it still names something, that is what the next run will
pass on.

Nothing to reset on macOS: `.bpmn` has no other claimant there, so Camunda wins by default and
there is no choice recorded.

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

## On Windows, two more things survive

**You cannot do any of this yourself** — the VM is not reachable from here. Give Paul the
commands and read what comes back, the same way `run-bootstrap-test` handles that machine.

Everything above still applies, plus:

**1. `safe.directory` entries in the student's `.gitconfig`.** Windows setup registers
`<parent>/*` as safe, because the clones come out owned by `Administrators` and git refuses
them otherwise. That entry lives in `C:\Users\<them>\.gitconfig`, outside anything a folder
reset touches, and it **survives into the next run**.

Left in place at the **full** level it is the same class of error as a stale `AGENTS.md` block:
the next run's clones land at the same path, the old entry already covers them, and phase 3
passes without the run ever having exercised the step that makes it pass. Remove it:

```powershell
$c = "$env:USERPROFILE\.gitconfig"
Get-Content $c                                   # show it first, and say what you are removing
(Get-Content $c) -notmatch 'si212' | Set-Content $c
Get-Content $c                                   # confirm
```

If nothing but a `[safe]` header remains, take that too. And if the file holds anything that is
not this course's, leave that alone — it is a personal configuration file the course is a guest
in, exactly like `~/.codex/AGENTS.md`.

**2. Probe folders from any investigation.** The ownership work on 2026-08-26 left `probe2`
through `probe5` inside the workspace. They are clones, so a later `ls` of `<parent>` will not
look like a clean start and the setup check may find more than it expects. Delete them by name.

**What still survives on Windows**, and therefore what the next run does not test: git and Node,
Zettlr and Camunda, `%USERPROFILE%\.codex\` — the same list as macOS, for the same reasons.

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
