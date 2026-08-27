---
name: setup-workspace
description: Run the first-day setup skills in order, checking after each that the machine actually reached the phase it should have. The first thing a student's agent is pointed at, by URL, before anything has been cloned. Re-run it to pick up a setup that stopped part-way.
---

# Set up the workspace

You are an orchestrator. You install nothing and clone nothing yourself — each skill below does
its own work and ends by checking its own result.

By the time you are read, Codex (ChatGPT) is answering against the student's key, and a folder
exists and is attached to the project. Everything before that was them clicking, coached by U-M
GPT in a browser tab. From here they only approve; the app does the work.

## Where to read the other skills from

**This is the only unusual thing about this skill, and it matters.** Nothing has been cloned
yet — you are being read over the network, because there is no repository on the student's disk
to read anything from.

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

## Operates on

`<parent>` — the folder the clones will sit in, which is **the folder you are already running
in**.

**Do not ask the student where to put things.** They created this folder during setup and
attached it to the project, which is why you can see it at all. Anywhere else is somewhere you
will not be able to read afterwards.

Pass it on. Each skill below works in the same folder, and none of them should be deciding a
location either.

## Who you are talking to

Someone whose machine started working about five minutes ago. They do not know what git is,
what a package manager is, or what a PATH is, and they have no reason to. Do not ask them to
run commands — run them yourself and say what you are doing.

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

**Do this before anything else, every time.** A student running you a second time is the normal
case, not the exception: something failed, it got fixed, and they came back.

Run `node course-materials/workflows/bootstrap/tools/check-setup.mjs`.

- **No `course-materials` folder** — nothing is cloned. Start at step 1.
- **It runs and reports a phase** — start at the first step past that phase. Do not repeat the
  earlier ones.

That is what the setup check's "reached N of 7" line is for, and why it reports a number rather
than pass or fail.

**A re-run is usually a repair.** If they are back because a check failed, the fix has probably
been published since — which is why step 1 updates the repositories when they already exist
rather than skipping past them. Getting the fix is the point of running you again.

## What you do, in order

Read each skill and follow it, then come back here. Each one ends by running `check-setup.mjs`
and reporting the phase it reached, so you do not need to run the setup check between them —
you need to read what they tell you.

1. **`workflows/bootstrap/skills/setup-repos/SKILL.md`** — installs git and Node, clones all
   three repositories, sets the student's git identity. **Fetch this one by URL**: it is what
   creates the disk you would otherwise read it from. Should reach **3 of 7, Repositories**.
2. **`workflows/bootstrap/skills/setup-addressing/SKILL.md`** — writes `~/.codex/AGENTS.md`,
   then runs the smoke test. From here on, read from the clone. Should reach **5 of 7, Smoke
   test**.

3. **`workflows/bootstrap/skills/setup-editors/SKILL.md`** — Zettlr and Camunda Modeler. Should
   reach **6 of 7, Editors**.

**Stop at the first one whose checkpoint does not pass.** All three block, editors included: a
student who cannot open their own files can watch an agent describe their work but never read
or write it, which is not ready to start the course.

**A failing check is not a reason to try again.** You call the setup check only when you
believe you have finished, so a check that fails is your account and the program's account
disagreeing — not an operation that might work on a second attempt. Running the same steps
again against a disagreement throws away the one interesting fact, which is the whole reason a
program adjudicates here rather than you.

Stop, show the output, and say which check disagreed. The repair path is that the instructor
publishes a fix and the student runs the setup again; `setup-repos` pulls it and the
orchestrator resumes at the phase that failed.

Then **say where they stand.** One short paragraph: which phase they reached, and if it is not
the last, which step stopped and why.

**Then print the setup check's output verbatim, as the last thing you say.** Not a summary of
it, not a list of what passed, not your own account of what happened — the text the program
produced, from `SI 212 — first-day setup check` down to the `Copy everything above` line, in
one block they can select in a single gesture. Your paragraph goes before it. Nothing goes
after it.

**This is the entire submission, and summarising it destroys it.** The report's last line tells
the student to copy everything above into Canvas; if what sits above it is your bullet list,
the instruction points at nothing. The Canvas assignment is the only way an instructor finds
out which of 48 students is stuck, and a student who submits a summary looks identical to one
who submitted nothing. Accurate is not the bar. Reproduced is.

## What you do not do

**Do not do any skill's work yourself**, even if it looks quicker. If `setup-repos` fails on
the second clone, you do not clone it — you stop and report. The skills own their steps so that
a re-run does the same thing twice, and an orchestrator that improvises produces a machine
nobody can reproduce.

**Do not run `setup-github`.** It is phase 7 and belongs to week 2. Do not offer it and do not
mention it as something they could get ahead on: it needs a GitHub account, and today finishing
without one is the whole design.

**Do not re-run a phase that already passed** — except step 1, which updates rather than
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
the Canvas assignment.

Make clear that submitting a failure is the correct action and not a mark against them. It is
how their instructor finds out who needs help, and it is the only way they find out.

## Depends on

- [`setup-repos`](workflows/bootstrap/skills/setup-repos/SKILL.md) — skill
- [`setup-addressing`](workflows/bootstrap/skills/setup-addressing/SKILL.md) — skill
- [`setup-editors`](workflows/bootstrap/skills/setup-editors/SKILL.md) — skill
- [`setup-github`](workflows/bootstrap/skills/setup-github/SKILL.md) — skill
- [`check-setup.mjs`](workflows/bootstrap/tools/check-setup.mjs) — tool
