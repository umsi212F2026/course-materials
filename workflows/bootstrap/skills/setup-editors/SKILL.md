---
name: setup-editors
description: Install the Markdown editor and the BPMN editor, make Zettlr the application that opens .md files, and watch the student open a real file in each. Runs last in first-day setup, and is required like every other phase — without an editor a student cannot read or write their own work.
---

# Set up the editors

The **Editors** phase, sixth of seven.

Two applications, and they matter more than they look. `study` has the student writing
`notes.md` while the agent prompts; the diagram work needs Camunda. Without these, a student
can watch an agent describe their own work and never read or write it — so this is not the
optional trimming it might seem.

**Installing them is half the phase.** The other half is watching the student open a real file
in each, which is the only thing that establishes they can actually use them.

## Operates on

You install applications, and you write one small file — `<parent>/.si212-editors.json` —
recording what you watched the student do.

## What you do, in order

**Do the work first, then say one thing.** The app shows the student only the **last** message
of your turn; everything before it collapses into `Worked for 31s` and is never seen. So check,
download, install and open before you speak, and let the message be the end of the turn. Adding
a short restatement after a quoted block below replaces it — the student gets the restatement
and not the block, and the block is where the path is.

**1. Say what these are for, in two sentences,** before installing anything. Zettlr is for
reading and writing their own notes and goals directly, rather than only ever seeing them
through an agent. Camunda Modeler is for drawing workflow diagrams later in the term.

**2. Install Zettlr.** Download and install; they open it in step 4.

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
version and take the equivalently-named asset — and carry that version number into step 3,
which needs to match what you actually installed. Say what you asked and what you found, and do
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

**3. Install Camunda Modeler.** Same pinned shape, from
`https://github.com/camunda/camunda-modeler/releases/download/v5.50.1/`:

| Platform           | File                                   |
| ------------------ | -------------------------------------- |
| Mac, Apple Silicon | `camunda-modeler-5.50.1-mac-arm64.dmg` |
| Mac, Intel         | `camunda-modeler-5.50.1-mac-x64.dmg`   |
| Windows            | `camunda-modeler-5.50.1-win-x64.zip`   |

Same 404 rule as Zettlr, against `camunda/camunda-modeler`.

**On Windows this is a zip, not an installer** — Camunda ships no Windows installer at all.
Unpack it to `%USERPROFILE%\Programs\camunda-modeler`, alongside Zettlr, so there is one place
to look for either of them.

It is not needed for weeks, so if it fails, that is the least costly failure in the whole
setup.

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

So: `%USERPROFILE%\Programs\Zettlr` and `%USERPROFILE%\Programs\camunda-modeler`. It needs no
administrator rights, it is not a hidden folder, and it is the same place `check-setup.mjs`
looks — which now refuses to look under `AppData` at all, precisely so that an install into the
container cannot pass.

**And the registry goes the same way, which is why you do not touch file associations.** A
packaged app's `HKCU` writes are redirected too, so `assoc`, `ftype`, and anything written to
`HKCU:\Software\Classes` are invisible outside this app however carefully they are aimed. On
Windows the student's own **Open with → Always** is not a fallback for doing it yourself. It is
the only registry write that happens outside the container, so it is the only one that counts.

None of this applies to macOS, where you write to the real filesystem.

**4. Have them make Zettlr the application that opens `.md` files, by opening one.** From here
on their notes and goals are `.md`, and **Zettlr will not win that on its own.** Markdown is a
crowded type — a dozen applications on an ordinary machine claim it, from text editors to
browsers to Word — and Zettlr's bundle declares no priority for it at all, so whatever else is
installed opens their notes for the rest of the term. This is not a quirk of one machine. Do it
on every one.

Neither platform lets you set it from a command, for different reasons. macOS has no supported
way short of an extra tool; on Windows every registry write you make is redirected into this
app's container and never reaches them. It is theirs to do, and that is the point: setting it
opens the file, and opening the file is the first thing in this course they do without an agent
in between.

