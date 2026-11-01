# Scenario framing: one question at a time

**Status:** design for review, 2026-10-27. Branch `scenario-framing`.

## Why

A folder bank's scenario file has a top part, everything before its first `###`, and
`readFolderBanks` prepends all of it to every question drawn from the file. Authors were told to
put "an instruction every question needs" there, and many top parts also introduce the run:
"Each question is a different change, on a different day, with its own evidence. Answer each in
two or three sentences." That reads well in study, which serves a scenario's questions in order,
and wrong in a draw, which shows one question alone. On the midterm about twenty scenarios showed
framing like that above a single question, and a student declined to answer because of it.

Three forms of the defect exist in the banks:

1. **Run framing above one question.** "Each question below...", "Answer each in...". Every
   `a-diagnose-from-evidence`, `a-critique-permissions-plan`, `a-critique-sign-in-plan`,
   `a-locate-described-failure`, `a-judge-pipeline-plan` and `a-judge-database-plan` scenario,
   and more.
2. **The whole exercise's task in the top part,** with questions that ask one piece of it and say
   "answer only this": `cloud-hosting-2026-10/a-place-described-plan/crumbs`.
3. **A mix of question kinds with an instruction for only some:** "Some show an exchange ...
   Others show a message ... except where a question asks for the reply you would send".
   `deploy-config-2026-10/a-deploy-chat/lendlist` and `crumbs-on-harbor`.

A related defect is folded in: `database-hosting-2026-10/a-judge-described-plan/pantry-board/q1`
asks students to name the step that decides something when its key says no step does. Wording
that does not fit how the question is answered is the same family.

## Decided

- **Study, first question served from a scenario:** the framing, then the scenario, then the
  question.
- **Study, every later question in that scenario:** the scenario and the question, no framing.
  Study goes on re-showing the scenario in full every time.
- **Every draw (quiz, exam, practice quiz):** the scenario and the one question, never the
  framing.
- **Review sittings** are treated as draws: no framing.
- **The judge** never sees framing. Framing carries no fact an answer depends on, so the judge's
  input is the framing-free question.
- **How to answer lives in each question,** never in the scenario part or the framing. A shared
  answering instruction saved some repetition for authors, but a draw shows one question and the
  saving forced every other problem here. With nothing shared to override, "answer only this"
  disappears.

## Design goals

1. A drawn question carries no framing for a run of questions.
2. Study still introduces a run once.
3. Curation states the rule and catches a breach, both mechanically on every survey and by
   judgment in bank-check.
4. Nothing keyed on an item changes: ids, labels, order, pools, logs and baked quizzes all still
   resolve.
5. A file without framing reads exactly as before.

## The format

A `tasks/<activity>/<scenario>.md` top part is the scenario, then optionally a `## Framing`
heading and the framing, then the questions:

```
Lendlist is a neighborhood tool-lending app ...

- **Dockyard** hosts both the frontend and the backend ...
- **Silo** hosts the database ...

## Framing

The questions follow the deploy in order. Some show an exchange in which the agent asked for a
setting; others show a message from the agent.

### q1

...What is `FETCH_ROOT` for? ... Answer in two or three sentences.
```

- **The marker** is a line that is exactly `## Framing`, in the top part of a `tasks/` file.
  Everything above it (after the optional `#` title) is the scenario. Everything from it to the
  first `###` is the framing. The heading line itself appears in neither.
- **The scenario part describes the situation only.** No run framing, no answering instruction.
- **The framing introduces the run only:** how the questions relate, what order they come in. It
  never carries a fact an answer depends on (a draw does not show it) and never says how to
  answer (each question does).
- **Each question states its own task and how to answer it,** in full. Read under the scenario
  alone, with no framing, it is a complete task.
- **`rubrics/` files have no framing.** A rubric top part is the key, as before.
- **`main-bank`** keeps an empty top part, framing included.

No folder-bank top part used a `##` heading before this, so the marker is unambiguous.

## The reader: `workflows/quiz/tools/lib/bank.mjs`

`readFolderBanks` splits the top part of each `tasks/` file at the marker. Each item carries:

