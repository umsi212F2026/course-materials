# SI 212

Always-on context for any agent working in this repository. Kept short deliberately: every line
here costs context in every session.

## This repository is public

Everything on `main` is world-readable, permanently. Forks and caches mean a thing published by
mistake cannot be unpublished — so material that is not ready, or not for students, is kept on
a branch that is never pushed.

**A private branch is never merged.** Not into `main`, not into an integration branch, not with
`/land`. Merging carries the branch's whole history across, including everything written while
thinking, and that is the one move nobody can undo.

To move work from a private branch into the public one, copy the finished files over on a fresh
commit — `git checkout <branch> -- <path>` — or cherry-pick the specific commits meant to be
seen. Never `git merge`, and never `git push --all` or `--mirror`, which push every branch
regardless.

If you are asked to merge and the branch looks like private work, say so and ask rather than
doing it.

## Working with someone else's files

**Ask before you edit a file they may have open, and before you run a merge.** "Have you saved
everything?" A `git pull` rewrites files on disk underneath their editor, and no editing
discipline on your side changes that.

**Make surgical edits, never whole-file rewrites.** Replacing a file destroys the editor's undo
history even when nothing was unsaved.

## Workflows

Read the named file and follow it. Paths are relative to this repository's root.

Each skill lists what it depends on at the bottom of its own file, so anything reached from one
of these is found from there. Only the entry points are listed here.

- **learn** — The way in. Surveys every learning topic, does the agent-only maintenance that
  doesn't need the learner, surfaces what's due or stuck, helps them choose what to work on,
  and hands off — to a topic, to a review sitting, or to adding something new. Use whenever
  someone sits down to learn and hasn't said exactly what they want to do.
  `workflows/learn/skills/learn/SKILL.md`
- **study** — Tutor a learner through the activities their goals supply — run them, keep the
  side conversation going, get attempts adjudicated, and keep the record. Use once
  activities.md exists, for every study session thereafter until the goals are met.
  `workflows/learn/skills/study/SKILL.md`
- **review** — Run everything that has come due for review, across all topics — the learner
  re-attempts each goal's check cold, it gets adjudicated, and a program sets the next
  interval. Use when anything is due; it works out what that is itself rather than being told.
  Not the same as study, which works the other side of the line — goals not yet met.
  `workflows/learn/skills/review/SKILL.md`
- **quiz** - Sit a practice quiz, drawn from the same pool and marked by the same grader as a
  real one, then go over what was missed. Use when a learner asks to practise for a quiz, or
  wants to know whether they would pass one. It records an attempt against each goal the quiz
  examined, so a practice run moves review dates. Not the same as review, which serves what is
  due; this serves what one session's quiz would.
  `workflows/quiz/skills/quiz/SKILL.md`

- **update** — Bring one of the course repositories up to date with the instructor's copy,
  committing the student's own work first and helping them through any conflict. Use whenever
  someone asks whether there is anything new, when an assignment or a topic has been corrected,
  or when a setup check fails and the fix has been published.
  `workflows/update/skills/update/SKILL.md`
- **superpowers** - Design and build software in the assignments repository with Superpowers,
  which brainstorms an idea into a spec, turns the spec into a plan, and carries the plan out.
  Use when someone wants to build, design or change an app or other code in their assignments
  repository, or asks for Superpowers by name. Not for studying or anything else in
  learning-topics, which stays with learn, study, review and quiz even when it involves making
  something.
  `workflows/develop/skills/superpowers/SKILL.md`

**Before starting a workflow, establish which data directory it operates on. Read
`~/.codex/AGENTS.md`, which names it; do not infer it from the working directory, and do not
open by asking.** Installation 1 wrote that file so this question has one answer on every
machine, and a student did not choose those paths and cannot confirm them. Ask only where the
file is missing or names a folder that is not there, and say that is what happened: a broken
install is worth telling them about, and it is a different thing from a routine question.

The directory is decided once, at the entry point, and carried from there — a skill invoked by
another skill is told which directory to use and never chooses its own.

None of this is about *what* to work on. Which topic, which quiz, which repository to update
are real questions with the learner's own answers, and they are asked.
