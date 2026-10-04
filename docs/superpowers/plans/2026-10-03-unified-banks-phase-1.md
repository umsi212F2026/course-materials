# Unified Banks, Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read folder banks, serve their questions through a picker (unseen first, then seen longest ago), and let the judge rule a question on each goal it names.

**Architecture:** `bank.mjs` (quiz lib) learns the folder layout `tasks/<activity>/<scenario>.md` + `rubrics/<activity>/<scenario>.md` and returns richer items; single-file banks read exactly as before. A new learn tool, `next-item.mjs`, chooses a question for a goal or an activity from those items and the learner's attempt log. The judge, study and review skills learn to use them. The goal model, vocabulary, curation and quiz changes are later phases.

**Tech Stack:** Node 22 ES modules, no dependencies; `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-03-unified-banks-design.md` (sections: Activities and banks; Serving; The judge).

## Global Constraints

- No em dashes or en dashes (U+2014, U+2013) in any new or changed line.
- Surgical edits only; never rewrite an existing file.
- Match the dense, reasoned comment style of `workflows/learn/tools/` and `workflows/quiz/tools/`.
- Label format, exactly: `<activity-id>/<scenario-id>/<question-id>`.
- Reserved scenario name, exactly: `main-bank`.
- A rubric question's `goal:` is one or more goal ids, comma-separated; backticks around ids are allowed and stripped.
- Test command after Task 1: `node --test 'workflows/*/tools/test/*.test.mjs'`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- A folder bank with a `tasks/<activity>/x.md` but no `rubrics/<activity>/x.md`: reported as a problem, not silently skipped (unlike single-file study activities). (Task 2)
- A question id repeated in two scenarios of one activity: allowed, since labels differ. The same id twice in one scenario: a problem. (Task 2)
- An attempt log containing old-format labels (`CATCH: ...`, `a-x/q3`): ignored by the picker, not a crash. (Task 3)
- A goal with no bank questions: the picker says so plainly and exits 2, so the tutor falls back to the generator. (Task 3)
- An existing single-file bank (web-backends `tasks/items.md`): reads to exactly the same items as before. (Task 2)

---

### Task 1: Shared move table, and a quiz test folder

**Files:**
- Create: `workflows/learn/tools/lib/moves.mjs`
- Modify: `workflows/quiz/tools/quiz-practice.mjs` (replace the local `MOVE_TAGS` with the import)
- Create: `workflows/quiz/tools/test/moves.test.mjs`
- Modify: `workflows/learn/tools/test/helpers.mjs` header comment, and `docs/superpowers/queue-learn-student-feedback.md` if it names the test command: the command becomes `node --test 'workflows/*/tools/test/*.test.mjs'`

**Interfaces:**
- Produces: `MOVE_TAGS` (move name to `'production' | 'reception'`, the same five entries `quiz-practice.mjs` has now) and `tagsForMove(move: string | undefined) -> string[]` (`[]` for an unknown or missing move).

- [ ] **Step 1: Failing test** `moves.test.mjs`: `tagsForMove('CATCH')` deep-equals `['production']`; `tagsForMove('DEFINE')` deep-equals `['reception']`; `tagsForMove(undefined)` deep-equals `[]`; `tagsForMove('NOPE')` deep-equals `[]`.
- [ ] **Step 2: Run** `node --test 'workflows/*/tools/test/*.test.mjs'`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `moves.mjs`; change `quiz-practice.mjs` to import `MOVE_TAGS` from `../../learn/tools/lib/moves.mjs`, removing its local copy and keeping its two uses unchanged.
- [ ] **Step 4: Run** the full command. Expected: all pass, including the 20 learn tests.
- [ ] **Step 5: Commit.** "Share the move table between learn and quiz"

---

### Task 2: Folder banks in `bank.mjs`

**Files:**
- Modify: `workflows/quiz/tools/lib/bank.mjs` (`readBank`, plus a new exported reader)
- Test: `workflows/quiz/tools/test/bank.test.mjs` (fixtures built in a temp dir)

