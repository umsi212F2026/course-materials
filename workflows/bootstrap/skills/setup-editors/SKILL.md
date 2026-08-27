---
name: setup-editors
description: Install Zettlr, make it the application that opens .md files, and watch the student open a real file in it. Runs last in first-day setup, and is required like every other phase — without an editor a student cannot read or write their own work.
---

# Set up the editor

The **Editors** phase, sixth of seven.

One application, and it matters more than it looks. `study` has the student writing `notes.md`
while the agent prompts. Without it, a student can watch an agent describe their own work and
never read or write it — so this is not the optional trimming it might seem.

**Installing it is half the phase.** The other half is watching the student open a real file in
it, which is the only thing that establishes they can actually use it.

**The BPMN editor is not installed here.** Camunda Modeler belongs to the workflows unit, which
installs it in the week it is first used, with a diagram in hand as the reason. Do not install
it today and do not offer to.

## Operates on

You install one application, and you write one small file — `<parent>/.si212-editors.json` —
recording what you watched the student do.

## What you do, in order

**Do the work first, then say one thing.** The app shows the student only the **last** message
of your turn; everything before it collapses into `Worked for 31s` and is never seen. So check,
download, install and open before you speak, and let the message be the end of the turn. Adding
a short restatement after a quoted block below replaces it — the student gets the restatement
and not the block, and the block is where the path is.

**1. Say what it is for, in a sentence,** before installing anything. Zettlr is for reading and
writing their own notes and goals directly, rather than only ever seeing them through an agent.

**2. Install Zettlr.** Download and install; they open it in step 3.

**Say what you are about to do in one sentence, then do it. Do not ask.** "Installing Zettlr
now" — not _may I install Zettlr?_ The machine puts up its own prompt if permission is needed,
which is one click; a question in the chat stops the student until they notice it.

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
version and take the equivalently-named asset. Say what you asked and what you found, and do
not assert a cause. Do not reach for the API first: it allows sixty requests an hour from one
address, and a room full of students shares one.

On a Mac this is a `.dmg` to mount, with one application to copy into `/Applications`. On
Windows the `.exe` is a wizard; `/S` runs it without one, and **`/D=` must name the
destination** — see the Windows rule below. `/D=` takes no quotes and has to be last on the
line:

```powershell
& "$env:TEMP\Zettlr-4.7.0-x64.exe" /S /D=$env:USERPROFILE\Programs\Zettlr
```

**Neither platform should need an administrator password**, and on Windows the installer's
offer to install for all users is the one thing that asks — take the default instead.

**But a prompt is not a blocked machine.** Three situations, and only the last stops the day:

- **A password box they can fill in.** Say what it is — the machine asking permission to put a
  new application in the shared Applications folder — and have them type their own login
  password. Say that it will not show as they type, because a box that does not react reads as
  broken. Ordinary, not a failure.
- **"Zettlr can't be opened because Apple cannot check it for malicious software."** macOS
  only, nothing to do with administrator rights, and it arrives at first launch rather than at
  install. Right-click the app, choose **Open**, then **Open** again — once per application.
  Double-clicking will keep failing for as long as they keep trying it, which is what makes
  students think they broke something.
- **A password they do not have.** Stop; see the rule below. The distinction is whether the
  password exists and they know it, not whether a box appeared.

### On Windows, install to `%USERPROFILE%\Programs` and nowhere else

