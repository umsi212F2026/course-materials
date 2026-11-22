---
name: find-rounds
description: Look through a student's final project for Superpowers plans committed after the base that are not rounds in ROUNDS.md yet, and record the ones they choose. Use when the student asks what is missing from their rounds, wants to catch up on them, or is getting ready to submit the final project.
---

# Find rounds for the record

Every Superpowers plan committed after the base, less the ones already in `ROUNDS.md`, shown to
the student with the commits that look like its implementation, so they can choose which to
record. The student decides; you never decide that a round counts.

## Operates on

**Establish the folders from `~/.codex/AGENTS.md`**, which names `course-materials` and the
student's `assignments` repository, before you say anything. The project folder, `<dir>`, is
its `Final project:` line. Where there is no such line, read `<assignments>/project/SUBMIT.md`:
`Work: project/` means `<dir>` is `<assignments>/project`. Where `Work:` is a repository URL
instead, look in the folder that holds `assignments` for a folder whose
`git remote get-url origin` is that repository, by HTTPS or SSH, with or without `.git`. If
there is one, it is `<dir>`: add `Final project: <its absolute path>` to `~/.codex/AGENTS.md` on
the line after `Assignments:`, and go on. If there is none, send this and end the turn, then add
that line with the folder they give and go on:

> Your `SUBMIT.md` says your final project is at <the URL>, but I can't find a copy of it on
> this laptop. Which folder is it in?

Ask only where a folder is missing or not there, and say that is what happened. Where neither
names a project folder, send this and stop:

> Your final project isn't set up yet. Ask me to start your final project.

Run the tool from inside `course-materials`, with the absolute path of `<dir>`. Run every git
command as `git -C <dir>`, limited to `<dir>`.

## What you do

**1. Find them.** Run:

```
node workflows/rounds/tools/rounds.mjs candidates <dir>
node workflows/rounds/tools/rounds.mjs parse <dir>
```

If `candidates` fails, run `say candidates <dir>`, send its output as your reply, as it is, and
stop.

**2. Show them.** Keep the plans with `recorded: false`, oldest first. For each one with
`suggestedCommits`, read its diff and decide whether it clearly is a bug fix, catch-up on the
problem set it extends, or deployment, as
[`record-round`](workflows/rounds/skills/record-round/SKILL.md)'s "Read the round against the
rule" does. When you are not sure, it is none of them.

Then run

```
node workflows/rounds/tools/rounds.mjs say candidates <dir>
```

adding `--looks-like "<plan>=<judgment>"` for each plan you found to be one of them, where the
judgment is `a bug fix`, `catch-up on Problem Set <n>`, `catch-up on your base` or `deployment`.
It prints the numbered list, in the order of `candidates`, or what to say when there is
nothing to record. Send its output as your reply, as it is, and end the turn. The student's
answers refer to its numbers.

**3. Record each one they chose.** For each, oldest first, follow
[`record-round`](workflows/rounds/skills/record-round/SKILL.md) with its plan, its spec (the
one they named where it had none), its commits (theirs where they gave different ones) and the
folders, as a hand-off from
`find-rounds`. Its step 2 block ends the turn, so the next round begins in the turn after the
last one is committed. When `add-round` refuses one, `record-round` says why and ends the turn;
go on with the next one when the student replies.

When the last one is recorded, send this as the last thing in the turn:

> That's everything you chose. `ROUNDS.md` now has <how many> rounds.

## Depends on

- [`rounds.mjs`](workflows/rounds/tools/rounds.mjs) - tool
- [`record-round`](workflows/rounds/skills/record-round/SKILL.md) - skill
