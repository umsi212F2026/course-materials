# Criteria with named cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A goal may name cases that must each be demonstrated; every activity outside the
orientation is checkable; curation's skills enforce both.

**Architecture:** Cases are a goal slot parsed in `lib/slots.mjs`, named per goal on a rubric
question's `cases:` line (parsed in `quiz/tools/lib/bank.mjs`), stored on an attempt by
`record-attempt.mjs`, and read by `met()` in `lib/bars.mjs`, which applies the goal's own bar per
case. Picker, survey and progress read the same fields. The rest is skill and template text.

**Tech Stack:** Node ESM, `node:test`, Markdown skills.

**Spec:** `docs/superpowers/specs/2026-10-04-criterion-cases-design.md`

## Global Constraints

- Never write an em dash or an en dash (U+2014, U+2013) in any file, commit or message.
- Surgical edits; never rewrite an existing file whole.
- A goal with no `cases`, a rubric with no `cases:` line, and an attempt with no `cases` behave
  exactly as today. Every existing test keeps passing except where this plan changes the
  expected text (the progress legend and `(tried)`).
- A case id matches `^[a-z0-9]+(-[a-z0-9]+){0,2}$` and is unique within its goal.
- Tests: `node --test 'workflows/*/tools/test/*.test.mjs'` (with
  `SOURCES_ROOT=/Users/presnick/Documents/Documents/code/2026` for the real-pool comparison);
  skills: `node workflows/develop/tools/check-skills.mjs`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push.

## Review Focus

1. A goal with cases whose only passes carry no `cases` (recorded before cases were written):
   unmet, and the progress view says `0 of N cases demonstrated`, not met.
2. A question naming two goals, only one of which has cases, with the single-goal `cases:` form:
   refused as ambiguous by bank.mjs, not silently applied to the wrong goal.
3. Live-generated questions: `record-attempt --cases` with no bank question behind it works the
   same as banked ones.
4. A goal whose `cases` slot is present but empty or malformed: reported, and the goal treated
   as having no cases (so the topic still works).
5. The scenario-order rule never leaves a goal with nothing to serve: if every eligible question
   is blocked behind an earlier unserved one, the earliest unserved one is served.

---

### Task 1: The `cases` slot

**Files:**
- Modify: `workflows/learn/tools/lib/slots.mjs` (SLOTS, applySlots)
- Test: `workflows/learn/tools/test/cases.test.mjs` (create)

**Interfaces:**
- Produces: `parseCases(value: string) -> { cases: {id: string, text: string}[], problems: string[] }`
  exported from slots.mjs; `applySlots` returns `cases` (array, `[]` when absent) on the goal and
  pushes parse problems into the goal's `problems`. `cases` is not payload.

The goals.md form (spec "Cases on a goal") reaches applySlots as one joined string, because
`bulletFields` folds the indented sub-bullets: "- `declines-risky`: a request ... - `allows-safe`: ...".

- [ ] **Step 1: Write the failing tests** in `cases.test.mjs`, using `makeTopic` from `./helpers.mjs`:
  `parseCases` on the three-case example returns three `{id, text}` in order with the texts
  trimmed; a goal written with the slot reads `goal.cases` through `readGoals`; a goal without it
  has `cases: []`; a malformed id (`Declines`, four words) and a duplicate id each give a problem
  naming the goal and the id, and the bad case is left out; `cases` does not appear in `payload`.
- [ ] **Step 2: Run** `node --test workflows/learn/tools/test/cases.test.mjs`; expect failures.
- [ ] **Step 3: Implement.** Split the joined value on backticked ids followed by a colon.
- [ ] **Step 4: Run** the file, then the whole suite; expect pass.
- [ ] **Step 5: Commit** "Goals may name cases".

### Task 2: The bar, per case

**Files:**
- Modify: `workflows/learn/tools/lib/bars.mjs` (`met`, new export)
- Test: `workflows/learn/tools/test/cases.test.mjs`

**Interfaces:**
- Consumes: `goal.cases` from Task 1.
- Produces: `met(goal, attempts)` unchanged in signature; `casesDemonstrated(goal, attempts) ->
  { passed: number, total: number } | null` (null for a goal with no cases), where a case is
  passed when the goal's bar holds over `attempts.filter((r) => r.cases?.includes(id))`.

- [ ] **Step 1: Failing tests:** a goal with cases `a, b` is unmet with a pass on `a` only, met
  with passes on both; a pass carrying no `cases` counts toward none; a `declared` or `elsewhere`
  outcome meets it; under `one production pass` a pass on a case without the `production` tag
  does not count for that case; a goal with no cases is unchanged; `casesDemonstrated` returns
  `{passed: 1, total: 2}` and `null`.
