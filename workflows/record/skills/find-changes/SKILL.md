---
name: find-changes
description: Look through a student's Problem Set 5 history for changes to the diagram or a skill file that are not in their change record yet, and record the ones they choose. Use when the student asks what is missing from their change record, wants to catch up on it, or is getting ready to submit Problem Set 5.
---

# Find changes for the record

Every commit since the initial design that changed `ps5/workflow.bpmn` or a skill file, less
the ones already in `ps5/CHANGES.md`, shown to the student so they can choose which belong in
their record. The student decides; you never decide that a change counts.

## Operates on

**Establish the folders from `~/.codex/AGENTS.md`**, which names `course-materials` and the
student's `assignments` repository, before you say anything. Ask only where it is missing or
names a folder that is not there, and say that is what happened.

Run the tool from inside `course-materials`, with the absolute path of `assignments` as
`<repo>`.

## What you do

**1. Find them.** Run:

```
node workflows/record/tools/changes.mjs candidates <repo>
```

If it fails, send this and stop:

> I can't look for changes yet: <its message>
>
> Your record starts from your initial design. Put its commit hash on the first line of
> `ps5/CHANGES.md`, as `Initial design: <hash>`, and commit that.

**2. Show them.** Keep the commits with `inRecord: false`. The tool has already left out
diagram commits that only moved shapes. **Then read their diffs, all in one command:**
`git -C <repo> show <every hash> -- ps5/workflow.bpmn 'ps5/skills/*/SKILL.md'`. Leave out
every commit whose
diagram or skill part only rewords without changing the meaning, fixes typos or formatting, or
renames something. Those are not worth recording, and listing them teaches the student to skim
the list. When you are not sure, keep it: the student decides what counts.

Number the ones left oldest first. Then send this, filled in, and end the turn. When you left
any out, add "I left out <how many> that only changed wording or formatting." after the list:

> Since your initial design, these commits changed your diagram or a skill and aren't in your
> record yet:
>
> 1. <date>, "<subject>": <the diagram, or the `<name>` skill>. Files: <files>
> 2. ...
>
> Your record counts only changes **you** noticed or guided. A change I noticed and fixed on
> my own doesn't count.
>
> Which of these do you want to record? And do you remember any other change to the diagram
> or a skill that isn't listed, such as one made in the same commit as something else?

Where the list is empty, say "None of your commits since the initial design are missing from
the record." in place of the list, and ask only the second question.

When a commit's files include anything besides the diagram, its spec and skill files, say so in
its line: only the diagram or skill part of it can go in the record.

**3. Record each one they chose.** For each, oldest first, follow
[`record-change`](workflows/record/skills/record-change/SKILL.md) with its commit hash and the
two folders, as a hand-off from `find-changes`. Its step 1 block ends the turn, so the next
change begins
in the turn after the last one is committed. For a change they remember that is not listed,
find its commit with `git log` in `assignments` first, and if you can't find one, ask them
which commit it was.

When the last one is recorded, send this as the last thing in the turn:

> That's everything you chose. Your record now has <how many> entries in `ps5/CHANGES.md`.

## Depends on

- [`changes.mjs`](workflows/record/tools/changes.mjs) - tool
- [`record-change`](workflows/record/skills/record-change/SKILL.md) - skill
