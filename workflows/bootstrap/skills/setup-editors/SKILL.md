---
name: setup-editors
description: Install the Markdown editor and the BPMN editor, and set Zettlr to save automatically. Runs last in first-day setup, and is required like every other phase — without an editor a student cannot read or write their own work.
---

# Set up the editors

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

**2. Install Zettlr, but do not open it yet.** Step 3 writes Zettlr's configuration file, and
it has to be written before Zettlr's first launch — so download, install, and stop.

**Say what you are about to do, in one sentence, and then do it. Do not ask.** "Installing
Zettlr now" — and install it. Not _may I install Zettlr?_ The machine puts up its own prompt if
it needs permission, and that is one click; a question in the chat stops the student until they
notice and reply, and the app runs a second agent over the whole conversation to assess each
approval, so it costs twice. Three such questions on 2026-08-26 turned ten minutes of work into
thirty-three.

Download the version this course pins, from the project's own releases:

| Platform           | File                     |
| ------------------ | ------------------------ |
| Mac, Apple Silicon | `Zettlr-4.7.0-arm64.dmg` |
| Mac, Intel         | `Zettlr-4.7.0-x64.dmg`   |
| Windows            | `Zettlr-4.7.0-x64.exe`   |

each under `https://github.com/Zettlr/Zettlr/releases/download/v4.7.0/`.

Do not use the download buttons on `zettlr.com`. Those addresses serve a web page, not a file,
and downloading one gets you HTML named like an installer.

**If a pinned address returns 404, it no longer resolves — and why is not something you can
know.** Withdrawn release, renamed asset, or a mistake in this file; same remedy for all three.
Only then, ask `https://api.github.com/repos/Zettlr/Zettlr/releases/latest` for the current
version and take the equivalently-named asset — and carry that version number into step 3,
which needs to match what you actually installed. Say what you asked and what you found, and do
not assert a cause. Do not reach for the API first: it allows sixty requests an hour from one
address, and a room full of students shares one.

On a Mac this is a `.dmg` to mount, with one application to copy into `/Applications`. On
Windows the `.exe` is a wizard; `/S` runs it without one, installing under the student's own
account.

**Neither platform should need an administrator password**, and on Windows the installer's
offer to install for all users is the one thing that asks — take the default instead.

**But if a prompt does appear, a prompt is not a blocked machine.** These are three different
situations and only the last one stops the day:

- **A password box the student can fill in.** Say what it is — the machine asking permission to
  put a new application in the shared Applications folder — and have them type their own login
  password. It is not shown as they type, which is worth saying, because a box that does not
  react to typing reads as broken. This is the ordinary case and it is not a failure.
- **"Zettlr can't be opened because Apple cannot check it for malicious software."** Nothing to
  do with administrator rights, and it arrives at first launch rather than at install. The fix
  is to right-click the app and choose **Open**, then **Open** again in the dialog that follows
  — once per application, and never again. Double-clicking will keep failing for as long as
  they keep trying it, which is the part that makes students think they broke something.
- **A password they do not have.** Now stop, and see the rule below. The distinction is whether
  the password exists and they know it, not whether a box appeared.

**3. Set Zettlr to autosave on a short delay,** by writing its configuration file before Zettlr
has ever been opened:

- Mac: `~/Library/Application Support/Zettlr/config.json`
- Windows: `%APPDATA%\Zettlr\config.json`

Create the folder if it isn't there, and write exactly:

```json
{ "version": "4.7.0", "editor": { "autoSave": "delayed" } }
```

Zettlr merges this over its own defaults, so the two keys are all it needs. `"delayed"` saves
five seconds after the student stops typing.

**The `version` line is not decoration — leave it in, and keep it equal to the version you
installed.** On first launch Zettlr runs a welcome wizard, and that wizard's autosave question
has only two answers: manual, or save immediately. There is no short-delay button on it. A
version that matches the installed app tells Zettlr this is not a first launch, and the wizard
never appears. Get it wrong and the student is shown a screen whose only working choice is the
one this step exists to avoid.

Say why in one sentence, because it is a real thing they will meet: the agent and the student
both write files in this course, and unsaved work in an editor is invisible to everything
outside it. Short delay rather than immediate, because immediate puts half-typed sentences on
disk and the agent reads those files too.

**4. Install Camunda Modeler.** Same pinned shape, from
`https://github.com/camunda/camunda-modeler/releases/download/v5.50.1/`:

| Platform           | File                                   |
| ------------------ | -------------------------------------- |
| Mac, Apple Silicon | `camunda-modeler-5.50.1-mac-arm64.dmg` |
| Mac, Intel         | `camunda-modeler-5.50.1-mac-x64.dmg`   |
| Windows            | `camunda-modeler-5.50.1-win-x64.zip`   |

Same 404 rule as Zettlr, against `camunda/camunda-modeler`. No configuration to write here.

**On Windows this is a zip, not an installer** — Camunda ships no Windows installer at all.
Unpack it to `%LOCALAPPDATA%\Programs\camunda-modeler`, alongside where Zettlr installs itself,
so there is one place to look for either of them.

It is not needed for weeks, so if it fails, that is the least costly failure in the whole
setup.

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

**Help with a prompt; stop at a wall.** The rules above are about not routing around a machine
that has refused you — they are not a reason to abandon a student at a dialog box. A password
they can type, a security warning that needs a right-click, a folder that has to be created
first: work through those with them, in plain words, as many times as it takes. Only a
permission that does not exist on that machine ends the day.

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