- `setup`: the scenario part only.
- `framing`: the framing text, or `''`.
- `prompt`: `setup` and the question body, as now, so it is framing-free.

Single-file banks are unchanged. Everything that consumes `prompt` (the practice quiz, the
grader, the instructor's bake and seed tools, `learnerText`) is unchanged and now framing-free.

**New bank problems,** collected like the existing ones; the item is still served:

- `## Framing` in a question body, a second time in one top part, or in a `rubrics/` file. The
  text stays where it is.
- `## Framing` with nothing under it.
- Any other `##` line in a folder top part (`## framing`, `## Framing:`), which would otherwise
  show in every draw.
- `## Framing` in `main-bank`.
- In the scenario part, a **run phrase**: "each question", "questions below", "the questions
  follow", "answer each", "where a question asks", or both "some" and "others" as words in the
  same paragraph.
- In the scenario part, an **answering instruction**: "answer in", or "in" followed within the
  same sentence by a count word (a, one, two, three, four, five) and "sentence" or "sentences"
  ("in two or three sentences", "in a sentence").
- In a question body, "answer only".

Every one of these problems ends `(framing rule)`. The real-pool compatibility test in
`workflows/quiz/tools/test/pool.test.mjs` compares problems against a fixed baseline, and it
ignores problems with that ending, so unmigrated banks do not fail it; the draws themselves are
still compared exactly.

The phrases are matched case-insensitively. The framing itself is not scanned for run phrases,
which belong there; it is scanned for answering instructions, which do not.

The header comment ("TWO LAYOUTS") gains a paragraph describing the marker and the three fields.

### Tests: `workflows/quiz/tools/test/bank.test.mjs`

- A file with the marker: `setup` and `framing` split; neither `setup` nor `prompt` contains the
  framing or the heading.
- A file without it: unchanged, `framing` is `''`.
- Each misplaced, repeated or empty marker, and one in `main-bank` or `rubrics/`, is a problem.
- Each run phrase and each answering instruction in the scenario part is a problem; the same run
  phrase under `## Framing` is not; an answering instruction in a question body is not; "answer
  only" in a question body is.
- The existing setup tests (title dropped, a later `# ` line kept) still pass.

## Study

### `workflows/learn/tools/next-item.mjs`

Under `--- learner sees ---`, print the item's framing, a blank line, then `learnerText(item)`,
when all of these hold:

- the item has framing;
- the call is not `--review`;
- `--after` is absent, or names a label whose `<activity>/<scenario>` differs from the item's.

Otherwise print `learnerText(item)` alone. The script decides, not the tutor: it already holds
the label, the scenario and `--after`, so the rule lives in one testable place. "Served first:
keeps ... in order" needs no special case, since the item it serves is in the scenario `--after`
names.

`lib/item.mjs` is not changed. Framing is added by `next-item.mjs`, not `learnerText`, so
`judge-input.mjs`, which also uses `learnerText`, cannot pick it up.

### `workflows/learn/skills/study/references/running-an-activity.md`

- "Show all of it, every time" stays, with one sentence added: the framing appears only where
  `next-item` prints it, and the tutor never carries it forward or works it into a later
  question.
- A scenario written live follows the same shape: framing, if the run needs any, only before its
  first question; the scenario with every question; how to answer in each question.

### Tests

A fixture topic with one framed scenario of three questions and one unframed scenario:

- no `--after`: framing printed first;
- `--after` in the same scenario: no framing;
- `--after` in the other scenario: framing printed;
- `--review`: no framing;
- the unframed scenario: output as before.

## Draws and past exams

No code change. Draws show `prompt`, now framing-free. Baked draw files copy whole items, so new
ones carry a `framing` field too, but the exam app is seeded with `id`, `type` and `prompt` only.

Exams already given are unaffected. Their review and comment tools take question text from the
saved draw file, and regrades take keys from `rubrics/`, which the migration does not touch.

## Curation

### `workflows/learn/skills/curation/draft-bank/SKILL.md`

- **The format:** the `tasks/` top part is the scenario, then optionally `## Framing`; `rubrics/`
  top parts are keys only. The `crumbs` example gains a one-line framing ("Each question is a
  separate decision Crumbs faces.") so the marker is shown in use.
- **New rule, what framing is for,** as in _The format_ above, with the author's test: read each
  question under the scenario alone; if it is incomplete, the question is at fault.
- **"An instruction every question needs"** goes in each question, for every scenario, not only
  `main-bank`. The sentence on never saying what the learner may have open stays.
- **`main-bank`:** its empty top part includes framing.

### `workflows/learn/skills/curation/bank-check/SKILL.md`

- **What it reads:** "the scenario's setup" is the scenario part, above `## Framing`. Checks 1, 2
  and 5 judge against that alone, because a draw shows that alone. The framing is read for check
  7 only.
- **Check 7, it stands alone when drawn.** Scenario and question, without framing, read as a
  complete task. Findings: a run phrase or answering instruction in the scenario part; a question
  that only makes sense through the framing or a sibling question; framing that carries a fact
  or an answering instruction. Marked `scenario` when the scenario part or framing is at fault,
  `question` when one question is.
- **Check 8, its wording fits the key.** The question does not presuppose an answer shape its key
  rejects (asking which step decides something when the key says no step does).
- "Six checks" becomes eight, and the frontmatter description names both.

The lint in `bank.mjs` is the mechanical half and catches the phrase-level cases on every survey.
Bank-check is the judged half, for what a phrase list cannot see.

## Migration of `learning-topics`

**Where:** a worktree at `~/Documents/Documents/code/.worktrees/learning-topics-scenario-framing`,
branch `topic/scenario-framing`, its own window. Released by the instructor repository's route:
`publish-topic.mjs` once per touched topic, then merge and push from the `learning-topics`
checkout. Before starting, check the other open `learning-topics` worktrees for overlapping
files.

**Order:** this branch's change reaches `main` in course-materials, and is pushed, before the
migration is released. An unmigrated file behaves as today plus a survey warning; a migrated file
read by the old reader would show `## Framing` in every prompt.

**Method.** Read every folder-bank `tasks/` file, not only those the phrase search finds. Sort its
top part paragraph by paragraph, and sentence by sentence where one sentence mixes jobs:

- **Scenario:** stays.
- **Framing:** moves under `## Framing` at the end of the top part, wherever it sat: some files
  open with it, some close with it, some may have it between scenario paragraphs.
- **How to answer:** moves into each question, adjusted per question kind where kinds differ (a
  reply question: "write the reply, then a sentence or two on why"; the others: "two or three
  sentences"), and not added where a question already says it.

**Particular cases:**

- `cloud-hosting-2026-10/a-place-described-plan/crumbs`: the top part's task ("say which part
  each vendor hosts ... every gap ... every mismatch") moves into the questions that ask it; q14
  and q15 lose "answer only this" and each states its own question in full.
- Scenario sentences that point at the questions ("a plan below says so where it does", "the
  plans below leave it out") are rewritten to stand alone.
- `database-hosting-2026-10/a-judge-described-plan/pantry-board/q1`: the question is rewritten to
  admit the key's answer (name the step, or say that none does and what is missing). The key is
  unchanged, so a regrade of a past exam applies the key that was applied.
- `a-words` files: about 65 open with "Answer in two or three sentences[, in your own words]."
  A script moves that line, verbatim, to the end of each free question in the file, skipping a
  question that already says how to answer. An mcq question gets nothing: the line was already
  wrong above a drawn mcq.
- Rubric files are not changed.
- An activity's generator in `activities.md` that tells live drafting to put run framing or a
  shared answering instruction in the setup is reworded to the new rule.

**Verification:**

1. The set of item labels, and their order within each scenario, is identical before and after.
2. `readBank` across every topic reports no framing, run-phrase or answering-instruction
   problems.
3. A scratch script writes every folder question as a draw shows it, before and after, one file
   per topic. Paul reads that diff to approve the migration.
4. Survey and `publish-topic.mjs` pass for each touched topic.

## Out of scope

- Single-file banks and loose study task files, which have their own `##` structure and are not
  drawn as folder questions.
- Re-baking or re-seeding exams already given.
- Changes to the instructor's private tools; none are needed.

## Constraints

- Both repositories are public. No student is named in any file, commit or message written to
  either.
- No em or en dashes in anything written.
