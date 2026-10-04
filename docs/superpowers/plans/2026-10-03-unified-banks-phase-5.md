# Unified Banks, Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The quiz draws from folder banks at topic, activity or scenario level, the practice quiz prefers questions the student hasn't seen, multi-goal questions are graded and recorded per goal with the score averaged, and only course goals are drawn.

**Architecture:** On the quiz path, `readBank` gives each folder question a qualified `id` (its source plus its label), so every id-keyed map in the quiz tools and the instructor's private runner keeps working. Pool keys resolve against the longest prefix that is a source folder. `drawPractice` orders each stratum by the student's attempt log. `grade.mjs` accepts per-goal verdicts and averages them. The quiz skills follow, and a contract document tells the private tools what changed.

**Tech Stack:** Node 22 ES modules, no dependencies; `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-03-unified-banks-design.md` (section: Quiz).

**Decisions made for this phase (also in the rulings file):**
- **Qualified ids on the quiz path.** `readBank(dir, label)` sets a folder item's `id` to `<label>/<activity>/<scenario>/<question>` (or `<activity>/<scenario>/<question>` with no label). `readFolderBanks` itself is unchanged, so the picker is unaffected. Single-file items keep their bare ids.
- **Recorded labels.** A folder question is recorded under its `label` (topic-local path). A single-file question keeps today's label (`<move>: <id>`, or `<id>`). One helper, `recordLabel(item)`, says which.
- **A topic-level count is spread evenly** across the topic's banks (folder activities and single-file banks), deterministically: banks in name order each get `floor(n/k)`, and the first `n % k` get one more; a bank too small gives its shortfall to the next.
- **Topic-form pools** (`"topic"`) check exhaustiveness against single-file banks only, since folder banks postdate that form.
- **Course goals only** is applied by a helper in `quiz-draw.mjs` (`courseOnly`), used by the practice quiz and documented for the private bake. A question naming any goal whose origin isn't `course` is dropped and reported as a problem; a question naming no goal is kept.
- **Per-goal verdicts.** A verdict may carry `per_goal: { <goal>: { credit, missed, axes } }`. The item's value is the mean of its per-goal credits; its `credit` reads `full` when all are full, `none` when all are none, and `partial` otherwise. A verdict without `per_goal` behaves exactly as today.

## Global Constraints

- No em dashes or en dashes (U+2014, U+2013) in any new or changed line; replace any on a line you change.
- Surgical edits only.
- Match the dense, reasoned comment style of `workflows/quiz/tools/`.
- Backward compatibility is a requirement: every existing pool in `quiz-bank/` draws the same strata and sizes as before; single-file items keep their exact shape; a verdict without `per_goal` merges exactly as before. The instructor's private tools (`quiz-bake`, `quiz-seed`, `quiz-grade`, `quiz-comments`) share `bank.mjs` and `grade.mjs`.
- Test command: `node --test 'workflows/*/tools/test/*.test.mjs'`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- The real pools (`quiz-bank/session-{3,5,7,9}.pool.json`) against the real sources: identical strata names, sizes and problems before and after. (Task 1)
- Two topics in one draw whose folder banks share an `<activity>/<scenario>/<question>` path: distinct ids, no form or queue collision. (Task 1)
- A draw key naming a scenario of a single-file bank, or a missing scenario: a problem, not a crash. (Task 1)
- A student whose log has seen every question in a stratum: still drawn, least recently seen first. (Task 2)
- A multi-goal verdict missing one named goal in `per_goal`: a problem, not a silent average over the rest. (Task 3)

---

### Task 1: Qualified ids and pool keys in `bank.mjs`

**Files:**
- Modify: `workflows/quiz/tools/lib/bank.mjs` (`readBank`, `readPoolSources`, `applyPool`; new export `recordLabel`)
- Test: `workflows/quiz/tools/test/pool.test.mjs`

**Interfaces:**
- `readBank(dir, label)`: folder items get `id` as described above; `label` (topic-local) is kept.
- `recordLabel(item) -> string`: `item.label` when present, else `` `${item.move}: ${item.id}` `` when `move` is set, else `item.id`.
- Draw key resolution in `readPoolSources`: for each key, the source is the longest prefix `P` of its `/`-separated segments such that `<root>/<P>/tasks` is a directory; the remainder is `''` (the whole topic), `<name>` (a single-file bank or a folder activity), or `<activity>/<scenario>`. A key with no such prefix is the existing "not a folder" problem. A topic-form pool is read as today.
- `applyPool` strata:
  - `<source>/<name>`: as today (a single-file bank's `bank` is `<source>/<file>`; a folder activity's is `<source>/<activity>`).
  - `<source>/<activity>/<scenario>`: the activity's items whose `scenario` matches; no such scenario is a problem naming it.
  - `<source>`: spread across that source's banks per the decision above; the stratum's `name` stays the key; problems for any shortfall.
  - `exclude` keys may be qualified folder ids or bare single-file ids.
  - Topic form: exhaustiveness checked against single-file banks only.

