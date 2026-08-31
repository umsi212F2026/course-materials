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

**1. Check what is already here.** On macOS, `git --version` and `node --version` are a fair
test. On Windows they are not: a missing name on `PATH` is what you get whether or not the
program exists, so ask `winget` and look in `Program Files`:

```powershell
winget list --id Git.Git
winget list --id OpenJS.NodeJS.LTS
Test-Path 'C:\Program Files\Git\cmd\git.exe'
Test-Path 'C:\Program Files\nodejs\node.exe'
```

`Program Files` as well as `winget`, because a machine may have had either installed some other
way — by an administrator, or by the student last year — and reinstalling over a working
program is a waste of their morning.

Install nothing yet.

**2. Install what is missing** — git and Node, nothing else. git first: without it there is
nothing to clone with.

**Say what you are about to do in one sentence, then do it. Do not ask.** "Installing git,
which is what downloads the course files" — and install it. Not _may I_, no choices, no waiting
for a reply. If permission is needed the machine puts up its own prompt, which is one click; a
question in the chat stops the student until they notice it, and makes the agent look like it
needs supervising for its own instructions.

**On Windows, install both with `winget`.** The flags are not decoration — each one picks the
variant that does not need an administrator password:

```powershell
winget install --id Git.Git --scope user --silent --accept-package-agreements --accept-source-agreements
winget install --id OpenJS.NodeJS.LTS --installer-type zip --silent --accept-package-agreements --accept-source-agreements
```

**`--scope user` on git**, because its installer ships in both scopes and the machine one
elevates. **`--installer-type zip` on Node**, because its package offers a machine-scope `.msi`
that elevates and a portable zip that does not; without the flag you get the `.msi` and this:

```
Error 1925. You do not have sufficient privileges to complete this installation
for all users of the machine.
```

which stops a student who is not an administrator on the first step of the first day. Nothing
in this course needs Node for anybody but them.

**On macOS**, `xcode-select --install` for git — it ships with the command line tools — and
`node-v24.20.0.pkg` from `nodejs.org/dist/v24.20.0/`.

**If that macOS address 404s, it no longer resolves, and why is not something you can know** —
withdrawn release, renamed asset, or a mistake in this file. Only then ask the project for its
current version, take the equivalently-named asset, and say what you asked and what you found.
Not the API first: it allows sixty requests an hour from one address and a lab section shares
one, so a class that resolves "latest" exhausts it and the failure looks like a network
problem.

### On Windows, install with `winget` and nothing else

It is what OpenAI documents for installing developer tools from inside this app, and the package
IDs above are theirs.

**Do not download an installer and run it.** Windows installers mostly default to
`%LOCALAPPDATA%\Programs`, and a write there from inside this app does not reach the student's
machine — it succeeds, reports success, and is not there afterwards. Measured 2026-08-27: one
file written to `%USERPROFILE%\Programs` and one to `%LOCALAPPDATA%\Programs` in the same
session; from the student's own PowerShell, only the first existed.

**It is not permissions, and not a setting anyone can change.** In that same measurement the
agent's account and temp directory were identical to the student's, and Codex's `elevated`
sandbox was configured throughout. It is the app's own MSIX packaging, which redirects AppData
writes into a private per-app store. Nothing in `config.toml` reaches it, and an administrator
password does not either.

`%USERPROFILE%` writes through. That is the whole rule, and it is why the clones and
`AGENTS.md` have always worked.

**Never test for `winget` by running `winget --version`.** It answers _"not recognized"_ on a
machine where `winget install` works perfectly, because `winget.exe` sits inside the redirected
region and a version check is not the kind of command this app escalates. Believe it and you
will fall back to a download-and-run install that silently installs nothing. Run the install
command and let it report. Do not assert a cause.

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

**`PATH` does not update in a session that is already running.** After installing, `git` and
`node` may still not be found by name. That is not a failed install and **not a reason to
install again**. On macOS both are on `PATH` once installed.

**On Windows, do not guess at the path either.** A `winget` install places things where that
service chooses, and those locations are inside the region this app cannot see — so the paths
that would work for the student may not resolve for you, and `Test-Path` returning false here
proves nothing about their machine. Ask `winget` where it put things rather than reasoning
about it:

```powershell
winget list --id Git.Git
winget list --id OpenJS.NodeJS.LTS
```

**If you still cannot run `node` after installing it, stop and say so.** Do not install it a
second time, do not download it, and do not report the phase as done — the setup check is a
Node script, so a Node you cannot run is a phase you cannot finish. Say what you tried and hand
the student the setup check instructions for their own terminal.

**This is the least-tested part of this skill.** Both trial machines already had git and Node
before any run, on both platforms, so neither install path has been exercised end to end. If
something here does not match what you see, believe the machine and report it rather than
improvising an install.

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
