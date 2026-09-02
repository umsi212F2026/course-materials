---
name: setup-workspace
description: Run the three installation sessions in order from wherever the student has got to, checking after each skill that the machine actually reached the phase it should have, and collecting each session's report into its own Canvas assignment before the next one starts. The first thing a student's agent is pointed at, by URL, before anything has been cloned.
---

# Set up the workspace

You are an orchestrator. You install nothing and clone nothing yourself — each skill below does
its own work and ends by checking its own result.

By the time you are read, Codex (ChatGPT) is answering against the student's key, and a folder
exists and is attached to the project. Everything before that was them clicking, coached by U-M
GPT in a browser tab. From here they only approve; the app does the work.

## Setup is three sessions, normally on three class days

Each session ends with the student pasting the setup check's report into a Canvas assignment of
its own, and there are three of them: **Installation 1**, **Installation 2** and **Installation
3**.

| session            | you run                            | ends at                    |
| ------------------ | ---------------------------------- | -------------------------- |
| **Installation 1** | `setup-repos`, `setup-addressing`  | **5 of 7, Smoke test**     |
| **Installation 2** | `setup-editors`                    | **6 of 7, Editors**        |
| **Installation 3** | `setup-github`                     | **7 of 7, Remote**         |

They run in that order, and you may run more than one in a sitting. A class day is the usual
boundary, not a rule you are enforcing: a student with time left and an appetite for it can
carry straight on, and one who is done for the day stops.

**But never begin a session before the last one's report has been submitted.** This is the one
hard rule about the boundary, and it is not about pacing.

**The setup check reports the machine as it is now, not as it was.** The moment `setup-editors`
installs anything, the report that was true at the end of Installation 1 stops being true —
there is no way back to it, and the student has nothing left to paste into Installation 1. So
each report is collected while it is still the truth, and only then does the next session start.

Say that, in one sentence, when you ask. "Paste this into Installation 1 first — once we start
on the editors this report changes." A student who understands why will do it; one told merely
to submit first will offer to do it afterwards, which is the one thing that does not work.

## Where to read the other skills from

**This is the only unusual thing about this skill, and it matters.** On the first day nothing
has been cloned yet — you are being read over the network, because there is no repository on
the student's disk to read anything from.

So the skills below are fetched two different ways, and the boundary is `setup-repos`:

**Before `setup-repos` finishes**, fetch a skill by URL. Every path in this file is relative to
the repository, so prefix it with:

```
https://raw.githubusercontent.com/umsi212F2026/course-materials/main/
```

**After `setup-repos` finishes**, read it from the clone instead — the same relative path, from
inside `<parent>/course-materials/`. That is what `setup-repos` is for, as much as anything
else: it turns a network address into a local one, for everything that follows.

The same rule applies to whatever a skill refers to in turn. If a skill you are following names
another file and the clone does not exist yet, prefix it. If it does, read it from disk.

**In Installations 2 and 3 the clone always exists**, so everything is read from disk, this file
included.

## Operates on

`<parent>` — the folder the clones will sit in, which is **the folder you are already running
in**.

**Do not ask the student where to put things.** They created this folder during setup and
attached it to the project, which is why you can see it at all. Anywhere else is somewhere you
will not be able to read afterwards.

Pass it on. Each skill below works in the same folder, and none of them should be deciding a
location either.

## Who you are talking to

On the first day, someone whose machine started working about five minutes ago. They do not
know what git is, what a package manager is, or what a PATH is, and they have no reason to. Do
not ask them to run commands — run them yourself and say what you are doing.

Say what you are about to do before each step, in one sentence, in plain words. "Downloading
the course files" rather than "cloning the upstream remote".

**Answer what they ask you.** Everything else here tells you to be brief and not to volunteer,
which is right and which does not apply to a question. A question is not an interruption of the
setup; it is the first thing in this course the student has done on their own initiative.
Answer in a sentence or two, then carry on from where you were.

**"Why are you asking?" matters most.** A setup that will not say why it wants something
teaches the wrong lesson in the first ten minutes of a course about working with agents. If the
honest answer is that a skill told you to and you do not know why, say that — it is short, it
is true, and it beats changing the subject.

## Start by finding out where they are

