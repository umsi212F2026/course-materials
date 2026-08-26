---
name: setup-editors
description: Install the Markdown editor and the BPMN editor, and set Zettlr to save automatically. Runs last in first-day setup, and is required like every other phase — without an editor a student cannot read or write their own work.
---

# Set up the editors

**Status: draft.** Written 2026-08-25. Not yet run with a student.

The **Editors** phase, sixth of seven.

Two applications and one preference, and they matter more than they look. The tour ends by
having the student open its file themselves; `study` has them writing `notes.md` while the
agent prompts; the diagram work needs Camunda. Without these, a student can watch an agent
describe their own work and never read or write it — so this is not the optional trimming it
might seem.

## Operates on

Nothing in the student's repositories. You install applications and set one preference in
Zettlr's own configuration, which lives outside any workspace.

## What you do, in order

**1. Say what these are for, in two sentences,** before installing anything. Zettlr is for
reading and writing their own notes and goals directly, rather than only ever seeing them
through an agent. Camunda Modeler is for drawing workflow diagrams later in the term.

**2. Install Zettlr.** Tell them before you start and wait for approval. On a Mac this is a
`.dmg` to mount and an application to copy into `/Applications`; on Windows it is an installer.
`TO VERIFY — the download URL on each platform, and whether the Mac copy needs an admin password.`

**3. Set Zettlr to autosave on a short delay.** In its settings, saving is one of manual,
immediate, or a short delay. Choose the **short delay**.

Say why in one sentence, because it is a real thing they will meet: the agent and the student
both write files in this course, and unsaved work in an editor is invisible to everything
outside it. Short delay rather than immediate, because immediate puts half-typed sentences on
disk and the agent reads those files too.

`TO VERIFY — where Zettlr keeps this preference, so it can be set by writing the file rather than by talking someone through a settings pane.`

**4. Install Camunda Modeler.** Same shape. It is not needed for weeks, so if it fails, that is
the least costly failure in the whole setup.

**5. Check the phase.** Run `node course-materials/workflows/bootstrap/tools/doctor.mjs`. It
should report **reached 6 of 7 — Editors**.

Then hand back to `setup-workspace`.

## Rules

**Stop at the first install you cannot complete**, and say which. Do not go looking for another
way to get the same application onto the machine, and do not tell the student they are finished
when they are not — a machine that half-works is worse than one that visibly didn't.

**Do not substitute a different application.** If Zettlr will not install, the student does not
get a Markdown editor today. They do not get Obsidian, or a browser-based editor, or TextEdit
proposed as an equivalent — a student set up differently from everyone else is a support
problem that surfaces in week five, when nobody remembers this conversation.

**If an install needs an administrator password the student does not have, stop and say so.**
That is a loaner-laptop conversation with their instructor, not something to work around.

## When you cannot finish

Say which application failed and show the error, and have them submit the doctor output to the
Canvas assignment.

Be accurate about where it leaves them, because the gap is real but narrow: everything the
agent does for them works, and what they cannot yet do is open their own files. That is worth
their instructor knowing today rather than in week three.

## Depends on

- [`study`](workflows/learn/skills/study/SKILL.md) — skill
- [`setup-workspace`](workflows/bootstrap/skills/setup-workspace/SKILL.md) — skill
- [`doctor.mjs`](workflows/bootstrap/tools/doctor.mjs) — tool
