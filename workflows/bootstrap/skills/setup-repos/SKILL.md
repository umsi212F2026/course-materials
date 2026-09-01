---
name: setup-repos
description: Install git and Node, clone the three course repositories, and set up the student's git identity — so that everything after this can be read from their own disk instead of the network. The first skill of Installation 1, on a student's first day, and the one that has to be fetched by URL.
---

# Set up the repositories

The **Runtime** and **Repositories** phases, second and third of seven, and the first half of
**Installation 1** — the first of the three setup sessions. `setup-workspace` handed off to you.

**You are the skill that ends the network.** Everything before you — including you — is fetched
from a raw GitHub URL, because there is nothing on the student's disk to read. Everything after
you is read from the clone you are about to make. That is why the installs live here rather
than in a skill of their own: git is needed _in order to_ clone, and Node for the setup check
that lives _inside_ the clone. Neither is a phase anyone can check until you have finished.

## Operates on

`<parent>` — the folder holding `course-materials`, which is the folder you are already in.

You are told this. Do not ask, and do not choose — `setup-workspace` established it and the
student's project is attached to it. If you clone somewhere else, nothing afterwards will find
what you cloned.

## What you do, in order

**1. Check what is already here.** On Windows:

```powershell
winget list --id Git.Git
winget list --id OpenJS.NodeJS.LTS
Test-Path 'C:\Program Files\Git\cmd\git.exe'
Test-Path 'C:\Program Files\nodejs\node.exe'
```

**Those two paths are constants, not discoveries.** Everything this course installs goes
machine-wide into `Program Files` — see the Windows rule below for why nothing here installs
per-user.

**Do not judge by `git --version` or `node --version` in your own session.** `PATH` does not
update in a process that is already running, and yours started before any of this, so both answer
"not found" whether or not the program is there. Believe `winget list` and the paths.

A machine may already have had either installed some other way — by the student last year, or by
whoever set the laptop up — and reinstalling over a working program is a waste of their morning.

On macOS, `git --version` and `node --version` are a fair test and none of the above applies.

Install nothing yet.

**2. Install what is missing** — git and Node, nothing else. git first: without it there is
nothing to clone with.

**Say what you are about to do in one sentence, then do it. Do not ask.** "Installing git,
which is what downloads the course files" — and install it. Not _may I_, no choices, no waiting
for a reply. If permission is needed the machine puts up its own prompt, which is one click; a
question in the chat stops the student until they notice it, and makes the agent look like it
needs supervising for its own instructions.

**On Windows, install both with `winget`, machine-wide, and no flags beyond the silent ones:**

```powershell
winget install --id Git.Git --silent --accept-package-agreements --accept-source-agreements
winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
```

**A Windows administrator prompt may appear for each. Say so before installing, and do not
promise it.** If it comes, it is the machine asking permission to install a program, answered
with their own login password, which will not show as they type. Measured 2026-08-31: on a
machine whose user was already an administrator, neither install prompted at all — Codex's
`elevated` sandbox already holds the rights, so it installs straight through. Both outcomes are
normal; a student told to expect a password box that never arrives decides the instructions are
wrong.

**Do not reach for `--scope user` or `--installer-type zip`.** Both exist, both avoid the
password prompt, and both install under `%LOCALAPPDATA%`, where your sandbox cannot execute what
you just installed. This skill told you to use them until 2026-08-31, and on the first clean
machine that ever ran it, Installation 1 could not be finished at all.

**On macOS**, `xcode-select --install` for git — it ships with the command line tools — and
`node-v24.20.0.pkg` from `nodejs.org/dist/v24.20.0/`.

**If that macOS address 404s, it no longer resolves, and why is not something you can know** —
withdrawn release, renamed asset, or a mistake in this file. Only then ask the project for its
current version, take the equivalently-named asset, and say what you asked and what you found.
Not the API first: it allows sixty requests an hour from one address and a lab section shares
one, so a class that resolves "latest" exhausts it and the failure looks like a network
problem.

### The Windows rule — what this app can and cannot write

**This is the canonical statement. Everything else in the course that touches it points here.**