**Do this before anything else, every time.** You are not told which class day it is and you
must not ask: a student in the room on day 2 who never finished day 1 needs day 1, and a
student catching up needs whatever they are missing. The machine knows, and nothing else does.

Run `node course-materials/workflows/bootstrap/tools/check-setup.mjs`.

| what it says                    | start at                                             |
| ------------------------------- | ---------------------------------------------------- |
| no `course-materials` folder    | **Installation 1**, from step 1                      |
| reached **2**, **3** or **4**   | **Installation 1**, resuming past the phase reported |
| reached **5**                   | **Installation 2**                                   |
| reached **6**                   | **Installation 3**                                   |
| reached **7**                   | nothing — see below                                  |

That is what the setup check's "reached N of 7" line is for, and why it reports a number rather
than pass or fail. Its `Installation 1 / 2 / 3` lines say the same thing in the student's terms.

**Start there and go forward**, session by session, as far as the student wants to get today.

**A student part-way through an earlier session resumes it, whatever day it is.** Say so
plainly and without making it sound like a fault — they submit to that session's assignment,
late, and that is the correct thing to do. Skipping the unfinished session to reach today's
work produces a machine nobody designed, which the setup check then reports as exactly that.

**If it reached 7 of 7, there is nothing to run.** Say so, print the report, and stop. Do not
go looking for something to improve.

### First, update — whenever the clone already exists

The skills you are about to follow live in `course-materials`, and if a fix has been published
since the student last ran anything, getting it is the point of running you again at all.

So when the setup check found a clone, follow
[`update`](workflows/update/skills/update/SKILL.md) on `course-materials` alone before reading
the session's skill. Not the other two: nothing in these sessions reads them, and updating what
nobody asked about is the `update` skill's own rule.

**If it changed, re-read this file before going on.** An update can replace the instructions you
are part-way through, including these, which is confusing in a way nothing will warn you about.

Once per run, not once per session. Two sessions in the same sitting are one update.

On the first day there is nothing to update — `setup-repos` clones all three itself, as its
step 3.

## Installation 1 — the repositories, and proof they can be found

Read each skill and follow it, then come back here. Each one ends by running `check-setup.mjs`
and reporting the phase it reached, so you do not need to run the setup check between them —
you need to read what they tell you.

1. **`workflows/bootstrap/skills/setup-repos/SKILL.md`** — installs git and Node, clones all
   three repositories, sets the student's git identity. **Fetch this one by URL**: it is what
   creates the disk you would otherwise read it from. Should reach **3 of 7, Repositories**.
2. **`workflows/bootstrap/skills/setup-addressing/SKILL.md`** — writes `~/.codex/AGENTS.md`,
   then runs the smoke test. From here on, read from the clone. Should reach **5 of 7, Smoke
   test**.

Then close the session out — **Installation 1** — before anything else happens.

## Installation 2 — editors they can open their own files in

3. **`workflows/bootstrap/skills/setup-editors/SKILL.md`** — Zettlr and Camunda Modeler, and the
   student opening a real file in each. Should reach **6 of 7, Editors**.

This blocks like everything else: a student who cannot open their own files can watch an agent
describe their work but never read or write it, which is not ready to start the course.

Then close the session out — **Installation 2** — before anything else happens.

## Installation 3 — somewhere to hand work in

4. **`workflows/bootstrap/skills/setup-github/SKILL.md`** — a GitHub account, their own private
   copies of the two student repositories, and the teaching team added to the one they hand work
   in through. Should reach **7 of 7, Remote**.

**This one is slower than it looks and the slow part is not yours.** It needs a GitHub account
with two-factor authentication set up on a phone, which is a step nobody can do for them. Say
that at the start rather than letting it arrive as a surprise twenty minutes in.

Then close the session out — **Installation 3** — and that is the whole of setup.

## Closing a session out

Every session ends the same way, and the next one does not start until it has.

**Stop at the first step whose checkpoint does not pass.** Not just this session — everything.
A failed checkpoint is not something the next session runs on top of.

**A failing check is not a reason to try again.** You call the setup check only when you
believe you have finished, so a check that fails is your account and the program's account
disagreeing — not an operation that might work on a second attempt. Running the same steps
again against a disagreement throws away the one interesting fact, which is the whole reason a
program adjudicates here rather than you.

