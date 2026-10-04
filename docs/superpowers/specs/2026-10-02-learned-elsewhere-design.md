# Goals learned elsewhere

**Status:** approved design, 2026-10-02. Branch `learn-student-feedback`.

## Why

Topics are taking too long and demanding too much learning time. Many capability goals (most
`c-` goals) are also taught in class activities and problem sets, and a student who has learned
one there should not have to learn it again with the tutor. A student who will learn it there
soon should be able to set it aside until then.

## What the student sees

**The first time the tutor reaches a goal marked as taught elsewhere** (no attempts on it yet and
no deferral), it states the goal, its criterion and where it is taught, then offers four
choices:

1. **Do it here.** Ordinary study.
2. **Already done elsewhere.** They say where (encouraged, not required). Recorded as completed
   elsewhere.
3. **I'll learn it there later.** The goal is deferred.
4. **Remove it.** The existing goal retirement, with their words as the reason.

**At any time, for any goal, marked or not,** a student may say they'll pick it up elsewhere, and
the goal is deferred.

**A deferred goal is not offered.** Once every other required goal in the topic is met or
retired, the tutor asks once about each deferred goal: done there? Yes records it as completed
elsewhere. Not yet leaves it deferred. "Let's do it here" resumes it.

**A goal completed elsewhere counts as met and comes back for review** in about three days,
judged as strictly as any other, exactly like a goal the learner declared learned.

## Who sets the mark

- The instructor, on assigned topics, while curating.
- Goal-setting, on a student's own topics, when the student says something is covered in class.
- During study, a student does not edit `goals.md`; saying "I'll learn this elsewhere" records a
  deferral, which is the part of the mark that changes anything mid-study.

Curation still prepares activities for marked goals up front. Delay inside the learning loop
costs more than curation time.

## Data

### The mark, in `goals.md`

```
### `c-check-persistence`

- **goal:** ...
- **criterion:** ...
- **taught elsewhere:** PS2; session 5 in-class activity
```

Not a slot. No tool validates or reads it; the tutor does. Same standing as a vocabulary word's
`nearest confusable`. Documented in `workflows/learn/templates/goals.md`.

### Deferral, in `status.jsonl`

Two new goal-scoped kinds, folded in `workflows/learn/tools/lib/status.mjs` into a
`deferredGoals` map (goal id to where), the same way `retired` and `revived` fold into
`retiredGoals`:

```
node workflows/learn/tools/record-status.mjs <topic> deferred <goal-id> --where "PS3"
node workflows/learn/tools/record-status.mjs <topic> resumed  <goal-id>
```

- `deferred` requires `--where` (the check-in needs something to ask about) and a goal id.
- `resumed` requires a goal id.
- `deferred` on a goal already met is accepted, with a warning.
- `resumed` with no prior deferral is accepted silently, as `revived` is.

### Completion, in `evidence/attempts.jsonl`

A new outcome:

```
node workflows/learn/tools/record-attempt.mjs <topic> <goal-id> <label> --outcome elsewhere --note "PS3"
```

`<label>` is `elsewhere` when no activity was attempted. In `workflows/learn/tools/lib/bars.mjs`,
`met()` treats `elsewhere` like `declared`: a fact about the learner's word, applied above the
bar dispatch. The schedule folds over `met()`, so review needs no change.

`declared` and `elsewhere` stay distinct in the log so the progress view can show "done
elsewhere" differently from "said I've got it".

## Derived views

In `workflows/learn/tools/lib/topic.mjs` and `workflows/learn/tools/survey.mjs`:

- **A deferred goal stays in its group's fraction.** Unlike a retired goal, it is still something
  the student means to finish.
- **Listing order within a group:** unmet, then deferred (`deferred: <where>`), then met, then
  retired.
- **Met goals say how:** `done elsewhere (<note>)` for `elsewhere`, `you said so` for `declared`.
- **New phase, `waiting elsewhere`:** every required goal that is neither retired nor deferred is
  met, and at least one required goal is deferred. Checked after `retired` and `not started`, and
  before `nothing pending`. It tells study to run the check-in, and tells learn the topic is
  waiting on class, not stuck.
- A deferred goal is not due for review (it has not been met), and its outstanding queue items
  are not hidden.

## Skill text

- `workflows/learn/skills/study/SKILL.md`: the first-encounter menu, deferral at any time, and
  the check-in in the `waiting elsewhere` phase.
- `workflows/learn/skills/goal-setting/SKILL.md`: may write the mark on a student's own goals.
- `workflows/learn/skills/learn/SKILL.md`: treats `waiting elsewhere` as its own state.
- `workflows/learn/skills/goal-setting/references/slots.md`: the new outcome next to `declared`.
- `workflows/learn/templates/goals.md`: the mark.
- `workflows/learn/guides/study/howto.md`: a short student-facing section.
- `workflows/learn/learn.bpmn`: the first-encounter menu as a step in the study lane before an
  activity is offered. Both validators pass.

Unchanged: review, the quiz, curation.

## Tests

This starts the repository's test suite for the learn tools: `node:test`, no dependencies, in
`workflows/learn/tools/test/`, run with `node --test 'workflows/learn/tools/test/*.test.mjs'` (the bare directory form fails on Node 22). Each test
builds a topic folder in a temporary directory and runs the real scripts against it.

- `deferred` without `--where` is refused; with an unknown goal id, refused.
- A deferred goal: listed as deferred, still in the fraction, phase unchanged while other goals
  are unmet.
- Every other required goal met: phase is `waiting elsewhere`.
- `--outcome elsewhere`: bar met, next review in 3 days, survey shows `done elsewhere`.
- `resumed`: goal back to unmet and offered; phase back to `studying`.
- `--outcome declared` still behaves as before (regression for the earlier change on this
  branch).
