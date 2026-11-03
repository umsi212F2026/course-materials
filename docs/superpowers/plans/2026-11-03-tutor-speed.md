# Tutor Speed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An mcq turn in study costs the tutor one tool call and one reply, with no spawned judge: a program rules multiple choice and writes its feedback, the tutor rules the rest, and `answer.mjs` rules, records, shows and serves in one call.

**Architecture:** Two pieces of existing CLI code move into libs so a new tool can reuse them: record-attempt's writing path (`lib/record.mjs`) and next-item's serving path (`lib/serve.mjs`). A pure ruling function (`lib/rule.mjs`) compares choices with the bank's keys and builds the learner's text. `answer.mjs` composes the three. Then the `adjudicator` slot, `judge-input.mjs` and `study/judge` are retired, and the skills and diagram are rewritten to match.

**Tech Stack:** Node ESM `.mjs`, no dependencies; tests with `node:test` run as subprocesses through `workflows/learn/tools/test/helpers.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-03-tutor-speed-design.md`

## Global Constraints

- Never write an em dash or en dash anywhere: code, comments, output, skills, commit messages. Use a comma, colon, full stop or parentheses.
- Surgical edits only: change the lines that need changing, never rewrite an existing file wholesale.
- Match the surrounding code: its comment density, its CAPITALISED-LEAD comment style, `die()` for refusals, every flag checked by name.
- Branch `tutor-speed` only. Never push, never merge.
- Suite command, from the repo root: `node --test 'workflows/*/tools/test/*.test.mjs'`. Baseline is 413 passing; every task ends with the whole suite green.
- `attempts.jsonl` record shape is unchanged: `{at, goal, label, tags?, cases?, source, unaided, criterion}` or `{..., outcome}`, plus optional `note`.
- Choice numbers on the command line and in learner text are 1-based, as the learner saw them; `item.answer` and `part.answer` are 0-based.
- Every edited SKILL.md or skill reference must pass the three checks in `/Users/presnick/Documents/Documents/code/2026/course-private/notes/skill-authoring.md`, and must read as though there had never been a judge: no provenance, no "used to".

## Review Focus

1. A choice out of range (`--choice 5` on four choices, `--choice 0`, `--choice x`) must be refused, not recorded as wrong. Test in Task 3.
2. `--choice` naming a part letter the question does not have, or naming an open part, must be refused. Test in Task 3.
3. A label that is not a bank question (a live vocabulary label such as `CATCH: x`) must be refused with a pointer to `record-attempt.mjs`. Test in Task 3.
4. `--next` when the next pick is in the same scenario must not repeat the framing; when it is a new scenario it must. Test in Task 4 (comparison against `next-item.mjs` output covers both).
5. A refusal must write nothing: no partial attempts for the first of two goals before a later check fails. Test in Task 3 (all validation before the first append).

---

### Task 1: Move record-attempt's writing path into `lib/record.mjs`

**Files:**
- Create: `workflows/learn/tools/lib/record.mjs`
- Modify: `workflows/learn/tools/record-attempt.mjs:130-279` (validation, record building, append, report, progress move out; argument parsing and `USAGE` stay)
- Test: existing suite only (behaviour must be byte-identical)

