# Queue: learn workflow changes from student feedback

Branch `learn-student-feedback`. Each item is its own design cycle (design, spec where needed,
plan, implementation). Update this file as items finish or are added.

## In order

1. ~~Offer three choices after every not-met ruling (try again, later, mark it learned).~~ Done,
   `6910b51`.
2. ~~Goals learned elsewhere.~~ Done, `444a61c..a080c5b`. Spec
   `specs/2026-10-02-learned-elsewhere-design.md`.
3. **Unified question banks.** Spec `specs/2026-10-03-unified-banks-design.md`. Five phases:
   - ~~Phase 1: bank format, picker, multi-goal judge.~~ Done, `10d6158..93158f9`. Plan
     `plans/2026-10-03-unified-banks-phase-1.md`.
   - ~~Phase 2: goal model (topic origin, capability, `serves: group`).~~ Done,
     `481a63d..745010b`. Plan `plans/2026-10-03-unified-banks-phase-2.md`. Real course topics
     don't carry the `**origin:** course` header yet; their per-goal stamps still work.
   - ~~Phase 3: vocabulary as `a-words`, `supply` retired, `migrate-words.mjs`.~~ Done,
     `4785f33..0761ad8`.
   - ~~Phase 4: curation with two instructor stops.~~ Done, `64a432a..6e380de`.
   - Rulings made during phases 3 to 5 are in `rulings-unified-banks.md`, for review.
   - ~~Phase 5: quiz.~~ Done, from `34f264c`. Plan
     `plans/2026-10-03-unified-banks-phase-5.md`. Folder ids are qualified on the quiz path;
     pool keys work at topic, activity and scenario level; practice prefers unseen questions;
     multi-goal questions are graded and recorded per goal. What the instructor's private
     tools must change is in `workflows/quiz/tools/CONTRACT.md` (quiz-bake calls `courseOnly`;
     quiz-comments reads `value` for `partial`; quiz-regrade accepts `per_goal`).
4. **Help is always available; help just means the attempt doesn't count.** Covers review and the
   practice quiz too: the tutor answers while a quiz page is open and records those answers as not
   independent.
5. **Sequenced sets of goals.** Goal-setting decides an order: a sequence of sets, random within a
   set (vocabulary before integrative capabilities). Builds on the capability hierarchy.
6. **Progress view.** The sequence of sets drawn as columns, with marks for attempts and passes,
   shown at the start of a session and after each task.
7. **Web side panel for tutor-initiated questions.** Questions open in a page beside the chat, and
   the chat notices Submit. The chat stays responsive; using it during a question is recorded and
   makes the answer not independent. Start with a feasibility test in Codex.
8. **Personalized problem-set questions** (spec B). Banks that belong to one student; a generator
   that reads a problem-set repo, run by the tutor in study and by the grading container for
   quizzes; an agent checks each question against the student's repo.

## Actions on the learning-topics repository (outside this branch)

- Add the `**origin:** course` header line to every course topic's `goals.md` (under the title,
  above `## Goals`), and remove the per-goal `origin: course` stamps it makes redundant. Until
  then the per-goal stamps keep working. Check with `survey.mjs`: each topic's `origin` should
  read `course` and no problems should appear.
- Run `node workflows/learn/tools/migrate-words.mjs <topic-folder>` on each course topic, with
  `--dry-run` first to read its summary. Phase 5 is done, so pools may now name folder banks;
  run it as part of each topic's next curation, and in the same change update any pool that
  draws from that topic to the new keys (sessions 5, 7 and 9 draw from the word banks it moves,
  and their keys stop resolving once the banks move). It moves banked word questions into
  `a-words`, adds the `a-words` entry, and removes the word stamps and `supply` lines. Then,
  during that topic's next curation, place each remaining capability question in `items.md`
  into the activity whose generator would produce it.

## Parked ideas

- Evidence for a `taught elsewhere` goal drawn from that problem set's personalized questions.
- Recording real-quiz results into a student's attempt log.

## Deferred minors from item 2's review

- `declared.test.mjs`: the setup miss isn't asserted.
- Test temp directories are never removed.
- No test that repeated `deferred` lines resolve to the last one.
- `record-status.mjs`: `readIds` is read twice; a dead `goal &&` guard.
- A long or multi-line `--note` renders verbatim in survey's `last`.
- `elsewhere.test.mjs`: its regex truncates on an escaped quote.
- `learn.bpmn`: two record flows share a stub off `S_el_choice`.
- `study/SKILL.md` still says "a `resumed` line proves they already chose"; it now reads the
  survey's `resumed` field.

## Deferred minors from item 3, phase 1

- No test of `MOVE_TAGS`'s shape.
- `bank.mjs`: `label3` is a clumsy name; the credit capitalise-and-join is duplicated between the
  single-file and folder paths; `statSync` throws on a broken symlink in `tasks/`.
- `bank.mjs` `topPart` drops every `# ` line, not only the title. Fix before phase 4 drafting.
- No mcq folder test of `expected`, or of `move` being absent.
- `pick.mjs`: an unparseable `at` gives NaN ordering.
- `next-item.mjs`: untested paths (equal-`at` ties, exit 1 on misuse).

## Deferred minors from item 3, phase 2

- `readGoals` returns extra `written` and `malformed` fields used only by `idProblems`.
- Survey `--report`: no test of a part's two-space indent; a capability slug used in two groups
  gets two partial headings; a long line in `survey.mjs` (the `tick` computation).
- `serves: group`: the matcher is strict on case and spacing (`Group x` falls through to the
  unknown-id problem, so it is still reported).
- The spec says parts stay in the default group; nothing enforces it, and slots.md says
  "usually".
- slots.md: `capability` sits loosely under "data or reference", and that table row is wider
  than its neighbours.
- Untested: a header after `## Goals` is ignored; one- and five-word slugs rejected;
  `serves: group capabilities` (the default group) expands; a backticked group item expands.

## Housekeeping

- `.superpowers/` (subagent scratch) is not in `.gitignore`. Nothing from it has been committed.