**Interfaces:**
- Produces: `readFolderBanks(dir: string, label = '') -> { items, problems }`, also called by `readBank` so every caller sees both kinds. For each `tasks/<activity>/<scenario>.md` with a matching `rubrics/<activity>/<scenario>.md`, each `### <question-id>` yields:

  ```
  { bank: `${label ? label + '/' : ''}${activity}`,   // stratum, per activity
    activity, scenario, id: questionId,
    label: `${activity}/${scenario}/${questionId}`,
    goals: string[],                // from rubric `goal:`, split on commas, backticks stripped; [] if absent
    goal?: string,                  // set only when goals.length === 1, so the quiz keeps working
    move?: string, tags: string[],  // tags = tagsForMove(move)
    type, prompt, choices?/answer?, // as readBank does today; prompt = setup + "\n\n" + question body when setup is non-empty
    setup: string,                  // the scenario's top part (empty for main-bank)
    rubric?: string,                // free items: as today (answer + credit), prefixed by the scenario key when non-empty
    key: string,                    // the rubric scenario file's top part
    expected?: string, tutorNote?: string }
  ```

  Top part means everything before the first `###`, with the file's `#` title line removed, trimmed.
- Problems (collected, never thrown): a scenario file in `tasks/<activity>/` with no rubric file of the same name; a question with no rubric entry; the same question id twice in one scenario; a rubric entry with no question; mcq and missing-answer checks as today.
- Single-file banks (`tasks/*.md` with `rubrics/*.md`) are read exactly as now, and folder items are appended after them.

- [ ] **Step 1: Failing tests** in `bank.test.mjs`:
  - a scenario `crumbs` with setup "The app: Crumbs." and questions `v1`, `v4`; rubric key "Must name: sleep." and entries with `goal: \`c-a\`, \`c-b\``: items have labels `a-x/crumbs/v1`, `a-x/crumbs/v4`; `goals` `['c-a','c-b']`; no `goal` field; `prompt` starts with "The app: Crumbs."; `rubric` starts with "Must name: sleep.";
  - a `main-bank.md` with an empty top part and one single-goal question: `setup` is `''`, `goal` equals its one goal, `prompt` is the bare question;
  - a vocabulary question with `move: CATCH`: `tags` deep-equals `['production']`;
  - `tutor note:` comes through as `tutorNote`;
  - `q1` in two scenarios of one activity: two items, no problem; `q1` twice in one scenario: a problem naming it;
  - a scenario file with no rubric file: a problem naming the file;
  - a single-file bank fixture (`tasks/items.md` + `rubrics/items.md`, two items): the same objects `readBank` returned before this change (assert `bank`, `id`, `goal`, `prompt`, `rubric` exactly).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `readFolderBanks`, reusing `sections`, `fields`, `unwrap` and `splitChoices`. `fields` matches only one-word names (`[a-z]+`), so widen it to allow spaces (`tutor note`), mapping `tutor note` to `tutorNote`; a multi-goal `credit` written as an indented list folds into the one credit string, which is what the grader takes; call it from `readBank` and concatenate. Add a header comment explaining the folder layout and why a missing rubric file is a problem here but not for single files (a folder under `tasks/` exists only to hold a bank).
- [ ] **Step 4: Run all tests.** Then, read-only, check real data is unchanged: `node -e "import('./workflows/quiz/tools/lib/bank.mjs').then(m=>{const r=m.readBank('/Users/presnick/Documents/Documents/code/2026/learning-topics/web-backends-2026-09');console.log(r.items.length, r.problems)})"`. Expected: `44 []`.
- [ ] **Step 5: Commit.** "Read folder banks with scenarios"

---

### Task 3: The picker, `next-item.mjs`

**Files:**
- Create: `workflows/learn/tools/next-item.mjs`
- Create: `workflows/learn/tools/lib/pick.mjs` (the choice, separate from the command line so it can be tested directly)
- Test: `workflows/learn/tools/test/pick.test.mjs`

