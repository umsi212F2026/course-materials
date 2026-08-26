---
name: tour
description: Walk a student through what a workflow is made of — a guide, a skill, a script, and the data directory it is pointed at — and leave a record in their learning-topics repository. Use once, at the end of setting up a machine, as the check that the whole chain works.
---

# Tour

**Status: draft.** Written 2026-08-24. Not yet run with a student.

The last step of setting a machine up. Everything before you was installing things and cloning
repositories; you are the first thing that uses any of it.

You have two jobs and they are equally important. One is to show a student what a workflow is,
using yourself as the example. The other is to leave evidence that the addressing works, which
is what the setup check reads. Do not skip the first for the second — a student who watches a
file get written without understanding what wrote it has learned nothing.

## Operates on

`<data-dir>` — the student's clone of `learning-topics`.

You are told this directory. Do not choose it, and do not guess it from the working directory.
Whatever invoked you established it already.

## Who you are talking to

Someone whose machine started working about five minutes ago. They may have watched an agent
write a file during Codex's own setup, or may have skipped that — do not refer to it either
way. Assume this is the first time they have seen a workflow.

They are not a programmer and have no reason to be. Say what you are about to do in one plain
sentence before you do it.

## What you do, in order

**1. Read the guide with them.** Open [`tour.md`](workflows/tour/guides/tour.md) and walk
through it — a guide, a skill, a script, and a data directory. Do not paste it at them
wholesale. Take the four parts one at a time and say which one you are, which one the file they
are reading is, and which one you are about to run.

Tell them where you are: name `<data-dir>` out loud, and say that you were told it rather than
finding it yourself.

**2. Ask them one question.** _What are you hoping to get out of this course?_ One or two
sentences is plenty. Do not coach the answer, do not improve it, and do not ask a second
question — this is the only thing in the whole setup that is theirs rather than the machine's.

**3. Run the script.** Pass their answer through unedited:

```
node workflows/tour/tools/tour.mjs --dir <data-dir> --answer "<what they said>"
```

Show its output. It prints the paths it actually resolved, and those are the point: the course
materials found relative to the script itself, the data directory taken as an argument.

**4. Have them open the file.** It is at `<data-dir>/tour.md`. They open it themselves, in
their editor — you do not read it to them. This is the first time they will look at one of
their own files directly, and it is worth the thirty seconds.

**5. Say what just happened, in three sentences.** A guide explained it, a skill directed it, a
script did the exact part. Then stop.

## Rules

**Do not write anything yourself.** The script writes the file; you run the script. If you find
yourself composing `tour.md`, something has gone wrong — the whole point is that a program made
the record, so that the record is evidence rather than a claim.

**Do not edit their answer.** Not to fix spelling, not to make it a full sentence, not to make
it sound more like a goal. It is theirs.

**If the script fails, stop and show the error.** Do not try another directory, do not create
one, and do not run it a second time with different arguments. Its failures name the problem
precisely, and the setup check that runs next needs to see a real state, not a state you
improvised your way into.

**Report a nested-repositories warning rather than fixing it.** If the script says the data
directory sits inside the course materials, that is worth telling the student and their
instructor. It is not yours to reorganise.

## Depends on

- [`tour.md`](workflows/tour/guides/tour.md) — guide
- [`tour.mjs`](workflows/tour/tools/tour.mjs) — tool
