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
`Work: project/` means `<dir>` is `<assignments>/project`. Ask only where a folder is missing or
not there, and say that is what happened. Where neither names a project folder, send this and
stop:

> Your final project isn't set up yet. Ask me to start your final project.

Run the tool from inside `course-materials`, with the absolute path of `<dir>`. Run every git
command as `git -C <dir>`, limited to `<dir>`.

## What you do

**1. Find them.** Run:

```
node workflows/rounds/tools/rounds.mjs candidates <dir>
node workflows/rounds/tools/rounds.mjs parse <dir>
```

If `candidates` fails, send this and stop:

> I can't look for rounds yet: <its message>
>
> Your rounds start from your base. When your base works, put the hash of the commit where it
> does on the `Base:` line of `ROUNDS.md`, and commit that.

**2. Show them.** Keep the plans with `recorded: false`, oldest first. For each one with
`suggestedCommits`, read its diff and decide whether it clearly is a bug fix, catch-up on the
problem set it extends, or deployment, as
[`record-round`](workflows/rounds/skills/record-round/SKILL.md)'s "Read the round against the
rule" does. When you are not sure, it is none of them.

Number them. Then send this, filled in, and end the turn. Give a plan with no `spec` "no spec
found beside it", and one with no `suggestedCommits` "no commits implement it yet"; neither can
be recorded until that is fixed. Add "This looks like <a bug fix | catch-up on Problem Set <n> |
catch-up on your base | deployment>, which does not count as a round." to the line of each one
step 2 found:

> Your project needs two rounds, and `ROUNDS.md` has <how many valid rounds parse found> so far.
> Since your base, these plans aren't in it yet:
>
> 1. <date>, `<plan>`: spec `<spec>`, commits <suggestedCommits>
> 2. ...
>
> Only a plan committed after your base can be a round, and only the commits after it can
> implement it.
>
> Which of these do you want to record? For each, are those the commits that implement it?

Where the list is empty, send this in its place and end the turn:

> Your project needs two rounds, and `ROUNDS.md` has <how many> so far. Every plan committed
> since your base is already in it. A new round starts with a Superpowers spec and plan.

**3. Record each one they chose.** For each, oldest first, follow
[`record-round`](workflows/rounds/skills/record-round/SKILL.md) with its plan, its spec, its
commits (theirs where they gave different ones) and the folders, as a hand-off from
`find-rounds`. Its step 2 block ends the turn, so the next round begins in the turn after the
last one is committed. When `add-round` refuses one, `record-round` says why and ends the turn;
go on with the next one when the student replies.

When the last one is recorded, send this as the last thing in the turn:

> That's everything you chose. `ROUNDS.md` now has <how many> rounds.

## Depends on

- [`rounds.mjs`](workflows/rounds/tools/rounds.mjs) - tool
- [`record-round`](workflows/rounds/skills/record-round/SKILL.md) - skill