The Windows app is installed from the Microsoft Store, so it is MSIX-packaged, and Windows
virtualizes part of what a packaged app writes. **Two locations, and nothing else:**

- **`AppData`** — both `Local` and `Roaming`. A file the app **creates** there is written to a
  private per-package store instead. Opening that path afterwards is served **from the store
  first**, and only falls back to the real location if the store has no copy.
- **`HKCU`** — registry writes, the same way.

Everything under `%USERPROFILE%` outside `AppData` is untouched. That is why the clones,
`.gitconfig` and `~/.codex/AGENTS.md` have always worked, and it is not a coincidence to be
grateful for — it is the documented boundary.

**And a second, separate mechanism restricts what your commands may run.** Codex's Windows
sandbox grants read and execute on `C:\Windows`, `C:\Program Files`, `C:\Program Files (x86)`
and `C:\ProgramData` — and nowhere else. A tool installed per-user under `%LOCALAPPDATA%` sits on
the student's `PATH`, runs perfectly in their own terminal, and fails for you with _Access is
denied_.

**Do not confuse the two.** They both involve `AppData`, which is why they look like one thing.
Redirection is about where **your writes** go. The sandbox is about what **commands you run** may
touch. Nothing in `config.toml` changes the second, and it is reported as
[openai/codex#27171](https://github.com/openai/codex/issues/27171) with the same remedy given
here.

Three things follow, and they are the whole of it.

**1. Install through `winget`, never by downloading an installer and running it.** Installers
default to `%LOCALAPPDATA%\Programs`, which is inside the redirected zone: the install succeeds,
reports success, and the student has nothing. `winget` hands the work to a service outside the
package, so what it installs lands on the real machine. It is also what OpenAI documents for
installing developer tools from inside this app, and the package IDs above are theirs.

**2. You cannot check your own work there.** Because a read is served from the store first, a
file you created and then looked for is found whether or not the student has it. Asking harder
does not help. If something must be confirmed, have the student check from their own PowerShell,
which is not in the package — or look in the store directly, which is what `check-setup.mjs`
does.

**3. Install machine-wide, and accept the administrator prompt.** Never `--scope user`, never
`--installer-type zip`. Those flags avoid the password box and put the tool where your sandbox
cannot execute it, which trades a prompt the student can answer for a failure nobody can. That
is why **a local administrator is a prerequisite for this course on Windows**, checked in the
bootstrap prompt before anything is downloaded rather than discovered at install time.

**Never test for `winget` by running `winget --version`.** It answers _"not recognized"_ on a
machine where `winget install` works perfectly. Believe it and you will fall back to a
download-and-run install that silently installs nothing. Run the install command and let it
report. Do not assert a cause.

Reference: Microsoft, [_Understanding how packaged desktop apps run on Windows_](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-behind-the-scenes)
— see "AppData operations on Windows 10, version 1903 and later" and the registry table.

**A password prompt is not a blocked machine.** Three situations, and only the last ends the
day:

- **A password box they can fill in.** Say what it is — the machine asking permission to
  install a program — and have them type their own login password. Say it will not show as they
  type. Ordinary, not a failure.
- **A security warning about an unrecognised app.** Windows SmartScreen offers **More info**
  and then **Run anyway**; on macOS, right-click and choose **Open**. Once per program.
- **A password that does not exist**, because the machine is not theirs to install on. Now
  stop: that is the loaner conversation with their instructor.

Work through the first two with them, in plain words, as many times as it takes. Do not report
a machine as blocked because a dialog appeared — check first whether they can answer it.

### `PATH` does not update in a session that is already running

**So for the rest of this session, call them by their full paths.** Windows adds `Program Files`
entries to the machine `PATH`, but a process that is already running never sees that, and you
are one. Do not conclude an install failed because a bare `git` or `node` is not found.

```
"C:\Program Files\Git\cmd\git.exe"
"C:\Program Files\nodejs\node.exe"
```

Those are fixed, which is the point of installing machine-wide — you do not have to find them.
Use the second one for the setup check too:

```powershell
& "C:\Program Files\nodejs\node.exe" course-materials\workflows\bootstrap\tools\check-setup.mjs
```

**Do not try to reload `PATH` instead.** Reading it back from the registry looks like the obvious
fix and does not work: measured 2026-08-31, `[Environment]::GetEnvironmentVariable("Path","User")`
returned a stale view from inside the app, missing an entry the student's own PowerShell showed —
so the reload sets `PATH` from something that was never right, confidently.

**Later sessions do not need any of this.** Installations 2 and 3 run in an app started after the
installs, so `git` and `node` work by name there.

**If a full path still will not run, stop and say so.** Do not install a second time, do not
download anything, and do not report the phase as done — the setup check is a Node script, so a
Node you cannot run is a phase you cannot finish. Say what you tried and quote what came back.

**On macOS none of this applies**; both are on `PATH` once installed.

**3. Clone all three repositories — or update them if they are already here.** A student may be
re-running this after a failure, and the point of a re-run is usually that a fix has been
published since. For each repository that already exists, follow
[`update`](workflows/update/skills/update/SKILL.md) on it instead of cloning, and say what
arrived.

**`course-materials` first, and re-read your instructions afterwards if it changed.** You are
being read from that repository, or about to be. An update to it can replace the very skills
you are part-way through, including this one, which is confusing in a way nothing will warn you
about.

For each one that is missing, clone it into the folder you are in:

```
git clone https://github.com/umsi212F2026/course-materials.git course-materials
git clone https://github.com/umsi212F2026/learning-topics.git  learning-topics
git clone https://github.com/umsi212F2026/assignments.git      assignments
```

All three are public. **If any of them asks for credentials, stop** — a GitHub account is not
needed today, and being asked for one means something is wrong with the URL rather than with
the student.

### On Windows, one more step, and skipping it breaks everything after it

Cloning needs the network, the network needs elevation, and elevation runs as the student — who
is in the Administrators group, so Windows gives what they create to `BUILTIN\Administrators`.
Everything afterwards runs unescalated as a different account, and git refuses a repository
owned by somebody else with `fatal: detected dubious ownership`.

**While you are still elevated**, register the folder as safe — one line, forward slashes, the
full path to `<parent>` with `/*` on the end:

```
git config --global --add safe.directory C:/Users/<them>/Documents/si212/*
```

The `/*` covers every repository under the folder. **Never plain `safe.directory *`**, which
switches the check off for every repository on the machine for the rest of its life.

**From the elevated side, and on every Windows run — not only after a fresh clone.** The entry
belongs in the student's `.gitconfig`, which the unescalated account cannot write; attempted
from the wrong side it fails silently and leaves the clones looking finished. And because the
entry names an absolute path, a student who moves their course folder breaks it — re-running
setup is the repair, which only works if this runs when the clones already exist. Re-adding an
existing entry is harmless.

**Nothing else about those clones is wrong.** Files inside them can be written unescalated, so
the ownership is cosmetic once git accepts it. Do not change ownership, do not run `icacls` or
`takeown`, and do not ask the student to turn on Full access.

**On macOS none of this applies.**

**4. Rename the remote on the two student repositories.** Not on `course-materials`:

```
git -C learning-topics remote rename origin upstream
git -C assignments     remote rename origin upstream
```

Say why, in one sentence: `upstream` is where updates come from, and `origin` is being left
free for the repository that becomes theirs in week 2. Doing it now means nothing has to be
undone then.

`course-materials` keeps its `origin` and never gains a personal remote — it is pull-only for
the whole term.

**5. Set their git identity.** In each of the two student repositories:

```
git -C <repo> config user.name  "<their name>"
git -C <repo> config user.email "<uniqname>@umich.edu"
```

**Say exactly this, then stop and wait:**

> From now on, whenever your work gets saved into the course's record of it, your name goes on
> it — that's how your instructor knows which work is yours. What name would you like on it?

**Send that wording, not a version of it.** Reworded to your own phrasing it comes out as "what
name should appear on your course work?", which means nothing to someone who has not yet learnt
what gets saved where.

**Then, and only after they answer:**

> And your uniqname — the part of your U-M email before the @?

Both in one breath reads as one question with two halves and gets answered as neither.

**Build the address from the uniqname; do not ask for an email.** Without an identity git
refuses to record their first piece of work, or invents one from the machine's hostname.

**6. Check the phases.** Run `node course-materials/workflows/bootstrap/tools/check-setup.mjs`
and show its complete output, unedited. It should report **reached 3 of 7 — Repositories**.

That single run covers both your phases. Runtime is self-verifying: the setup check is a Node
script inside the clone, so if it runs at all, git and Node work and the clone succeeded.

**7. Say what these three are for**, in three sentences, because it is the first time a student
sees that their work and the course files are different things. `course-materials` is the
instructor's and they never edit it; `learning-topics` is theirs and private; `assignments` is
what they hand in, and the teaching team can read it. Each has a README saying more.

Then hand back to `setup-workspace`. **Tell it the clone now exists**, so that everything after
this is read from disk rather than fetched.

## Rules

**Do not touch `course-materials`.** No commits, no edits, no new files. It is pull-only, and
the setup check checks it for local modifications precisely because an agent that was told this
can still do it by accident.

**Do not create any of the three.** They already exist and are public. If a clone fails, the
answer is never to `git init` something with the same name — a student left holding an empty
repository that looks right is worse off than one holding nothing, because nobody finds out.

**Stop at the first clone that fails**, and say which. A student with one or two of the three
is in a state the rest of the setup does not expect, and `course-materials` failing is the
worst of them: everything after this is read from it.

**A failing check is not a reason to try again.** You call the setup check only when you
believe you have finished, so a check that fails is your account and the program's account
disagreeing — not an operation that might work on a second attempt. Running the same steps
again against a disagreement throws away the one interesting fact, which is the whole reason a
program adjudicates here rather than you.

Stop, show the output, and say which check disagreed. The repair path is that the instructor
publishes a fix and the student runs the setup again; `setup-repos` pulls it and the
orchestrator resumes at the phase that failed.

**Retry a network operation once, and only once.** A clone or a download that dies on a
connection reset or a timeout has not told you anything about the machine — it is worth doing
the same thing one more time before deciding it failed.

What counts: connection reset, timed out, could not resolve host, an interrupted transfer. What
does not: anything asking for credentials, a 404, permission denied, no space left. Those are
the machine or the address telling you something true, and doing it again just says it twice.

**This never applies to a check.** Retry the operation that visibly failed, at the moment it
failed. A check that fails is a disagreement, not a hiccup — see above.

**If an install needs administrator rights the student does not have, stop and say so.** Loaner
laptops are available from the instructor; that is the fix, not a workaround. Do not attempt a
portable build or an install under another account.

**Report what failed. Do not report why you think it failed.** Quote what the command said. A
cause you did not establish is worse than no cause at all, because it is confident, it is
indistinguishable from a diagnosis, and the student will act on it.

**And do not end your turn asking them to approve something.** Whatever prompt there was is gone
from their screen; there is nothing left to click. Say what you tried, show what came back, and
tell them that starting the setup again will offer it once more.

Measured 2026-08-31, in one turn: a run reported _"Node.js installation was blocked because
permission was denied"_ and ended with _"Please approve the Node.js installation and rerun this
request"_ — on a machine where nothing had been denied, no approval was pending, and Node was
already installed and answering `node --version` with `v24.19.0`. Every clause of that was
invented. The same run had earlier explained a failure as _"the bundled setup file is one
directory higher than the skill reference implied"_, which describes nothing that exists.

**Never print the API key**, or any part of it. The setup check output gets pasted into Canvas
by a student who will not think about that.

## When you cannot finish

Say which step stopped and show the error unedited. Run the setup check anyway if you got far
enough for it to run, and have them submit its output to the **Installation 1** assignment on
Canvas.

Submitting a failure is the correct action. It is how their instructor finds out who is stuck,
and it is the only way they find out.

## Depends on

- [`update`](workflows/update/skills/update/SKILL.md) — skill
- [`setup-workspace`](workflows/bootstrap/skills/setup-workspace/SKILL.md) — skill
- [`check-setup.mjs`](workflows/bootstrap/tools/check-setup.mjs) — tool
