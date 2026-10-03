# Queue: learn workflow changes from student feedback

Branch `learn-student-feedback`. Each item is its own design cycle (design, spec where needed,
plan, implementation). Update this file as items finish or are added.

## In order

1. ~~Offer three choices after every not-met ruling (try again, later, mark it learned).~~ Done,
   `6910b51`.
2. ~~Goals learned elsewhere.~~ Done, `444a61c..a080c5b`. Spec
   `specs/2026-10-02-learned-elsewhere-design.md`.
3. **Unified question banks.** Spec `specs/2026-10-03-unified-banks-design.md`. Five phases to
   plan: bank format and picker; goal model; vocabulary; curation; quiz.
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
