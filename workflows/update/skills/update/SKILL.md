---
name: update
description: Bring one of the course repositories up to date with the instructor's copy, committing the student's own work first and helping them through any conflict. Use whenever someone asks whether there is anything new, when an assignment or a topic has been corrected, or when a setup check fails and the fix has been published.
---

# Update

**Status: draft. Not yet run with a student.**

One repository, brought up to date. It is deliberately small and deliberately boring: the whole
value is that it does the same safe thing every time, so that "get the latest" is never an
adventure.

## Operates on

`<repo>` — one of the student's course repositories.

**Establish which one by asking**, unless whoever invoked you named it. There are three, and
they update from different places:

| repository         | pulls from | holds                             |
| ------------------ | ---------- | --------------------------------- |
| `course-materials` | `origin`   | the workflows, skills and tools   |
| `learning-topics`  | `upstream` | their learning work               |
| `assignments`      | `upstream` | assignments and what they hand in |

**The remote is not the same for all three, and getting it wrong fails confusingly.**
`course-materials` is a plain clone of a public repository, so its `origin` is the instructor's
copy. The other two were re-pointed on day 1: their `origin` is the student's own private
repository and `upstream` is the instructor's. Pulling `origin` there gets them their own work
back, which looks like "no updates" and is not.

Read the paths from the student's Codex home configuration rather than guessing them.

## What you do, in order

**1. Ask whether their work is saved.** Editors hold unsaved changes in memory, where nothing
on disk can see them, and a pull rewrites files underneath whatever is open. One sentence:
_have you saved everything?_

**2. Look before you pull.** `git -C <repo> status --short`. Say what you find in plain words —
"you have three files with changes that aren't committed yet" — rather than showing them the
raw output.

**3. Commit their work first, if there is any.** Not stash: a commit is visible, has a message,
and survives a mistake. Write a plain message describing what changed and show it to them
before committing.

`course-materials` is the exception — it is pull-only and should never have local changes. If
it does, **stop and report** rather than committing them. Something wrote to a repository
nothing is supposed to write to, and quietly committing it hides that.

**4. Pull.** `git -C <repo> pull <remote> main`, with the remote from the table above.

**5. Say what arrived**, in plain words. Not a commit log — what is new or different that they
would care about: a new assignment, a corrected topic, a fixed tool. If nothing came, say that
too; "already up to date" is a useful answer.

**6. If it conflicted, work through it with them.** See below.

## When a pull conflicts

This is the one part that is not mechanical, and it is why this is a skill rather than a
command.

A conflict means the same lines changed on both sides. It is not a mistake by anyone and it is
not a sign that something is broken.

- **Show them the conflict in their own words**, one file at a time — what they wrote, what the
  instructor changed, and why both versions exist.
- **Ask which they want**, or propose a combination and have them confirm it. Do not choose
  silently, and do not default to the instructor's version because it came from an instructor.
  Their work is not less important than the update.
- **Never discard their side to make the conflict go away.** `--ours`, `--theirs` and
  `git checkout --force` are not shortcuts here; they are ways to lose work that nobody notices
  until much later.
- **If it is beyond a few files, stop.** Say so plainly, leave the repository mid-merge rather
  than resolving it badly, and tell them to bring it to their instructor. `git merge --abort`
  puts it back exactly as it was, and is the right move if they would rather not leave it open.

## Rules

**Retry a network operation once, and only once.** A clone or a download that dies on a
connection reset or a timeout has not told you anything about the machine — it is worth doing
the same thing one more time before deciding it failed.

What counts: connection reset, timed out, could not resolve host, an interrupted transfer. What
does not: anything asking for credentials, a 404, permission denied, no space left. Those are
the machine or the address telling you something true, and doing it again just says it twice.

**This never applies to a check.** Retry the operation that visibly failed, at the moment it
failed. A doctor check that fails is a disagreement, not a hiccup — see above.

**One repository at a time.** If they want all three, do them one after another and say which
you are on. A single "updating everything" that half-fails is a state nobody can reason about.

**Do not pull in the middle of a sitting.** This belongs at the start of one, or at a moment
the student chose. Files changing under someone who is part-way through a piece of work is
disorienting even when the merge is clean.

**Do not update what nobody asked about.** Being helpfully thorough here means touching
repositories the student was not thinking about, at a moment they did not pick.

## Depends on

- [`doctor.mjs`](workflows/bootstrap/tools/doctor.mjs) — tool
