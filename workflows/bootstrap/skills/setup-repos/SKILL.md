---
name: setup-repos
description: Install git and Node, clone the three course repositories, and set up the student's git identity — so that everything after this can be read from their own disk instead of the network. The first skill run on a student's first day, and the one that has to be fetched by URL.
---

# Set up the repositories

The **Runtime** and **Repositories** phases, second and third of seven. `setup-workspace`
handed off to you.

**You are the skill that ends the network.** Everything before you — including you — is fetched
from a raw GitHub URL, because there is nothing on the student's disk to read. Everything after
you is read from the clone you are about to make. That is why the installs live here rather
than in a skill of their own: git is needed _in order to_ clone, and Node for the doctor that
lives _inside_ the clone. Neither is a phase anyone can check until you have finished.

## Operates on

`<parent>` — the folder holding `course-materials`, which is the folder you are already in.

You are told this. Do not ask, and do not choose — `setup-workspace` established it and the
student's project is attached to it. If you clone somewhere else, nothing afterwards will find
what you cloned.

## What you do, in order

**1. Check what is already here.** Report which of git and Node.js are installed, and their
versions. Install nothing yet.

**2. Install what is missing.** git and Node, and nothing else — the editors come later, and
the GitHub CLI is not needed until week 2. Tell the student before each install and wait for
approval.

git has to come first and it is not optional: without it there is nothing to clone with. Node
can wait until after the clones if that is easier, but the doctor cannot run without it.

**Download from these addresses. Do not ask an API which version is current.**

| Platform | git                                                                       | Node                                                     |
| -------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| Windows  | `Git-2.55.0-64-bit.exe` from git-for-windows' `v2.55.0.windows.5` release | `node-v24.20.0-x64.msi` from `nodejs.org/dist/v24.20.0/` |
| macOS    | `xcode-select --install` — git ships with the command line tools          | `node-v24.20.0.pkg` from the same path                   |

**Why pinned, and the editor downloads later in the setup are pinned for the same reason:**
`api.github.com` allows sixty requests an hour from one address, and a room full of students
shares one. A lab section that resolves "latest" here exhausts the limit before anybody reaches
the editors, and the failure looks like a network problem rather than a rate limit. On
2026-08-26 an agent given no pinned address reached for
`api.github.com/repos/git-for-windows/git/releases/latest` and `nodejs.org/dist/index.json`
unprompted — the instinct is strong, so the addresses have to be here.

If a pinned address 404s, the release was withdrawn; only then ask the project for its current
version, and say that you did.

**`PATH` does not update in a session that is already running.** This is not a Windows quirk to
work around once — it will happen every time. After installing git, `git` will still not be
found by name; the same for `node`. Do not conclude the install failed, and **do not install it
again**. Use the full path for the rest of the session:

```
Windows:  & 'C:\Program Files\Git\cmd\git.exe'      & 'C:\Program Files\nodejs\node.exe'
macOS:    git and node are on PATH once installed
```

**The macOS row of that table is untested.** Both trial machines already had git and Node, so
this step has only ever run on Windows. If it fails on a Mac, say so and stop rather than
improvising an install — that improvisation is what the pinned addresses exist to prevent.

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

**Cloning on Windows needs elevation, and elevation is what causes the problem.** You have no
network without it, so the clone escalates; escalation runs as the student, who is in the
Administrators group; and Windows gives what an elevated Administrators member creates to
`BUILTIN\Administrators`. Every command after the clone runs unescalated, as a different
account, and git refuses a repository owned by somebody else:

```
fatal: detected dubious ownership in repository at '...'
```

**So, on Windows only, while you are still elevated from the clone**, register the three
repositories as safe, one line each, with **forward slashes** and the full path:

```
git config --global --add safe.directory C:/Users/<them>/.../course-materials
git config --global --add safe.directory C:/Users/<them>/.../learning-topics
git config --global --add safe.directory C:/Users/<them>/.../assignments
```