**Interfaces:**
- Consumes: `readFolderBanks` (Task 2); `readLog(dir)` from `lib/topic.mjs`.
- Produces: `pick(items, log, { goal?, activity?, after? }) -> { item, repeat: boolean, lastServed: string | null } | null`.
  - Candidates: with `goal`, items whose `goals` include it; with `activity`, items whose `activity` matches. Exactly one of the two is given.
  - Served history: for each candidate, the latest `at` among log lines whose `label` equals the candidate's label. Log labels matching no candidate are ignored.
  - Order: never-served before served; among served, oldest latest-`at` first. Ties broken by: shares the `<activity>/<scenario>` prefix of `after` first (when given), then bank order (scenario files sorted by name, questions in file order).
  - Returns `null` when there are no candidates.
- CLI: `node workflows/learn/tools/next-item.mjs <topic-folder> (--goal <id> | --activity <id>) [--after <label>] [--key]`. Every flag checked, as in `record-status.mjs`. Reads items with `readFolderBanks(topicFolder)`.
  - Prints, one per line: `label: <label>`, `goals: <comma-separated>`, `tags: <comma-separated or none>`, `repeat: no` or `repeat: yes (last served <YYYY-MM-DD>)`, then a line `--- learner sees ---` and the item's `prompt` (with numbered choices for mcq).
  - With `--key`, also prints `--- key ---`, the `rubric` (or, for mcq, the correct choice), and, if present, `--- tutor note ---` and the note.
  - No candidates: prints `no bank questions for <goal or activity>; run the activity's generator live` and exits 2.

- [ ] **Step 1: Failing tests** in `pick.test.mjs`, on in-memory items and logs:
  - nothing served: returns the first item in bank order, `repeat` false;
  - first served, second not: returns the second;
  - all served: returns the one with the oldest latest-`at`, `repeat` true, `lastServed` that date;
  - `after` set to a label in scenario B, unseen items in A and B: returns the B one;
  - `goal` filter across two activities; `activity` filter;
  - a log line `CATCH: subject/verb agreement` doesn't affect the result;
  - no candidates: `null`.
  - CLI (via `run` from helpers on a topic built with `makeTopic` plus bank files): prints `label: a-x/crumbs/v1` and `repeat: no`; `--key` prints `--- key ---`; an unknown goal exits 2 with the message.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `pick.mjs` and `next-item.mjs`, with header comments in the house style (why unseen first, why longest ago, why old labels are ignored).
- [ ] **Step 4: Run all tests.** Expected: PASS.
- [ ] **Step 5: Commit.** "Pick the next question from a bank"

---

### Task 4: The judge rules per goal; study and review serve from banks

**Files:**
- Modify: `workflows/learn/skills/study/judge/SKILL.md` (inputs table, the example, what to return)
- Modify: `workflows/learn/skills/study/SKILL.md` (step 1 offering, step 3 adjudication, The record)
- Modify: `workflows/learn/skills/study/references/running-an-activity.md` (Run it as written)
- Modify: `workflows/learn/skills/review/SKILL.md` (serving a due goal; adjudication)

**What the text must say:**
- **Judge input:** either the existing single `goal` + `criterion`, or `goals`: a list of `{goal, criterion}` with each criterion resolved, plus an optional `rubric` (the `--key` output: scenario key, answer, credit, tutor note). With a rubric, `criterion: met` for a goal means full credit for that goal under the rubric; half credit is `not met`. Output: one ruling object per goal, in the existing shape, as a JSON array when `goals` was given.
- **Study, offering and running:** for an activity whose `tasks/<activity-id>/` folder exists, serve with `next-item.mjs <topic> --activity <id>`; show the learner only what follows `--- learner sees ---`; read the key with `--key` and never show it. A learner who carries on gets `--after <last label>`. Exit 2, or no folder: run the generator live, as today.
- **Study and review, recording:** one `record-attempt.mjs` call per ruled goal, all with the question's label and its `--tags`.
- **Review:** serve a due goal with `next-item.mjs <topic> --goal <id>`; exit 2 means fall back to the generator live.
- Add `next-item.mjs` to each skill's "Depends on".

- [ ] **Step 1: Make the edits.**
- [ ] **Step 2: Verify.** No U+2014 or U+2013 character on any added line of `git diff -U0`, and every command quoted in the text matches Task 3's CLI exactly.
- [ ] **Step 3: Commit.** "Teach the judge, study and review to use banks"