- [ ] **Step 2: Run, expect fail. Step 3: Implement** in `met` after the own-word check:
  `goal.cases?.length ? goal.cases.every(...) : bar(attempts)`. Update the header comment.
- [ ] **Step 4: Run, expect pass. Step 5: Commit** "The bar holds per case".

### Task 3: Cases on rubric questions, and the survey problems

**Files:**
- Modify: `workflows/quiz/tools/lib/bank.mjs` (folder and single-file item construction)
- Modify: `workflows/learn/tools/lib/topic.mjs` (`idProblems`)
- Test: `workflows/quiz/tools/test/bank.test.mjs`, `workflows/learn/tools/test/cases.test.mjs`

**Interfaces:**
- Produces: every item from bank.mjs carries `cases: { [goalId]: string[] }` (`{}` when the
  rubric has no `cases:` line). Forms: `x, y` (only when the question names exactly one goal) and
  `c-a: x, y; c-b: z`. bank.mjs problems: the single form on a multi-goal question; a goal in the
  per-goal form that the question does not name.
- idProblems adds (spec "Survey problems"): a case its goal does not define; a question on a goal
  with cases that lists none for it; a folder-bank question naming no goal. No coverage problem.

- [ ] **Step 1: Failing tests** for both forms, each bank.mjs problem, each idProblems problem,
  and a topic with no cases anywhere producing no new problems.
- [ ] **Step 2: Run, expect fail. Step 3: Implement.** Remove the template-era allowance for a
  goal-less folder question wherever bank.mjs or idProblems treats it as fine.
- [ ] **Step 4: Run** the suite with `SOURCES_ROOT` set; the six real topics stay clean.
- [ ] **Step 5: Commit** "Rubric questions name their cases".

### Task 4: Recording cases

**Files:**
- Modify: `workflows/learn/tools/next-item.mjs`, `workflows/learn/tools/record-attempt.mjs`
- Modify: `workflows/quiz/tools/quiz-practice.mjs` (where it records attempts)
- Modify: `workflows/quiz/tools/lib/bank.mjs` (`unwrap`)
- Test: `workflows/learn/tools/test/pick.test.mjs` (next-item CLI), a record-attempt test file
  (find the existing one), `workflows/quiz/tools/test/bank.test.mjs`

**Interfaces:**
- Consumes: `item.cases` (Task 3), `goal.cases` (Task 1).
- Produces: next-item prints `cases: <goal>: x, y` lines after `tags:` when the item has any.
  `record-attempt.mjs ... --cases x,y` writes `cases: ["x","y"]`; it exits non-zero naming the
  goal's cases when one is undeclared, or when the goal has none. quiz-practice records each
  goal's cases from the item.
- `unwrap` keeps a newline before a line starting `>`, so a blockquote keeps its lines.

- [ ] **Step 1: Failing tests:** next-item prints cases; record-attempt stores, refuses an
  unknown case, refuses `--cases` on a goal without cases; a practice-quiz record of a question
  with cases carries them; a two-line blockquote question keeps both `>` lines.
- [ ] **Step 2: Run, expect fail. Step 3: Implement. Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** "Attempts record the cases a question exercised".

### Task 5: Picking

**Files:**
- Modify: `workflows/learn/tools/lib/pick.mjs`, `workflows/learn/tools/next-item.mjs`
- Test: `workflows/learn/tools/test/pick.test.mjs`

**Interfaces:**
- Produces: `pick(items, log, { goal, activity, after, review = false, attempts = [], cases = [] })`.
  `attempts` is the goal's attempt history, `cases` its declared case ids. next-item gains
  `--review` and passes the goal's attempts and cases when `--goal` is given.
- Order, for `--goal` with cases: study prefers an item exercising a case with no pass; review
  prefers the item whose case has the oldest latest pass (a case never passed counts oldest).
  These rank before the existing unserved and oldest-served rules. Without cases, today's order.
- Scenario order, study only: an item is ineligible while an earlier question in its scenario
  (bank order) has no line in the log; if that leaves nothing, serve the earliest unserved item.
- The goal-less sort is deleted.

- [ ] **Step 1: Failing tests** for each rule above, including the fallback in Review Focus 5,
  and an existing-behaviour test for a goal without cases.
- [ ] **Step 2: Run, expect fail. Step 3: Implement. Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** "The picker serves cases still to demonstrate".

### Task 6: Survey rows and the progress view

