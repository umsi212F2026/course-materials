# SI 212

Always-on context for any agent working in this repository. Kept short deliberately: every line
here costs context in every session.

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

- **update** — Bring one of the course repositories up to date with the instructor's copy,
  committing the student's own work first and helping them through any conflict. Use whenever
  someone asks whether there is anything new, when an assignment or a topic has been corrected,
  or when a setup check fails and the fix has been published.
  `workflows/update/skills/update/SKILL.md`

**Before starting a workflow, establish which data directory it operates on. Ask; do not
infer.** The directory is decided once, at the entry point, and carried from there — a skill
invoked by another skill is told which directory to use and never chooses its own.