**Anything you write under `AppData` may not exist for the student, and you cannot tell from in
here.** On some Windows installations this app is packaged, and then your writes to
`%LOCALAPPDATA%` and `%APPDATA%` are redirected into a private container —
`%LOCALAPPDATA%\Packages\OpenAI.Codex_*\LocalCache\`. You will see them afterwards. They will
not. An installation there launches for nobody, a config file written there configures nothing,
and the setup check run from in here reports it all as present.

You have no way to know which kind of machine you are on before you install, and the failure is
silent on the kind that redirects — so treat every Windows machine as though it does.

Measured on Windows 11, one file written from in here to each location and then looked for from
the student's own shell:

| you write to              | the student sees |
| ------------------------- | ---------------- |
| `%USERPROFILE%\Programs`  | yes              |
| `%USERPROFILE%\Documents` | yes              |
| `%LOCALAPPDATA%`          | **no**           |
| `%APPDATA%`               | **no**           |

**And redirection under `AppData` is selective, which is worse than if it were total.** In the
same run, an installer's shortcut written to `%APPDATA%\Microsoft\Windows\Start Menu` _did_
reach the student, while an ordinary file beside it did not — so a student can end up with a
Start-menu entry for a program that is not there. You cannot tell by writing something and
looking, because you are on the wrong side of the boundary to look from.

So: `%USERPROFILE%\Programs\Zettlr`. It needs no administrator rights, it is not a hidden
folder, and it is the same place `check-setup.mjs` looks — which now refuses to look under
`AppData` at all, precisely so that an install into the container cannot pass.

**And the registry goes the same way, which is why you do not touch file associations.** A
packaged app's `HKCU` writes are redirected too, so `assoc`, `ftype`, and anything written to
`HKCU:\Software\Classes` are invisible outside this app however carefully they are aimed. On
Windows the student's own **Open with → Always** is not a fallback for doing it yourself. It is
the only registry write that happens outside the container, so it is the only one that counts.

None of this applies to macOS, where you write to the real filesystem.

**3. Have them open the file themselves, by double-clicking it.** From here on their notes and
goals are `.md`, and this is the first file in the course they handle without an agent in
between — so the move is theirs, and it is the ordinary one they already know.

The file is the one the smoke test wrote — `<parent>/learning-topics/setup.md`. It names the
two directories their machine now knows about, so it is worth the look on its own.

Send them this, filling in the real path, and send nothing after it:

> Open `<parent>/learning-topics` in your file browser and double-click `setup.md`. Send me a
> screenshot of whatever opens — even if it is not what you expected.

**"Even if it is not what you expected" is doing real work there**, so keep it. What opens
depends on what else claims Markdown on that machine, you cannot know that in advance, and a
student who thinks they have got it wrong will fiddle instead of showing you.

**If it opened in Zettlr, this step is done.** Installing registers Zettlr for `.md`, and on a
machine where nothing else claims the type it simply wins. Do not send them to set an
association they already have.

**If it opened in something else** — a code editor, a browser, a text editor — then Markdown is
contested on their machine and they have to choose. Common, and more so on Macs, where a dozen
applications claim the type and Zettlr's bundle declares no priority for it at all.

You cannot set it for them. macOS has no supported way short of an extra tool, and on Windows
your registry writes may be redirected. Send whichever fits:

> macOS: in Finder, click once on `setup.md` — one click, not two. Press ⌘I, find **Open
> with**, choose **Zettlr**, then click **Change All…** and confirm. Now double-click
> `setup.md` again and send me a screenshot.

> Windows: right-click `setup.md`, choose **Open with → Zettlr**, and tick **Always use this
> app to open .md files**. Then double-click it again and send me a screenshot.

**If Zettlr is not in the Windows list at all, the install did not reach them.** Its installer
registers the file type, so an absence here means the files went somewhere they cannot see — do
not send them hunting for the executable by path. Say what happened and stop.

**Look at the screenshot yourself.** You are checking that Zettlr is open with the right file
in it — not that they say so. If it shows an empty editor, a different file, or an error, work
through it with them rather than accepting it.

**4. Record what you saw.** Write `<parent>/.si212-editors.json`, creating or replacing it:

```json
{ "zettlr": { "opened": "learning-topics/setup.md", "on": "YYYY-MM-DD" } }
```

**Write it only if you actually saw the screenshot.** The setup check reads this file and
reports that line as `CONFIRMED` rather than `PASS`, because it is your word rather than
something it established. Writing an entry for something you did not see puts a false statement
into a report an instructor uses to decide who needs help.

**If they never got it open, write nothing** and say so. A missing file is the honest answer,
and the phase not passing is the correct outcome.

**5. Check the phase.** Run `node course-materials/workflows/bootstrap/tools/check-setup.mjs`
and read the last line it prints.

- **`Reached 6 of 7 — Editors`** — hand back to `setup-workspace`.
- **Anything else** — stop, and show the student the output as it came out.

**Never say what the check would have said.** The number is the one thing here that is not your
judgment, and the only way to have it is to have run the program. Reporting a frontier you
worked out yourself is indistinguishable from a real one to everybody downstream, including the
instructor deciding whether this student needs help.

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
that has refused you, not a reason to abandon a student at a dialog box. Work through those
with them, in plain words, as many times as it takes.

## When you cannot finish

Say what failed and show the error, and have them submit the setup check output to the Canvas
assignment.

Be accurate about where it leaves them, because the gap is real but narrow: everything the
agent does for them works, and what they cannot yet do is open their own files. That is worth
their instructor knowing today rather than in week three.

## Depends on

- [`study`](workflows/learn/skills/study/SKILL.md) — skill
- [`setup-workspace`](workflows/bootstrap/skills/setup-workspace/SKILL.md) — skill
- [`check-setup.mjs`](workflows/bootstrap/tools/check-setup.mjs) — tool
