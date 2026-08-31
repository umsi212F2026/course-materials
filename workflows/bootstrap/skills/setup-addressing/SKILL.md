---
name: setup-addressing
description: Record where the course repositories are so that every later session can find them, then run the smoke test to prove the whole chain works. Runs in Installation 1, after setup-repos has cloned the student's repositories, and is what that session ends on.
---

# Set up addressing

The **Addressing** phase, fourth of seven, and then the **Smoke test**, fifth. Together they are
the second half of **Installation 1**, and the smoke test is where that session ends.

You write one small file and then run one program. The file is what makes every future session
able to find anything; the program is what proves it worked, in a way that is a file on disk
rather than your own account of it.

## Operates on

`<parent>` — the folder holding the three clones, which is the folder you are already in. And
`~/.codex/AGENTS.md`, which you create.

You are told `<parent>`. Do not ask and do not choose.

## Why this file exists at all

Codex (ChatGPT) reads `~/.codex/AGENTS.md` at the start of every session on this machine,
whatever folder it is working in. It is the only place the install location is written down.

Everything else in the course is addressed relative to a repository, so it is the same string
on all forty-eight machines. This one fact — where the student actually put things — is the
exception, and this file is where it lives so that nothing else has to guess.

Keep it short. It is read in every Codex session on this machine, including ones that have
nothing to do with this course.

## What you do, in order

**1. Write `~/.codex/AGENTS.md`.** Absolute paths, because it is read from any working
directory. Substitute the real paths — do not leave the angle brackets in:

```markdown
# SI 212

Course materials: <parent>/course-materials
Learning topics: <parent>/learning-topics
Assignments: <parent>/assignments

If a request concerns SI 212 coursework, read
<parent>/course-materials/AGENTS.md before doing anything else.
It lists the available workflows and how to start one.
```

**If the file already exists, do not overwrite it.** Read it first. A student re-running this
may have something else in there, and a course that quietly clobbers a personal configuration
file has done something it should not. Merge in the SI 212 block and leave the rest.

**2. Check the phase.** Run `node course-materials/workflows/bootstrap/tools/check-setup.mjs`.
It should report **reached 4 of 7 — Addressing**. If the paths do not resolve, the most likely
cause is a typo in what you just wrote rather than anything wrong with the clones.

**3. Run the smoke test.** Point it at the `learning-topics` clone:

```
node course-materials/workflows/bootstrap/tools/smoke-test.mjs --dir <parent>/learning-topics
```

It is the only evidence that the addressing works end to end. It reads the entry-point index
you just pointed at, resolves every repo-relative path in it against this machine, and writes
what it found into a repository that is not the one the code lives in.

**Show its output.** The two paths it prints are the point — the course materials found
relative to the script itself, the data directory taken as an argument. Say that much in a
sentence, and no more: this is a check, not a lesson, and there is a workflow whose job is the
lesson.

**4. Check the phase again.** The setup check should now report **reached 5 of 7 — Smoke
test**.

Then hand back to `setup-workspace`.

## Rules

**A failing check is not a reason to try again.** You call the setup check only when you
believe you have finished, so a check that fails is your account and the program's account
disagreeing — not an operation that might work on a second attempt. Running the same steps
again against a disagreement throws away the one interesting fact, which is the whole reason a
program adjudicates here rather than you.

Stop, show the output, and say which check disagreed. The repair path is that the instructor
publishes a fix and the student runs the setup again; `setup-repos` pulls it and the
orchestrator resumes at the phase that failed.

**Never put a credential in `~/.codex/AGENTS.md`.** It holds paths. The API key lives in
`~/.codex/auth.json`, which the app wrote and which nothing in this course reads or prints.

**Do not invent a path to make a check pass.** If `learning-topics` is not where you expect,
the answer is that `setup-repos` did not finish, not that this file should point somewhere
else.

**If the smoke test reports that the repositories are nested**, pass that on rather than
rearranging anything. It means the student's work is inside the course files, which is worth
their instructor knowing and is not yours to fix mid-setup.

## When you cannot finish

Say which step stopped and show the error unedited. Run the setup check and have them submit
its output to the **Installation 1** assignment on Canvas. Submitting a failure is the correct
action.

## Depends on

- [`setup-workspace`](workflows/bootstrap/skills/setup-workspace/SKILL.md) — skill
- [`setup-repos`](workflows/bootstrap/skills/setup-repos/SKILL.md) — skill
- [`check-setup.mjs`](workflows/bootstrap/tools/check-setup.mjs) — tool
- [`smoke-test.mjs`](workflows/bootstrap/tools/smoke-test.mjs) — tool