**Three named paths. Never `safe.directory *`** — that switches the check off for every
repository on their machine, for the rest of its life, to solve a problem with three folders.

**It has to be done from the elevated side.** The entry belongs in the student's own
`.gitconfig`, in their home folder, and the unescalated account cannot write there — that is
the whole reason this is a step and not something the agent works out later. An attempt from
the wrong side fails silently, leaves the clones looking finished, and surfaces at the doctor
as something else entirely. That happened on 2026-08-26.

**Nothing else is wrong with those clones.** Files inside them can be written unescalated —
`tour.md`, `notes.md`, everything the course does later — so the ownership is cosmetic once git
has been told to accept it. Do not change ownership, do not run `icacls` or `takeown`, and do
not ask the student to turn on Full access.

**On macOS none of this applies.** No elevation, no ownership split, no `safe.directory`.

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

**Two separate questions, and the reason before the first.** They have never heard the word
_commit_ and do not know what git is, so the reason has to be given in words they already have:
_from now on, whenever your work gets saved into the course's record of it, your name goes on
it — that is how your instructor knows which work is yours._ Then ask what name they want on
it.

Ask for the uniqname afterwards, as its own question. Both in one breath reads as a single
question with two halves and gets answered as neither — which is what happened on 2026-08-26,
to a reader who has been at this university for thirty years.

**Build the address from the uniqname; do not ask for an email.** Their umich address is what
attaches this work to their GitHub account in week 2. That is a reason to use it, not a thing
to explain today.

Without any of this, git refuses to record the first piece of work, or invents an identity from
the machine's hostname.

**6. Check the phases.** Run `node course-materials/workflows/bootstrap/tools/doctor.mjs` and
show its complete output, unedited. It should report **reached 3 of 7 — Repositories**.

That single run covers both your phases. Runtime is self-verifying: the doctor is a Node script
inside the clone, so if it runs at all, git and Node work and the clone succeeded.

**7. Say what these three are for**, in three sentences, because it is the first time a student
sees that their work and the course files are different things. `course-materials` is the
instructor's and they never edit it; `learning-topics` is theirs and private; `assignments` is
what they hand in, and the teaching team can read it. Each has a README saying more.

Then hand back to `setup-workspace`. **Tell it the clone now exists**, so that everything after
this is read from disk rather than fetched.

## Rules

**Do not touch `course-materials`.** No commits, no edits, no new files. It is pull-only, and
the doctor checks it for local modifications precisely because an agent that was told this can
still do it by accident.

**Do not create any of the three.** They already exist and are public. If a clone fails, the
answer is never to `git init` something with the same name — a student left holding an empty
repository that looks right is worse off than one holding nothing, because nobody finds out.

**Stop at the first clone that fails**, and say which. A student with one or two of the three
is in a state the rest of the setup does not expect, and `course-materials` failing is the
worst of them: everything after this is read from it.

**A failing check is not a reason to try again.** You call the doctor only when you believe you
have finished, so a check that fails is your account and the program's account disagreeing —
not an operation that might work on a second attempt. Running the same steps again against a
disagreement throws away the one interesting fact, which is the whole reason a program
adjudicates here rather than you.

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
failed. A doctor check that fails is a disagreement, not a hiccup — see above.

**If an install needs administrator rights the student does not have, stop and say so.** Loaner
laptops are available from the instructor; that is the fix, not a workaround. Do not attempt a
portable build or an install under another account.

**Never print the API key**, or any part of it. The doctor output gets pasted into Canvas by a
student who will not think about that.

## When you cannot finish

Say which step stopped and show the error unedited. Run the doctor anyway if you got far enough
for it to run, and have them submit its output to the Canvas assignment.

Submitting a failure is the correct action. It is how their instructor finds out who is stuck,
and it is the only way they find out.

## Depends on

- [`update`](workflows/update/skills/update/SKILL.md) — skill
- [`setup-workspace`](workflows/bootstrap/skills/setup-workspace/SKILL.md) — skill
- [`doctor.mjs`](workflows/bootstrap/tools/doctor.mjs) — tool
