---
name: setup-superpowers
description: Clone Superpowers beside the student's three course repositories, check it out at the commit the course pins, and end on the one line they paste into Canvas. The whole of Installation 4, the first thing session 7's lab does, and what the superpowers entry point needs before it can run.
---

# Set up Superpowers

The whole of **Installation 4**. It comes after the three setup sessions rather than being one
of them: session 7's lab starts with it, with the instructor in the room, and session 8's lab
starts from what it installs.

Superpowers is `obra/superpowers`, the workflow the course's apps are designed and built with.
It is not the course's own, so it does not live in `course-materials`. It goes beside it, as a
clone of its own, and the [`superpowers`](workflows/develop/skills/superpowers/SKILL.md) entry
point reads it from there by path. That is the whole install: one clone, at one commit, and
nothing registered anywhere.

There is nothing to teach here. It is four minutes of plumbing, and the student's part is
approving what the app asks them to.

## Operates on

`<parent>`, the folder the three course repositories sit in, and the clone you make there,
`<parent>/superpowers`.

`<parent>` is the folder holding the `Course materials` path in `~/.codex/AGENTS.md`. That file
is the only place the location is written down, so read it there. Do not ask the student, and
do not take the folder you happen to be running in as the answer.

Nothing in the three course repositories changes, except that step 1 may update
`course-materials`.

## What you do, in order

**Do the work first, then say one thing.** The app shows the student only the **last** message
of your turn, and everything before it collapses out of sight. So clone, check out and check
before you speak, and let step 5's message end the turn.

**1. Make sure `course-materials` holds this skill.** Look for
`workflows/bootstrap/tools/check-superpowers.mjs` in the student's clone. It arrived in the same
update as this file and as the entry point that makes the install usable, so if it is there,
they are. If it is not, you were read from the network rather than the clone: follow
[`update`](workflows/update/skills/update/SKILL.md) on `course-materials` alone, then carry on
from the clone.

**2. Clone it, unless it is already there.** Do not ask first. If reaching the network needs
approval, the app puts up its own prompt, which is one click. From `<parent>`:

```
git clone https://github.com/obra/superpowers.git superpowers
```

**If `<parent>/superpowers` already exists**, the student is running this again. Do not clone
over it and do not delete it. `git -C superpowers remote get-url origin` says what it is: if it
is `obra/superpowers`, take it on to step 3 as it is. If it is anything else, or not a clone at
all, stop and say what you found. Whatever it is, it is not yours to move.

**On Windows** the clone runs escalated, like the three in Installation 1, so the Administrators
group owns it. The `safe.directory` entry [`setup-repos`](workflows/bootstrap/skills/setup-repos/SKILL.md)
registered for `<parent>/*` already covers it. Do not add another.

**3. Check out the pinned commit.**

```
git -C superpowers checkout --quiet b36e0829c6d0140e93cfef2ca599b1b07d4a7797
```

That is v6.3.0. **Not the latest, and never pull.** A fresh clone lands on upstream's `main`,
which is ahead of this. The pin is the commit the course's diagram of Superpowers was drawn
from, and forty-eight machines on one commit is the only version of this anyone can debug in a
room.

git calls the result a detached HEAD. That is correct for a clone nobody works in, only reads,
so do not switch it to a branch.

If git says it has no such commit, the clone is older than the pin: `git -C superpowers fetch
origin` once, then check out again.

**4. Check it**, whether or not the steps before this worked. From `<parent>`:

```
node course-materials/workflows/bootstrap/tools/check-superpowers.mjs --dir <parent>/superpowers
```

It prints one line, starting `Installation 4: PASS` or `Installation 4: FAIL`. **That line is the
student's submission**, and the only way to have it is to have run the program. Never write out
what it would have said.

**5. End the turn on the line.** If it passed, your last message is this, filled in, and nothing
comes after it:

> Superpowers is installed. To use it, say what you want to build in your assignments
> repository and name it: "Use Superpowers to build …". Now paste this line into the
> **Installation 4** assignment on Canvas:
>
> ```
> <the line the check printed, exactly as it printed it>
> ```

If it failed, this instead, again with nothing after it:

> Superpowers is not installed yet. <Which step stopped, and what it said, in one sentence.>
> Paste this line into the **Installation 4** assignment on Canvas anyway. It is how your
> instructor finds out who needs help before the next lab, and it is not a mark against you.
>
> ```
> <the line the check printed, exactly as it printed it>
> ```

## Rules

**Do not install it any other way.** Superpowers' own README says to add it from the Plugins
panel in the Codex app, and the app has a skill installer as well. Both copy the files into
Codex's own folders, where the copy drifts from the pin without anyone noticing. Copy and link
nothing into `~/.codex/skills`. If the student asks why not the Plugins panel, that is the
answer: the course reads one clone, by path.

**Do not touch `~/.codex/config.toml`.** Superpowers' notes for Codex ask for lines in it. The
course's setup owns that file, and nothing here needs them.

**Do not add the clone to `~/.codex/AGENTS.md`.** Where it is follows from the `Course
materials` line already there, and that file is read in every Codex session on the machine,
course or not.

**Retry a network operation once, and only once.** A clone that dies on a connection reset, a
timeout or an unresolved host has told you nothing about the machine, and a room of students
cloning at once makes that likelier. Anything asking for credentials, a 404 or permission denied
is the machine telling you something true, and doing it again says it twice.

**A failing check is not a reason to try again.** You run it when you believe you have
finished, so a failure is your account and the program's disagreeing. Stop and end on the
failure message: the line is how it reaches someone who can repair it.

**Report what failed, not why you think it failed.** Quote what the command said. A cause you
did not establish reads as a diagnosis, and the student will act on it.

## When you cannot finish

Run the check anyway and end on the failure message. The one case with no line to paste is step
1 failing, because the check is part of the update it could not get. Then say that in one
sentence and have them paste your sentence into **Installation 4** instead.

## Depends on

- [`check-superpowers.mjs`](workflows/bootstrap/tools/check-superpowers.mjs) - tool
- [`superpowers`](workflows/develop/skills/superpowers/SKILL.md) - skill
- [`update`](workflows/update/skills/update/SKILL.md) - skill
- [`setup-repos`](workflows/bootstrap/skills/setup-repos/SKILL.md) - skill