Stop, show the output, and say which check disagreed. The repair path is that the instructor
publishes a fix and the student runs the setup again; the update at the top of the session pulls
it and you resume at the phase that failed.

Then, pass or fail, finish the same way:

**Say where they stand.** One short paragraph: which phase they reached, and if the session did
not finish, which step stopped and why.

**Name the Canvas assignment, by name.** "Installation 2." It is the one thing here the setup
check cannot tell them — it reports where all three sessions stand, deliberately, because a
finished Installation 1 and a failed Installation 2 leave the machine in the same state and
only you know which just happened. So the report says what is true of all three and you say
which one they are handing in.

**Then print the setup check's output verbatim, as the last thing you say.** Not a summary of
it, not a list of what passed, not your own account of what happened — the text the program
produced, from the `SI 212 — setup check` line down to the last line it printed, in one block
they can select in a single gesture. Your paragraph goes before it. Nothing goes after it.

**This is the entire submission, and summarising it destroys it.** The report's last lines tell
the student to copy everything above into Canvas; if what sits above it is your bullet list,
the instruction points at nothing. The Canvas assignment is the only way an instructor finds
out which of 48 students is stuck, and a student who submits a summary looks identical to one
who submitted nothing. Accurate is not the bar. Reproduced is.

**Then wait until they have submitted it.** Ask, and get an answer — not "let me know when
you have", which is how you end up starting the next session over the top of a report nobody
kept. This is the only place in the whole setup where you wait on the student for something
that is not on their machine.

### Then ask whether to go on

Once it is submitted, the next session is available and the decision is theirs.

**Ask plainly and take no for an answer.** "That's Installation 1 done and submitted. We can
carry on to the editors now, or leave it for the next class." Then do what they say. A student
who stops here has lost nothing and is exactly where the course expects them to be.

**Say what the next one costs before they choose**, in a sentence. The editors are two
downloads and a couple of clicks. Installation 3 is not: it needs a GitHub account with two-factor
authentication on a phone, and starting it at the end of a long afternoon is how a student ends
up half-way through an account signup with the class over.

**Do not push.** Getting ahead is worth nothing here — there is no prize for finishing setup
early, and the sessions are spread across class days because that is when help is in the room.

## What you do not do

**Do not start a session before the last one's report is submitted.** Not a piece of it, not
"while we're here", not the download to save time later. The report describes the machine as it
is, so the first thing the next session touches is the thing that makes the last report
unsubmittable.

**Do not do any skill's work yourself**, even if it looks quicker. If `setup-repos` fails on
the second clone, you do not clone it — you stop and report. The skills own their steps so that
a re-run does the same thing twice, and an orchestrator that improvises produces a machine
nobody can reproduce.

**Do not re-run a phase that already passed** — except `setup-repos`, which updates rather than
repeating itself when the repositories are already there. Re-running an earlier phase is not
harmful, but it is confusing and it makes the setup check output stop meaning what it says.

**Never print the API key**, or any part of it. The setup check output gets pasted into Canvas
by a student who will not think about that.

**Do not replace the setup check's report with a summary of it.** Said above and repeated here
because it is the easiest thing in this whole skill to get wrong: everything else you say is
yours to phrase, and this one block is not yours at all. Copy it out.

## When you cannot finish

Say so plainly, name the skill and the step it stopped at, and have them submit the setup check
output — or, if nothing got as far as running it, your own account of where you stopped — to
this session's Canvas assignment, named.

Make clear that submitting a failure is the correct action and not a mark against them. It is
how their instructor finds out who needs help, and it is the only way they find out.

## Depends on

- [`setup-repos`](workflows/bootstrap/skills/setup-repos/SKILL.md) — skill
- [`setup-addressing`](workflows/bootstrap/skills/setup-addressing/SKILL.md) — skill
- [`setup-editors`](workflows/bootstrap/skills/setup-editors/SKILL.md) — skill
- [`setup-github`](workflows/bootstrap/skills/setup-github/SKILL.md) — skill
- [`update`](workflows/update/skills/update/SKILL.md) — skill
- [`check-setup.mjs`](workflows/bootstrap/tools/check-setup.mjs) — tool
