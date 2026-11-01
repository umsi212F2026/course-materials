# Scenario Framing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A drawn question never carries framing for a run of questions, study introduces a run once, and every existing scenario file is migrated to the new format.

**Architecture:** `bank.mjs` splits a scenario's top part at a `## Framing` line into `setup` and `framing`, keeps `prompt` framing-free, and reports breaches of the rule as bank problems. `next-item.mjs` prints the framing only before the first question of a scenario in study. The curation skills state the rule. Then a separate `learning-topics` worktree migrates the banks.

**Tech Stack:** Node ESM (`.mjs`), `node:test`, Markdown skills. Node is at `/opt/homebrew/bin/node` (not on the agent's PATH).

**Spec:** `docs/superpowers/specs/2026-10-27-scenario-framing-design.md`

## Global Constraints

- Run the suite from the repo root: `/opt/homebrew/bin/node --test 'workflows/*/tools/test/*.test.mjs'`. Baseline on this branch: 282 pass, 0 fail.
- The marker is a top-part line equal to `## Framing` after trimming trailing whitespace.
- Every framing problem string ends with exactly ` (framing rule)`.
- No student is named in any file, commit or message, in either repository. Both are public.
- No em dash or en dash anywhere, nor their HTML entities. Scan with `grep -nP '\x{2014}|\x{2013}|&[mn]dash;'`.
- Surgical edits only (Edit, or a one-line `sed`); never rewrite an existing file whole.
- Match the surrounding code: 2-space indent, the file's existing quote style, capitalised-lead comments in the style of `bank.mjs`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `learning-topics` is never authored in `../learning-topics` itself; only in its worktree. Nothing is pushed without Paul's go-ahead.

## Review Focus

1. **A near-miss marker** (`## framing`, `## Framing:`, `##Framing`, or any other `##` line in a folder top part) would otherwise show in every draw. It is reported as a problem. Test in Task 2.
2. **CRLF or trailing spaces** on the marker line (`## Framing \r`) still count as the marker. Test in Task 1.
3. **A top part that is only framing** (no scenario text) gives `setup` `''` and a prompt that is the question body alone. Test in Task 1.
4. **`--after` naming a label from another topic, or one with no `/`**, is treated as a different scenario, so the framing is printed. Test in Task 3.
5. **An mcq in a framed scenario** prints the framing, then the prompt, then the numbered choices, and `--key` still prints the key after all of it. Test in Task 3.

---

## Phase A: course-materials (this worktree, branch `scenario-framing`)

### Task 1: Split the top part into setup and framing

**Files:**
- Modify: `workflows/quiz/tools/lib/bank.mjs:34-44` (header comment), `:331-345` (`topPart`), `:383`, `:401`, `:410`
- Test: `workflows/quiz/tools/test/bank.test.mjs`

**Interfaces:**
- Produces: `scenarioParts(text: string) -> { setup: string, framing: string, markers: number, nearMisses: string[] }` (not exported unless a test needs it). `setup` is what `topPart` returns today but stops at the first marker; `framing` is the text after it up to the first `###`, trimmed; `markers` counts marker lines in the top part (a second marker line stays in the framing text); `nearMisses` lists every other `## ` line in the top part, verbatim. Every folder item gains `framing: string`; `setup` and `prompt` exclude it.

- [ ] **Step 1: Write the failing tests** in `bank.test.mjs`, using the file's `source()` helper and a rubric with `q1`/`q2` entries:
  - `"## Framing splits the top part: setup and prompt carry no framing"`: top part `"The app: Crumbs.\n\n## Framing\n\nEach question is a separate decision.\n"`; assert `item.setup === "The app: Crumbs."`, `item.framing === "Each question is a separate decision."`, `!item.prompt.includes("Framing")`, `!item.prompt.includes("separate decision")`, `item.prompt.endsWith(<q1 body>)`.
  - `"a file with no marker has empty framing and reads as before"`: `CRUMBS_TASK`; `framing === ""`, `setup === "The app: Crumbs."`.
  - `"the marker tolerates trailing spaces and CRLF"`: marker line `"## Framing  \r"`; `framing` is the text under it, `setup` excludes it.
  - `"a top part that is only framing leaves setup empty"`: `"## Framing\n\nEach question...\n\n### q1\n\nName it.\n"`; `setup === ""`, `prompt === "Name it."`.

- [ ] **Step 2: Run them and see them fail**

Run: `/opt/homebrew/bin/node --test workflows/quiz/tools/test/bank.test.mjs`
Expected: the four new tests FAIL (`framing` undefined, setup includes the framing).

- [ ] **Step 3: Implement `scenarioParts`** next to `topPart`, with the same title rule as `topPart`. Use it for `tasks/` files at line 383 (`const { setup, framing } = scenarioParts(taskText)`), add `framing` to `common` at line 410, and keep `prompt` built from `setup`. `topPart` stays as it is for the rubric key. Add a paragraph to the header's TWO LAYOUTS comment describing the marker and the three fields, and that `prompt` never carries framing.

- [ ] **Step 4: Run the bank tests and then the whole suite**

Run: `/opt/homebrew/bin/node --test 'workflows/*/tools/test/*.test.mjs'`
Expected: 286 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add workflows/quiz/tools/lib/bank.mjs workflows/quiz/tools/test/bank.test.mjs
git commit -m "A scenario's framing is read apart from its setup and kept out of every prompt"
```

### Task 2: Report breaches of the framing rule

**Files:**
- Modify: `workflows/quiz/tools/lib/bank.mjs` (inside `readFolderBanks`, plus module-level patterns)
- Modify: `workflows/quiz/tools/test/pool.test.mjs:263`
- Test: `workflows/quiz/tools/test/bank.test.mjs`

**Interfaces:**
- Consumes: `scenarioParts` from Task 1.
- Produces: problem strings, each ending ` (framing rule)`, in the forms below. `<scn>` is `<activity>/<scenario>`, `<label>` is `<activity>/<scenario>/<question>`. One problem per family per part, naming the first phrase matched.
  - `<scn>: the scenario part says "<phrase>", which speaks of a run of questions; move it under ## Framing (framing rule)`
  - `<scn>: the scenario part says "<phrase>", which says how to answer; put it in each question (framing rule)`
  - `<scn>: the framing says "<phrase>", which says how to answer; put it in each question (framing rule)`
  - `<scn>: ## Framing has nothing under it (framing rule)`
  - `<scn>: ## Framing appears <n> times; only the first is the marker (framing rule)`
  - `<scn>: "<line>" is not the marker; write it exactly as ## Framing (framing rule)` (one per near miss)
  - `<scn>: main-bank has no framing (framing rule)`
  - `<scn>: rubrics/<activity>/<file> has a ## Framing line; a key has no framing (framing rule)`
  - `<label>: ## Framing in a question is not a marker; it belongs in the top part (framing rule)`
  - `<label>: says "answer only", which overrides how to answer; say it in this question alone (framing rule)`

**Patterns (case-insensitive), copied from the spec:**
- Run phrases, matched against the scenario part only: `\beach question\b`, `\bquestions below\b`, `\bthe questions follow\b`, `\banswer each\b`, `\bwhere a question asks\b`, and a paragraph (split on blank lines) containing both `\bsome\b` and `\bothers\b` (report the phrase as `some ... others`).
- Answering instructions, matched against the scenario part and the framing: `\banswer in\b`, and `\bin (a|one|two|three|four|five)\b[^.?!\n]*\bsentences?\b`.
- In a question body: `\banswer only\b`, and a line `^## Framing\s*$`.

- [ ] **Step 1: Write the failing tests**, one per problem form above, each asserting the exact string with `problems.includes(...)` and that the item is still in `items`. Also:
  - `"run phrases under ## Framing are not problems"`: framing `"Each question is a different change."` gives no problem.
  - `"an answering instruction in a question is not a problem"`: q1 body ends `"Answer in two or three sentences."`; `problems` is `[]`.
  - `"## framing in lower case is a near miss"` (Review Focus 1).

- [ ] **Step 2: Run them and see them fail**

Run: `/opt/homebrew/bin/node --test workflows/quiz/tools/test/bank.test.mjs`
Expected: the new tests FAIL; the Task 1 tests still pass.

- [ ] **Step 3: Implement the checks** in `readFolderBanks`, after each file's top part is split and as each question is read. Patterns are module-level constants with a comment in the file's style saying why the framing is exempt from run phrases. Problems are pushed and nothing is `continue`d past: the item is still served.

- [ ] **Step 4: Make the real-pool test ignore framing problems.** In `pool.test.mjs` line 263, `shape` keeps `problems: r.problems.filter((p) => !p.endsWith(" (framing rule)"))`, with a one-line comment: framing problems are new on purpose and are cleared by the learning-topics migration.

- [ ] **Step 5: Run the whole suite**

Run: `/opt/homebrew/bin/node --test 'workflows/*/tools/test/*.test.mjs'`
Expected: all pass, 0 fail; the real-pool test reports `same` for each pool it compares.

- [ ] **Step 6: Commit**

```bash
git add workflows/quiz/tools/lib/bank.mjs workflows/quiz/tools/test/bank.test.mjs workflows/quiz/tools/test/pool.test.mjs
git commit -m "Survey reports framing in a scenario part, how-to-answer outside a question, and a misplaced marker"
```

### Task 3: Study prints framing only before a scenario's first question

**Files:**
- Modify: `workflows/learn/tools/next-item.mjs:110-124`, header comment lines 1-17
- Modify: `workflows/learn/skills/study/references/running-an-activity.md:43-45`, `:75-76`
- Create: `workflows/learn/tools/test/framing.test.mjs`

**Interfaces:**
- Consumes: `item.framing`, `item.activity`, `item.scenario` from Task 1.
- Produces: next-item output where, under `--- learner sees ---`, the framing and a blank line come before `learnerText(item)` when `item.framing` is non-empty, `--review` is absent, and `flags.after` is absent or its first two `/`-separated segments differ from `item.activity` and `item.scenario`. `lib/item.mjs` is not changed.

- [ ] **Step 1: Write the failing tests** in `framing.test.mjs`, building a topic with `makeTopic` and `run` from `./helpers.mjs` (as `cases.test.mjs` does): goal `c-a`, activity `a-x` checking it, scenario `s1` with marker and framing `"Each question is a separate decision."` and questions `q1`, `q2`, `q3` (q3 an mcq with two choices), and an unframed scenario `s2` with `q1`.
  - `"no --after: the framing comes first"`: the stdout after `--- learner sees ---\n` starts with `"Each question is a separate decision.\n\n"`.
  - `"--after in the same scenario: no framing"`: `--after a-x/s1/q1`; stdout does not include `separate decision`.
  - `"--after in another scenario: the framing comes first"`: `--after a-x/s2/q1`.
  - `"--after with no slash or from another topic: the framing comes first"`: `--after q1` and `--after other-topic/x/q1` (Review Focus 4).
  - `"--review: no framing"`.
  - `"an unframed scenario prints as before"`: the learner section equals `learnerText` of that item.
  - `"an mcq: framing, prompt, then numbered choices, then the key"` with `--key` (Review Focus 5).

  The picker decides which question is served; write the fixture so the served label is the one each assertion needs, and assert the `label:` line too.

- [ ] **Step 2: Run them and see them fail**

Run: `/opt/homebrew/bin/node --test workflows/learn/tools/test/framing.test.mjs`
Expected: the framing-first tests FAIL; the no-framing ones may already pass.

- [ ] **Step 3: Implement it** in `next-item.mjs` where `lines` is built, with a capitalised-lead comment saying the script decides, not the tutor, and why the judge never gets it (`learnerText` is unchanged). Add one line to the header comment.

- [ ] **Step 4: Edit `running-an-activity.md`.** After "can't scroll back to a setup you showed once." (line 45) add: "The one exception is a scenario's framing, which introduces a run of questions: `next-item` prints it above the first question it serves from a scenario and not above the rest, and you show it where it is printed and nowhere else, never carrying it into a later question." At lines 75-76, after "its setup in full above every question.", add: "If the run needs framing, give it once, before the first question, and put how to answer in each question, never in the setup."

- [ ] **Step 5: Run the whole suite**

Run: `/opt/homebrew/bin/node --test 'workflows/*/tools/test/*.test.mjs'`
Expected: all pass, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add workflows/learn/tools/next-item.mjs workflows/learn/tools/test/framing.test.mjs workflows/learn/skills/study/references/running-an-activity.md
git commit -m "Study shows a scenario's framing above its first question only"
```

### Task 4: The curation skills state the rule

**Files:**
- Modify: `workflows/learn/skills/curation/draft-bank/SKILL.md:75-97`, `:134-136`, `:161-165`
- Modify: `workflows/learn/skills/curation/bank-check/SKILL.md:3` (description), `:62-96` (checks), `:103-104` (scenario mark)

- [ ] **Step 1: draft-bank.** Make these edits, worded as the spec's _Curation_ section says:
  - The format paragraph (75-77): describe the `tasks/` top part as the scenario, then optionally `## Framing`, and say `rubrics/` top parts are keys only.
  - The `crumbs` example: add `\n## Framing\n\nEach question is a separate decision Crumbs faces.\n` after its scenario paragraph.
  - A new rule after the `main-bank` rule: what framing is for, the two things it never carries, and the author's test (read each question under the scenario alone).
  - The `main-bank` rule: its empty top part includes framing.
  - Lines 161-165: "goes in each question, in every scenario", keeping the sentence on what the learner may have open.

- [ ] **Step 2: bank-check.**
  - Line 65: "the scenario's setup (its top part above any `## Framing`), its framing if it has one".
  - Rename "Every question, six checks" to "eight checks". Add check 7 (stands alone when drawn) and check 8 (wording fits the key), with the findings and marks from the spec.
  - Under `scenario`: add "framing that carries a fact or says how to answer, or a scenario part that speaks of the run or says how to answer".
  - Description (line 3): add "each question complete when drawn alone, without its scenario's framing, and worded to admit the answer its key gives".

- [ ] **Step 3: Check the skills and scan for dashes**

Run: `/opt/homebrew/bin/node workflows/develop/tools/check-skills.mjs`
Expected: no new errors compared with running it before the edits.
Run: `git diff -U0 | grep -nP '\x{2014}|\x{2013}|&[mn]dash;'`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add workflows/learn/skills/curation/draft-bank/SKILL.md workflows/learn/skills/curation/bank-check/SKILL.md
git commit -m "Curation: framing introduces a run, and how to answer lives in each question"
```

### Task 5: Hand Phase A over

- [ ] **Step 1: Run the whole suite** and record the count. Expected: all pass, 0 fail.
- [ ] **Step 2: Record the live problem count.** Run `readFolderBanks` across every topic under `../learning-topics` with a scratch script and record how many problems end ` (framing rule)`, per topic. This is the migration's starting list.
- [ ] **Step 3: Stop and report to Paul.** The branch goes to `main` by his `/land` and push from the master session. Phase B starts only once it is on `main` and pushed.

---

## Phase B: learning-topics migration (worktree `learning-topics-scenario-framing`)

Scratch scripts go in this session's scratchpad, never in either repository. Each imports `readFolderBanks` from this worktree's `workflows/quiz/tools/lib/bank.mjs` by absolute path.

### Task 6: Worktree, baseline dump and inventory

- [ ] **Step 1: Check the other open learning-topics worktrees** (`learning-topics-understanding-workflows`, `learning-topics-workflow-design`) with `git -C <wt> diff --stat main...` and `git -C <wt> status --short`. Report any `tasks/` file they also touch to Paul before going on.
- [ ] **Step 2: Create the worktree**: `git -C /Users/presnick/Documents/Documents/code/2026/learning-topics worktree add ~/Documents/Documents/code/.worktrees/learning-topics-scenario-framing -b topic/scenario-framing`. Tell Paul to open it in its own window.
- [ ] **Step 3: Write `dump-draws.mjs <topics-dir> <out-dir>`** in the scratchpad. For each topic folder, it writes `<out-dir>/<topic>.txt` holding every folder item as `=== <label>\n` and then `prompt`, with an mcq's choices numbered after it. It also writes `<out-dir>/labels.txt` with every label, one per line, in reader order.
- [ ] **Step 4: Dump the baseline** from `../learning-topics` (main) into `<scratchpad>/draws-before/`.

### Task 7: Move the a-words answering line (scripted)

- [ ] **Step 1: Write `move-words-line.mjs <topic-dir>`** in the scratchpad. For each `tasks/a-words/*.md`:
  - find a top-part line matching `^Answer in .*sentences.*$`;
  - remove it and the blank line after it;
  - append `\n\n<line>` to the end of the body of each question whose rubric `type` is not `mcq` and whose body does not already match `/answer in/i`.

  It uses `rawSections` from `bank.mjs` so every other byte is kept, and prints each file changed with how many questions received the line.
- [ ] **Step 2: Run it** on each topic in the migration worktree.
- [ ] **Step 3: Verify.** Dump into `draws-after-words/`, and check that `labels.txt` is identical to the baseline's. Then `diff -r` the two dumps. In `a-words`, each free question's prompt should only change by the line moving from top to bottom, and each mcq's prompt by losing it. Every other activity should be unchanged.
- [ ] **Step 4: Commit** in the worktree: `git add -A '*/tasks/a-words'`, then commit "a-words: how to answer moves into each free question".

### Task 8: Migrate scenario banks by hand, one topic per commit

For each topic, in this order: `deploy-pipeline-2026-10`, `sign-in-and-permissions-2026-10`, `cloud-hosting-2026-10`, `database-hosting-2026-10`, `deploy-config-2026-10`, `debug-deployed-2026-10`, `simulation-2026-10`, then any other topic Task 5's count names:

- [ ] **Step 1: Read every `tasks/<activity>/*.md`** outside `a-words`, and its activity's `generator` in `activities.md`.
- [ ] **Step 2: Edit each file** by the spec's _Migration_ method:
  - scenario stays;
  - framing moves under `## Framing` at the end of the top part, from wherever it was;
  - how to answer goes into each question, adjusted per question kind and not doubled;
  - sentences that point at the questions are rewritten to stand alone.

  The particular cases in the spec apply: `crumbs` place-plan, `lendlist`, `crumbs-on-harbor`, and `pantry-board/q1` (rewrite the question, not the key). Do not touch `rubrics/`.
- [ ] **Step 3: Edit the generator** if it tells live drafting to put run framing or a shared answering instruction in the setup.
- [ ] **Step 4: Verify the topic.** The lint shows 0 framing problems for this topic. The topic's labels match the baseline. Read the topic's dump diff and check each changed prompt reads as a complete task by itself.
- [ ] **Step 5: Commit** "<topic>: framing under ## Framing, how to answer in each question".

### Task 9: Verify the whole migration and hand it to Paul

- [ ] **Step 1:** Dump into `draws-after/`. `labels.txt` is identical to the baseline.
- [ ] **Step 2:** The lint reports 0 problems ending ` (framing rule)` across every topic.
- [ ] **Step 3:** For each touched topic, `survey.mjs` reports no new problems, and `node tools/publish-topic.mjs <topic> <worktree>` (from `course-private`) passes.
- [ ] **Step 4:** Grep the worktree diff for dashes with the pattern in Global Constraints. Expected: none.
- [ ] **Step 5:** Give Paul the path to `diff -r draws-before draws-after` as a file in the scratchpad, plus the commit list. He reads that diff to approve.
- [ ] **Step 6:** After his approval, the release follows the `course-private` AGENTS.md route, run by Paul or with his explicit go-ahead: stamp and verify each topic, merge from the `learning-topics` checkout, push, then remove the worktree and branch.