**Interfaces:**
- Produces:
  - `checkAttempt(dir, goalId, { axes, outcome, tags = [], cases = [], source = 'study', note }) -> record` : validates exactly as record-attempt does today (unknown goal with the "Did you mean" hint, goals.md problems, unknown tags, cases rules, axes values, outcome values) and returns the record object without writing. Throws `RecordError` (exported class, `message` is today's die text) on any refusal. `axes` is an object `{unaided, criterion}`, not a JSON string; JSON parsing stays in the CLI.
  - `appendAttempt(dir, record) -> string[]` : appends the line and returns the report lines record-attempt prints today (`<goal>: <ruling>`, the bar line, the retired or next-review line).
  - `progressAfter(dir, goalId) -> string | null` : the `renderAfter` text, or null.
- Consumed by Task 3.

- [ ] **Step 1: Run the suite and note it green (413).**
- [ ] **Step 2: Create `lib/record.mjs` by moving the code**, not rewriting it: comments move with the code they explain. `record-attempt.mjs` keeps parsing, calls `checkAttempt` (catching `RecordError` into `die`), then `appendAttempt`, prints the lines, and with `--progress` prints `--- progress ---\n${text}` when `progressAfter` is not null.
- [ ] **Step 3: Run the suite.** Expected: 413 pass, no output changes.
- [ ] **Step 4: Commit** `Move record-attempt's writing path into lib/record.mjs`.

### Task 2: Move next-item's serving into `lib/serve.mjs`; `--key` prints the criterion and ruling rules

**Files:**
- Create: `workflows/learn/tools/lib/serve.mjs`
- Modify: `workflows/learn/tools/next-item.mjs:66-138`
- Modify: `workflows/learn/tools/lib/item.mjs` (add `hasOpenPart`, `criterionText`)
- Test: `workflows/learn/tools/test/ruling-block.test.mjs` (create)

**Interfaces:**
- Produces:
  - `serveNext(dir, { goal, activity, after, review }) -> null | { item, header: string[], learner: string, key: string }`. `header` is the lines from `label:` through `served first:`; `learner` is framing plus `learnerText(item)`, exactly as printed after `--- learner sees ---`; `key` is everything next-item prints after `--- key ---` (keyText, then the criterion and ruling sections below). `null` means exit 2. Bank `problems` warnings stay in the CLI.
  - next-item prints `header`, `--- learner sees ---`, `learner`, and with `--key` `--- key ---` and `key`. Output for existing tests unchanged.
  - `hasOpenPart(item) -> boolean` in `lib/item.mjs`: true for a non-mcq item, or a compound with any non-mcq part.
  - `criterionText(dir, item) -> string` in `lib/item.mjs` (or serve.mjs): the criterion section.
- Consumed by Task 3 and Task 4.

When `hasOpenPart(item)`, `key` ends with these two sections, exact copy:

```
--- criterion ---
<goal-id>: <criterion resolved, goal.criterionText from readIds>
  case <case-id>: <case text>        (one line per case item.cases[goal] lists)
--- ruling ---
Rule against the criterion as written, not a better one you can see.
Half credit is not met.
unclear is for a genuine tie, in either direction.
Anything that changed what they did is help. Clarifying which question was meant, or repeating it, is not.
Rule on what they wrote, not on how the session went.
```

A goal with goals.md problems prints `<goal-id>: can't be ruled until its goals.md entry is fixed`. An mcq-only item prints neither section.

- [ ] **Step 1: Write failing tests** in `ruling-block.test.mjs`, using `makeTopic`/`run`/`CAP_GOAL` and topic builders like `compound.test.mjs`'s:
  - `next-item --key on an open question prints the criterion and the ruling block`: `--- key ---` text ends with `--- criterion ---\nc-a: The thing is done.\n--- ruling ---\nRule against the criterion as written, not a better one you can see.\n...` (all five lines).
  - `next-item --key on a compound with an open part prints both sections` (use compound.test's `topic()` shape).
  - `next-item --key on a plain mcq prints neither`.
  - `the criterion section lists the cases the question exercises, with their texts` (a goal with a `cases` slot; copy the goals.md cases syntax from `test/cases.test.mjs`).
  - `without --key neither section is printed`.
- [ ] **Step 2: Run** `node --test workflows/learn/tools/test/ruling-block.test.mjs`. Expected: FAIL on the missing sections.
- [ ] **Step 3: Implement** `lib/serve.mjs` by moving next-item's body (comments move with it), add the two sections, make next-item a thin CLI.
- [ ] **Step 4: Run the full suite.** Expected: all pass, including `compound.test.mjs`'s exact-key assertions, which must be updated only where the key now gains the two sections (its compound has an open part b): append the criterion and ruling sections to `KEY` and `BARE_KEY` expectations, and leave its judge-input tests for Task 5.
- [ ] **Step 5: Commit** `next-item --key prints the criterion and the ruling rules for an open question`.

### Task 3: `answer.mjs` rules, records and shows

**Files:**
- Create: `workflows/learn/tools/lib/rule.mjs`
- Create: `workflows/learn/tools/answer.mjs`
- Test: `workflows/learn/tools/test/answer.test.mjs` (create)

**Interfaces:**
- Consumes: `checkAttempt`, `appendAttempt`, `progressAfter`, `RecordError` (Task 1); `hasOpenPart` (Task 2); `readFolderBanks` from `../../quiz/tools/lib/bank.mjs`; `readIds` from `lib/topic.mjs`.
- Produces:
  - `parseChoice(value: string) -> { whole?: number } | { parts: Map<letter, number> }` : `3` or `a=2,c=1`.
  - `ruleItem(item, { choice, criterion }) -> { criterion: 'met'|'not met'|'unclear', partLines: string[], verdict: string[] }`; throws `RuleError` with the refusal text. `partLines` are tutor lines `(a) answered 2, key 1, right|wrong`. `verdict` is learner lines.
  - CLI `node workflows/learn/tools/answer.mjs <topic> <label> --unaided yes|no|unclear [--choice ...] [--criterion met|"not met"|unclear] [--concern "..."] [--next (--goal <id>|--activity <id>)] [--review <goal>[,<goal>]]`. Task 3 implements everything except `--next`, `--review` and `--concern`, which Task 4 adds; until then they are refused as unknown flags.

Ruling rules (spec, "It rules"):
- plain mcq: `--choice <n>` required, `--criterion` refused. Right is `met`, wrong is `not met`.
- compound: every mcq part needs `<letter>=<n>`; `--criterion` required iff `hasOpenPart(item)`; result `met` only when every mcq part is right and (no open part or `--criterion met`); any wrong mcq part gives `not met`; otherwise the tutor's `--criterion`.
- open item: `--criterion` required, `--choice` refused.
- `--unaided` required on every call.
- refused: a choice outside 1..choices.length or not an integer; a letter the item lacks or naming a non-mcq part; a whole-number `--choice` on a compound or a lettered one on a plain mcq; a label not in the bank (message names `record-attempt.mjs` for questions set live); an item with no goals; a goal with a `cases` slot for which `item.cases[goal]` is empty (message: record that goal through `record-attempt.mjs`, as today).
- all validation, including `checkAttempt` for every goal, happens before the first `appendAttempt`.

Learner copy, exact (`n` is 1-based, `"..."` is the choice text):
- right: `Correct: **3**, "It marks what starts a run of the workflow, its trigger."`
- wrong: `Not this time. You chose **1**, "It is the first step: the human opens the Day 1 page." The answer is **3**, "It marks what starts a run of the workflow, its trigger."`
- a compound part: the same, prefixed `(a) `. Open parts get no line.
- The scenario key is never printed in the learner section.

Three choices, printed in the learner section only when the ruling is `not met`, exact copy:

```
What next?
1. Try again now, with another question.
2. Come back to it later.
3. Mark it as learned.
```

When any goal the question credits has a `cases` slot, line 3 is instead `3. Count this one as right and go on to the next question.`

Output layout:

```
<appendAttempt lines, for each goal in item.goals order>
<partLines>
--- learner sees ---
<verdict lines>                     (omitted when empty)

```text
<progressAfter(last goal)>          (omitted, with its fences, when null)
```

<three choices>                     (only on not met)
```

Sections in the learner block are separated by one blank line; no trailing blank line. Recorded `tags` are `item.tags`, `cases` are `item.cases[goal]`, `source` is `study`.

- [ ] **Step 1: Write failing tests** in `answer.test.mjs`. Build a topic with a bank holding a plain mcq (four choices, answer 3), an open question, the compound from `compound.test.mjs`, a question crediting two goals, and one for a goal with cases. Tests, each asserting exit code, stdout and the lines in `evidence/attempts.jsonl` (read with `readFileSync`, split, `JSON.parse`):
  - `a right mcq records met and prints the Correct line` (record `{unaided:'yes', criterion:'met', source:'study'}`, label, tags from the bank)
  - `a wrong mcq records not met and prints the verdict and the three choices`
  - `a plain mcq with --criterion is refused and writes nothing`
  - `an open question without --criterion is refused`
  - `an open question with --criterion met records it and prints no verdict line`
  - `a call without --unaided is refused`
  - `a compound with every mcq part right and --criterion met is met`
  - `a compound with one mcq part wrong and --criterion met is not met, with that part's lines`
  - `a compound missing a choice for an mcq part is refused`
  - `--choice naming a part the compound lacks, or an open part, is refused`
  - `a choice out of range or not a number is refused`
  - `a label not in the bank is refused and names record-attempt.mjs`
  - `a question crediting two goals records two attempts with the same label and tags`
  - `cases come from the bank`, and `a goal with cases the question lists none for is refused`
  - `--unaided no with a right choice records unaided no, criterion met, and the bar is not met`
  - `on a goal with cases the third choice counts this question`
  - `the progress block is fenced and matches record-attempt --progress for the same state`
  - `a refusal on the second goal writes no attempt for the first`
- [ ] **Step 2: Run** `node --test workflows/learn/tools/test/answer.test.mjs`. Expected: FAIL (no such file).
- [ ] **Step 3: Implement** `lib/rule.mjs` and `answer.mjs`. Header comment in the style of record-attempt's: what it is for, the usage lines, and the reasons a reader needs (one call per answer; a program rules choices; the tutor states unaided on every call because a default would record a helped attempt as unaided).
- [ ] **Step 4: Run the full suite.** Expected: all pass.
- [ ] **Step 5: Commit** `answer.mjs: rule a bank question, record it, and write the learner's feedback`.

### Task 4: `answer.mjs --next`, `--review`, `--concern`

**Files:**
- Modify: `workflows/learn/tools/answer.mjs`
- Test: `workflows/learn/tools/test/answer.test.mjs`

**Interfaces:**
- Consumes: `serveNext` (Task 2); `appendStatus(dir, 'blocked', { goal, needs: 'curation', why })` from `lib/status.mjs`.

Behaviour:
- `--next` requires exactly one of `--goal`/`--activity`; `--goal`/`--activity` without `--next` is refused. After recording, `serveNext(dir, { goal, activity, after: label })`. The learner block gains, after the three choices (or after progress), a blank line and `next.learner`. After the learner block: `--- next ---`, `next.header` lines, `--- key ---`, `next.key`. When `serveNext` returns null: the attempt stays recorded, the learner block is printed without a next question, stderr gets next-item's message (`no bank questions for <id>; run the activity's generator live`), exit 2.
- `--review <goal>[,<goal>]`: every named goal must be one `item.goals` credits; refused with `--next`. Source per goal: named (due) goal is `review`; another goal is `review` when its ruling is `criterion: not met` or `unaided: no`; otherwise `study`. With `--review`, no progress block and no three choices.
- `--concern "<why>"`: after the attempts, one `appendStatus(dir, 'blocked', { goal, needs: 'curation', why })` per goal; tutor line `queued: blocked <goal> --needs curation`.

- [ ] **Step 1: Write failing tests:**
  - `--next serves the same header, learner text and key as next-item --after <label> --key` (run both against two copies of the same topic state, or record via answer.mjs and then run next-item on the same folder, and compare the `--- next ---` part and the learner tail)
  - `--next across a scenario boundary carries the new scenario's framing, and within one it does not` (a framed scenario of two questions, then a second framed scenario)
  - `--next with nothing left records the attempt, prints the learner block and exits 2`
  - `--next without --goal or --activity is refused`; `--goal without --next is refused`
  - `--review on a two-goal question, one goal due: the due goal is review on a pass and on a miss; the other is review only when missed`
  - `--review with an unclear ruling leaves the other goal as study`
  - `--review naming a goal the question does not credit is refused`; `--review with --next is refused`
  - `--review prints no progress block and no three choices`
  - `--concern writes one blocked line per goal to status.jsonl`
- [ ] **Step 2: Run** the file. Expected: the new tests fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the full suite.** Expected: all pass.
- [ ] **Step 5: Commit** `answer.mjs: serve the next question, record review sources, file concerns`.

### Task 5: Retire the `adjudicator` slot and `judge-input.mjs`

**Files:**
- Modify: `workflows/learn/tools/lib/slots.mjs:17-19,92-99,196-197` (remove `ADJUDICATORS` and the `adjudicator` entry; the retired-slot comment and `applySlots` skip cover `adjudicator` as they cover `supply`)
- Modify: `workflows/learn/tools/review-due.mjs:72-73` (stop emitting `adjudicator`)
- Modify: `workflows/learn/tools/test/supply.test.mjs:74` (expected keys without `adjudicator`)
- Modify: `workflows/learn/tools/new-word.mjs:107`, `lib/item.mjs:1-3`, `lib/bars.mjs`, `lib/topic.mjs`, `record-attempt.mjs` header: comments naming the judge or the slot. "Adjudicator" as a plain word for whoever rules may stay.
- Delete: `workflows/learn/tools/judge-input.mjs`, `workflows/learn/tools/test/judge-input.test.mjs`
- Modify: `workflows/learn/tools/test/compound.test.mjs` (drop the judge-input tests and the header line about it; the framing test keeps its next-item half)
- Test: `workflows/learn/tools/test/retired-adjudicator.test.mjs` (create)

- [ ] **Step 1: Write failing tests:** `a goal carrying adjudicator: study/judge parses with no problems`, `a goal carrying adjudicator: tutor parses with no problems`, and `the parsed goal has no adjudicator field`. Use survey (no problems reported) and `record-attempt.mjs` succeeding on such a goal.
- [ ] **Step 2: Run** the file. Expected: the "no adjudicator field" test fails; the parsing tests may already pass.
- [ ] **Step 3: Implement** the edits above. `grep -rn "judge-input\|study/judge\|ADJUDICATORS" workflows/*/tools` must return nothing.
- [ ] **Step 4: Run the full suite.** Expected: all pass.
- [ ] **Step 5: Commit** `Retire the adjudicator slot and judge-input.mjs`.

### Task 6: Rewrite the skills for in-session ruling

**Files:**
- Modify: `workflows/learn/skills/study/SKILL.md`
- Modify: `workflows/learn/skills/study/references/running-an-activity.md`
- Modify: `workflows/learn/skills/review/SKILL.md`
- Modify: `workflows/quiz/skills/quiz/SKILL.md:190-194`
- Modify: `workflows/quiz/skills/quiz/grade/SKILL.md`, `workflows/learn/skills/goal-setting/references/vocabulary-moves.md`, `workflows/diagram/skills/workflow-diagram/references/conventions.md`, `workflows/learn/templates/goals.md`, `workflows/learn/templates/activities.md`: remove mentions of the slot or `study/judge` only
- Modify: `workflows/learn/skills/goal-setting/references/slots.md`
- Delete: `workflows/learn/skills/study/judge/SKILL.md`

Read first: `course-private/AGENTS.md` "Before writing or editing a skill" and `course-private/notes/skill-authoring.md` (both at `/Users/presnick/Documents/Documents/code/2026/course-private/`), the spec, and `answer.mjs --help`-equivalent usage from Task 3/4's header comment.

What each must say (the spec's "What else changes" is the full list):
- study step 3: the tutor rules every attempt. A bank question is recorded with one `answer.mjs` call: `--unaided` always; `--choice` for mcq or mcq parts; `--criterion` for anything open, ruled against the key, criterion and ruling lines next-item `--key` printed; `--next` with the same `--goal`/`--activity` to serve the next question; `--concern` when no answer could pass the question. A question set live is ruled against the move's pass condition in `vocabulary-moves.md` or the generator's, and recorded with `record-attempt.mjs`. A helped attempt that can be ruled is ruled and recorded with `unaided: no`; `unchecked` is for an attempt that could not have settled anything.
- study, the turn after an answer: for a plain mcq, relay the `--- learner sees ---` block verbatim and say nothing else; it ends the turn. For a compound or open question, the tutor's feedback on the parts it ruled goes above the block. The three choices are in the block; the skill keeps what each choice means for the tutor, and keeps the cases variant's meaning.
- study step 4 and The record: bank questions are recorded by `answer.mjs` (tags and cases come from the bank); `record-attempt.mjs` stays for live questions, `--outcome` calls and `unchecked`.
- study: remove the slot table and "the eight slots"; replace the failure mode "Ruling on a goal whose adjudicator isn't you" with rounding up a near miss, and collapsing the two axes. Drop the judge from Depends on, add `answer.mjs`, drop `judge-input.mjs`.
- running-an-activity: the compound section (settling mcq parts is `answer.mjs`'s; the tutor rules the open parts) and "At the end of an attempt" (the tutor rules; no judge).
- review step 3 and step 4: the tutor rules; bank questions recorded with `answer.mjs --review <due goals>`, which applies the per-goal source rule, so the skill's bulleted source rule is replaced by naming the due goals; the "Ruling it yourself" failure mode goes.
- quiz step 5: "in a fresh context, as a subagent" in place of "the way `study/judge` is run".
- slots.md: seven slots; `adjudicator` gets a retired section beside `supply`'s saying who rules now (the tutor, and a program for multiple choice) and that an old `adjudicator:` line is read without complaint; its contract section and table rows go.

- [ ] **Step 1: Make the edits**, surgical, one file at a time.
- [ ] **Step 2: Run the three authoring checks** on study/SKILL.md, running-an-activity.md and review/SKILL.md, and write the result of each check for each file in the report.
- [ ] **Step 3: Verify** `grep -rn "study/judge\|judge-input\|adjudicator:" workflows` returns only lines that describe the retired slot in slots.md. `grep -nP '\x{2013}|\x{2014}'` over every edited file returns nothing.
- [ ] **Step 4: Run the full suite** (some tests read skill files). Expected: all pass.
- [ ] **Step 5: Commit** `Skills: the tutor rules in study and review, answer.mjs records`.

### Task 7: Update `learn.bpmn`

**Files:**
- Modify: `workflows/learn/learn.bpmn:959-960,1300-1301`

Follow `workflows/diagram/skills/workflow-diagram/SKILL.md`. `S_judge` and `R_judge` keep their ids, shapes and flows; their names become `Rule on unaided, and on the criterion&#10;the tutor, or a program for multiple choice` and their documentation says: a program rules multiple choice against the bank's key in `answer.mjs`; the tutor rules everything else in session against the key and criterion `next-item.mjs --key` prints, and states unaided on every attempt. Review's says the same, recorded with `answer.mjs --review`.

- [ ] **Step 1: Edit** the two tasks.
- [ ] **Step 2: Validate:** `node workflows/diagram/tools/check-di.mjs workflows/learn/learn.bpmn` and `node workflows/diagram/tools/node_modules/.bin/bpmnlint -c workflows/diagram/.bpmnlintrc workflows/learn/learn.bpmn`. Expected: both clean (if node_modules is missing, report that rather than installing).
- [ ] **Step 3: Commit** `learn.bpmn: the tutor rules, and a program for multiple choice`.

### Task 8: Timing rerun (Paul, in Codex)

Not for a subagent. After the branch review, hand Paul: open a Codex project whose folder holds the test install (`~/Documents/si212-test`), start a new chat, study `understanding-workflows-2026-10` setup-top for a few mcq questions and one open question. Then time each turn with `/private/tmp/claude-502/-Users-presnick-Documents-Documents-code--worktrees-course-materials-tutor-speed/ca88223c-e39e-4e4d-b678-617e7ab969c4/scratchpad/timeline.py` on the new rollout file and report the measured times against the 37.3 s baseline. The test install needs this branch's course-materials, which means a local checkout there of `tutor-speed`, not a push.