**Files:**
- Modify: `workflows/learn/tools/lib/topic.mjs` (rows), `workflows/learn/tools/lib/progress.mjs`,
  `workflows/learn/tools/progress.mjs`
- Test: `workflows/learn/tools/test/progress.test.mjs`

**Interfaces:**
- Consumes: `casesDemonstrated` (Task 2).
- Produces: each survey row carries `cases: {passed, total}` when the goal has cases. Progress:
  legend `~ in progress`; next-set annotation `(in progress)` in place of `(tried)`; a partly
  demonstrated goal reads `<id> (<passed>/<total> cases)` there; `--after <goal>` on a goal with
  cases not yet met prints, under the set line, `  <id>: <passed> of <total> cases demonstrated`;
  `--json` goals carry `cases: {passed, total}` when present. A goal with some cases passed is
  `~`, never `#` until all pass.

- [ ] **Step 1: Update the existing tests' expected `tried` text, then add failing tests** for
  each item above and Review Focus 1.
- [ ] **Step 2: Run, expect fail. Step 3: Implement. Step 4: Run, expect pass** (output stays ASCII).
- [ ] **Step 5: Commit** "Progress shows cases demonstrated".

### Task 7: Goal-side and study-side skill text

**Files:** `workflows/learn/templates/goals.md`, `workflows/learn/skills/goal-setting/SKILL.md`,
`workflows/learn/skills/goal-setting/references/slots.md`, `workflows/learn/skills/study/SKILL.md`,
`workflows/learn/skills/study/references/running-an-activity.md`,
`workflows/learn/skills/study/judge/SKILL.md`, `workflows/learn/skills/review/SKILL.md`,
`workflows/learn/guides/study/howto.md`

- [ ] **Step 1:** Write the `cases` slot into the goals template's guidance and slots.md (form,
  id rule, that the goal's bar holds per case, cases versus a `capability:` split).
- [ ] **Step 2:** Goal-setting's move: name the cases of a conjunctive, "including" or two-sided
  criterion instead of splitting the goal.
- [ ] **Step 3:** Study and review: pass `--cases` from next-item's output to record-attempt;
  review calls next-item with `--review`; the "activity carrying no `checks`" bullet (study
  around line 299) goes, keeping `criterion: unchecked` for an attempt that settled nothing;
  the progress wording `in progress`; never tell the learner which cases remain. Judge: one
  ruling per goal covers the question's cases (state it; no new verdict field).
- [ ] **Step 4:** `node workflows/develop/tools/check-skills.mjs`; grep the edited files for
  U+2014 and U+2013. **Step 5: Commit** "Skills: cases on goals, in study and review".

### Task 8: Curation skill text and the activities template

**Files:** `workflows/learn/templates/activities.md`, `workflows/learn/skills/curation/SKILL.md`,
`curation/generate/SKILL.md`, `curation/verify/SKILL.md`, `curation/critique/SKILL.md`,
`curation/draft-bank/SKILL.md`, `curation/bank-check/SKILL.md`,
`curation/references/activity-types.md`, `workflows/learn/learn.bpmn` if a drawn element names a
study-only activity.

- [ ] **Step 1:** Every activity checkable (spec "Every activity checkable"): drop generate's
  "at least one activity that isn't a check"; Coverage loses `study`; any question activity may
  be banked; reconcile the key-file contradiction; readings and worked examples become the
  `worked example` field (which may cite a reading); activity-types follows; `checks` must cover
  a banked activity's rubric goals.
- [ ] **Step 2:** Every banked question names a goal: remove warm-ups from the template and
  draft-bank. Giveaways: a question may give away an earlier one in its scenario, never a later
  one (bank-check's fourth check, draft-bank's "Nothing gives its answer away"). One scenario may
  span goals and capabilities.
- [ ] **Step 3:** Cases in curation (spec "Case coverage in curation"): the rubric `cases:` field
  in the template's BANKS section and draft-bank; generators state cases per question shape;
  verify finds a case exercised by no banked question and no live generator; bank-check lists
  cases exercised and never exercised per bank, and flags a question bundling cases a learner
  could split; critique checks stated cases are real.
- [ ] **Step 4:** check-skills; `node workflows/diagram/tools/check-di.mjs workflows/learn/learn.bpmn`
  and bpmnlint if the diagram changed; dash grep. **Step 5: Commit** "Curation: every activity
  checkable, and cases covered".

### Task 9: Whole-branch check

- [ ] Full suite with `SOURCES_ROOT`; check-skills; `survey.mjs` on the six real topics (no new
  problems); practice draws for sessions 5, 7 and 9 unchanged in size; update the queue (items 9
  and 11) and commit.