The file is the one the smoke test wrote — `<parent>/learning-topics/setup.md`. It names the
two directories their machine now knows about, so it is worth the look on its own.

On macOS, send them this, filling in the real path, and send nothing after it:

> In Finder, open `<parent>/learning-topics` and click once on `setup.md` — one click, not two.
> Press ⌘I, find **Open with**, choose **Zettlr**, then click **Change All…** and confirm. Now
> double-click `setup.md`. It should open in Zettlr, showing where your work lives and where
> the course lives. Send me a screenshot of that.

On Windows, **Zettlr will not be in the list of applications offered**, and a student who is
told to pick it from there will look for something that is not there. Its installer registers
itself for `.md`, but that registration happens in here and is redirected with everything else,
so from their side Zettlr has never announced it opens Markdown. They have to reach the program
directly. Fill in their real user name:

> In File Explorer, open `<parent>\learning-topics` and right-click `setup.md`. Choose **Open
> with → Choose another app**, then scroll to the bottom and click **Choose an app on your
> PC**. In the **File name** box, type this and press Enter:
> `C:\Users\<them>\Programs\Zettlr\Zettlr.exe` Tick **Always use this app to open .md files**,
> then click OK. It should open in Zettlr, showing where your work lives and where the course
> lives. Send me a screenshot of that.

**If they say Zettlr is not there, believe them and check the path.** That is the sound of an
install that went into the container: `Test-Path` it from in here and you will find it, because
you are inside. Ask them to confirm the folder exists in File Explorer instead.

**5. Open the diagram for them, and tell them you did.** The file is the setup they have just
been through, drawn — about something they have just done, which is what makes it their first
readable one. There is nothing to learn from hunting for it, and on Windows they could not open
it by hand anyway: nothing there claims `.bpmn`, so double-clicking one offers Notepad and a
browser and does not list Camunda at all. Open it yourself:

- macOS —
  `open -a "Camunda Modeler" "<parent>/course-materials/workflows/bootstrap/bootstrap.bpmn"`
- Windows —
  `Start-Process "$env:USERPROFILE\Programs\camunda-modeler\Camunda Modeler.exe" -ArgumentList "<parent>\course-materials\workflows\bootstrap\bootstrap.bpmn"`

Run it first, then send this, with nothing after it:

> I have opened Camunda Modeler for you, with `bootstrap.bpmn` in it — that diagram is the
> setup you have just been through. Send me a screenshot when it is on screen.

**Look at both screenshots yourself.** You are checking that the application is open with the
right file in it — not that they say so. If a screenshot shows an empty editor, a different
file, or an error, work through it with them rather than accepting it.

**6. Record what you saw.** Write `<parent>/.si212-editors.json`, creating or replacing it:

```json
{
  "zettlr": { "opened": "learning-topics/setup.md", "on": "YYYY-MM-DD" },
  "camunda": { "opened": "workflows/bootstrap/bootstrap.bpmn", "on": "YYYY-MM-DD" }
}
```

**Only write an entry for a screenshot you actually saw.** The setup check reads this file and
reports those two lines as `CONFIRMED` rather than `PASS`, because they are your word rather
than something it established. Writing an entry for something you did not see puts a false
statement into a report an instructor uses to decide who needs help.

If one editor worked and the other did not, write the one that did and leave the other out.

**7. Check the phase.** Run `node course-materials/workflows/bootstrap/tools/check-setup.mjs`
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

Say which application failed and show the error, and have them submit the setup check output to
the Canvas assignment.

Be accurate about where it leaves them, because the gap is real but narrow: everything the
agent does for them works, and what they cannot yet do is open their own files. That is worth
their instructor knowing today rather than in week three.

## Depends on

- [`study`](workflows/learn/skills/study/SKILL.md) — skill
- [`setup-workspace`](workflows/bootstrap/skills/setup-workspace/SKILL.md) — skill
- [`check-setup.mjs`](workflows/bootstrap/tools/check-setup.mjs) — tool
- [`bootstrap.bpmn`](workflows/bootstrap/bootstrap.bpmn) — diagram, the one they open in
  Camunda