- [ ] **Step 1: Failing tests:**
  - folder items read through `readBank(dir, 'learning-topics/t1')` have `id` `learning-topics/t1/a-x/s1/q1` and `label` `a-x/s1/q1`;
  - two sources with the same folder path give distinct ids;
  - `recordLabel` for a folder item, a single-file item with `move`, and one without;
  - draw keys at topic, activity and scenario level on a fixture workspace (`root` with `learning-topics/t1/{tasks,rubrics}`), including the even spread (7 across 3 banks gives 3, 2, 2; a bank of 1 passes its shortfall on);
  - a missing scenario and a scenario key on a single-file bank are problems;
  - topic form with a folder bank present reports no unmentioned-bank problem for it;
  - backward compatibility: for each real pool in `quiz-bank/`, `applyPool(readPoolSources(pool, ROOT), pool)` gives the same `strata.map(s => [s.name, s.take, s.items.length])` and the same problems as at commit `0ce78cb` (load that commit's `bank.mjs` from a scratch copy, as earlier phases did). Skip a pool whose sources aren't present, with a message.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Comment the key-resolution rule and why ids are qualified only on the quiz path.
- [ ] **Step 4: Run all tests.**
- [ ] **Step 5: Commit.** "Qualify folder ids and resolve pool keys at topic, activity and scenario level"

---

### Task 2: Practice draws prefer unseen questions; course goals only

**Files:**
- Modify: `workflows/quiz/tools/quiz-draw.mjs` (`drawPractice`; new export `courseOnly`)
- Test: `workflows/quiz/tools/test/draw.test.mjs`

**Interfaces:**
- `drawPractice(pool, root, { seed, preferUnseen = true })`: within each stratum, shuffle with the seeded RNG as today, then stable-sort by the latest `at` in that item's topic log for `recordLabel(item)` (never seen first, then oldest), and take the first `take`. Topic logs are read with `readLog(topicDir(...))` from `workflows/learn/tools/lib/topic.mjs`; an item with no topic sorts as unseen.
- `courseOnly(items) -> { items, problems }`: for items with a topic, drop any whose `goals` (or single `goal`) include a goal whose origin, from `readGoals(topic).goals`, isn't `course`; one problem per dropped item: `<id> dropped: <goal> is not a course goal`. Items with no goal are kept. `drawPractice` applies it before stratum draws and adds its problems.

- [ ] **Step 1: Failing tests** on a fixture workspace with an attempts log: with two items and one seen, `take: 1` draws the unseen one regardless of seed; with all seen, the least recently seen; with a learner-origin goal, that item is dropped and reported; an item with no goal is kept; `preferUnseen: false` keeps today's random draw.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run all tests.** Then, read-only, `node workflows/quiz/tools/quiz-practice.mjs --list` still lists the same pools as before.
- [ ] **Step 5: Commit.** "Prefer unseen questions in practice draws; draw only course goals"

---

### Task 3: Per-goal grading and recording

**Files:**
- Modify: `workflows/quiz/tools/lib/grade.mjs` (`buildQueue`, `mergeGrades`)
- Modify: `workflows/quiz/tools/quiz-practice.mjs` (queue items and `--score` rows carry per-goal data; tags from the item's `tags` when present)
- Test: `workflows/quiz/tools/test/grade.test.mjs`

**Interfaces:**
- `buildQueue(rows)`: queue items gain `goals: string[]` (the item's `goals`, or `[goal]`, or `[]`). Everything else unchanged.
- quiz-practice `queue.json` items gain `goals: [{ goal, criterion, topic }]` when an item names more than one goal (single-goal items unchanged).
- `mergeGrades`: a verdict with `per_goal` must name exactly the item's goals (else a problem naming the missing or extra goal). Item `credit` per the decision above; item `value` = mean of `CREDIT_VALUE` over the goals; `score` sums `value` (single-goal items: `value = CREDIT_VALUE[credit]`, as today). Student items gain `per_goal` when the verdict had it. Without `per_goal`, output is byte-identical to today.
- quiz-practice `--score` rows: `item` (the qualified id), `label` (`recordLabel`), and, for multi-goal items, `per_goal: [{ goal, credit, missed, axes }]`; the capability override (`criterion: unchecked`) applies per goal from `kinds.json`.

- [ ] **Step 1: Failing tests:**
  - a single-goal verdict merges exactly as at commit `0ce78cb` (compare output objects);
  - a two-goal verdict with `full` and `none` gives `credit: 'partial'`, `value: 0.5`, and a score of 0.5;
  - a missing goal in `per_goal` is a problem;
  - `buildQueue` carries `goals`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run all tests.**
- [ ] **Step 5: Commit.** "Grade and record multi-goal questions per goal"

---

### Task 4: Quiz skills, the private-tools contract, and the queue

**Files:**
- Modify: `workflows/quiz/skills/quiz/grade/SKILL.md`: input may carry `goals: [{goal, criterion, kind}]` for a multi-goal question; output then adds `per_goal: { <goal>: { credit, missed, axes } }`, one per named goal, judged against that goal's credit statement; half credit on a goal is `not met` for it.
- Modify: `workflows/quiz/skills/quiz/SKILL.md`: step 4 writes `kinds.json` for every goal named (multi-goal included); step 5 sends multi-goal items with `goals` and appends verdicts with `per_goal`; step 7 records with `recordLabel` (the row's `label`), one `record-attempt.mjs` call per named goal with that goal's axes and the item's tags; the score explanation mentions averaging.
- Create: `workflows/quiz/tools/CONTRACT.md`: what the shared libraries now give and expect, for the instructor's private tools: qualified folder ids; `label` and `recordLabel`; pool keys at three levels and the even spread; `courseOnly`, which the bake should call; per-goal verdicts and `partial` credit with `value`; what stays byte-identical. Name each private tool and what, if anything, it must change.
- Modify: `docs/superpowers/queue-learn-student-feedback.md`: phase 5 done; the migrate-words gate is open (pools may now name folder banks), with the note that a pool should be updated to the new keys when its topic is migrated.

- [ ] **Step 1: Make the edits.**
- [ ] **Step 2: Verify:** check-skills reports nothing new; no U+2014 or U+2013 on any added line; the commands and field names quoted match Tasks 1-3.
- [ ] **Step 3: Commit.** "Teach the quiz skills per-goal grading; document the contract for private tools"
