# Unified Banks, Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make vocabulary an ordinary activity, `a-words`, retire the `supply` slot, keep old topics working, and provide a tool that migrates a topic's banked word questions into `a-words`.

**Architecture:** The `supply` slot leaves `slots.mjs`; a `supply` line in an old goals.md is ignored. Stamped `origin: generated` entries become legacy: skipped, never reported. Words are served by the `a-words` activity (`serves: group vocabulary`) through the picker when its bank has questions for a word, and by running the five moves live otherwise. A new `migrate-words.mjs` moves banked word questions out of single-file banks into `tasks/a-words/<goal-id>.md` and `rubrics/a-words/<goal-id>.md`. The skills follow.

**Tech Stack:** Node 22 ES modules, no dependencies; `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-03-unified-banks-design.md` (sections: The `supply` slot is retired; Vocabulary; Migration).

**Scope:** this phase changes this repository only. Running the migration on the course topics in the learning-topics repository is a queued action for the instructor.

## Global Constraints

- No em dashes or en dashes (U+2014, U+2013) in any new or changed line; replace any on a line you change.
- Surgical edits only, except the files a tool writes as its job.
- Match the dense, reasoned comment style of `workflows/learn/tools/`.
- The vocabulary activity id, exactly: `a-words`. Its entry carries `- **serves:** group vocabulary`.
- A word's scenario file is named for the word's goal id: `tasks/a-words/<goal-id>.md`, so a label reads `a-words/w-schema/<question-id>`.
- Test command: `node --test 'workflows/*/tools/test/*.test.mjs'`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- An unmigrated student topic (words with `supply: vocabulary` and `a-w-*` stamps, no `a-words`): survey reports no new problems, phase is unchanged, review-due still lists due words. (Task 1)
- A topic whose only activities for words were stamps: words are still reachable (the tutor falls back to live moves), and the phase does not become `in curation` because stamps stopped counting. (Task 1)
- `migrate-words.mjs` run twice: the second run refuses or does nothing, never duplicates questions. (Task 2)
- A legacy bank file left with no questions after migration: removed with its rubric file, not left as an empty bank that `bank.mjs` reports. (Task 2)
- A word question in a legacy bank whose rubric names a goal not in the vocabulary group stays where it is. (Task 2)

---

### Task 1: Retire `supply`; legacy stamps tolerated

**Files:**
- Modify: `workflows/learn/tools/lib/slots.mjs` (remove `SUPPLIES`, the `supply` slot and `suppliesItsOwn`; `applySlots` drops a `supply` field silently, neither a slot nor payload; update the slot-count comments)
- Modify: `workflows/learn/tools/lib/topic.mjs` (`liveActivities` excludes `generated` entries; `idProblems` no longer checks stamps against supplies; `derivePhase`'s `in curation` test counts only live, non-generated entries, which `liveActivities` now gives)
- Modify: `workflows/learn/tools/review-due.mjs` (drop the `supply` field and its comment)
- Modify: `workflows/learn/tools/new-word.mjs` (stop writing `- **supply:** vocabulary`; update its comment: three slots make a word)
- Test: `workflows/learn/tools/test/supply.test.mjs`

**Interfaces:**
- `applySlots` returns no `supply` key; a written `supply:` line produces no problem and no payload entry.
- `liveActivities(dir)` = entries that are neither dropped nor `origin: generated`.
- `review-due.mjs` JSON items: `{ topic, goal, adjudicator, served, due }`.

- [ ] **Step 1: Failing tests:**
  - a goal carrying `- **supply:** vocabulary`: no `supply` key on the goal, no problem in `survey(dir).problems`, nothing in its `payload`;
  - a goal carrying `- **supply:** nonsense`: no problem either (the slot is gone);
  - an activities.md with a stamp entry (`origin: generated`, `serves`/`checks` a word): `liveActivities` excludes it; no problem about it;
  - a topic with one capability served by a curated entry plus words served only by stamps: phase is `studying`, not `in curation`;
  - `new-word.mjs` output has no `supply` line;
  - `review-due.mjs` JSON has no `supply` field (build a topic with a met word due today by writing an attempt line dated 4 days ago).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run all tests** (fix any existing test that asserted `supply`), then the read-only real-data survey: `node workflows/learn/tools/survey.mjs --dir /Users/presnick/Documents/Documents/code/2026/learning-topics --report`; expect no new problems and unchanged phases.
- [ ] **Step 5: Commit.** "Retire the supply slot; stamped entries become legacy"

---

### Task 2: `migrate-words.mjs`

**Files:**
- Create: `workflows/learn/tools/migrate-words.mjs`
- Test: `workflows/learn/tools/test/migrate-words.test.mjs`

**Interfaces:**
- CLI: `node workflows/learn/tools/migrate-words.mjs <topic-folder> [--dry-run]`. Every flag checked.
- Refuses (exit 1, writes nothing) if `tasks/a-words/` already exists.
- For each legacy single-file bank (`tasks/<name>.md` with `rubrics/<name>.md`), each question whose rubric `goal` is a goal in group `vocabulary` moves to `tasks/a-words/<goal-id>.md` and `rubrics/a-words/<goal-id>.md`:
  - task file: `# <the word, from the goal's goal line>`, a blank line, then each moved question's `### <id>` section verbatim, in source order;
  - rubric file: `# Rubric: <word>`, a blank line, then each moved question's rubric section verbatim.
- The moved sections are removed from the legacy files; everything else in them is kept byte for byte. A legacy pair left with no `###` sections is deleted.
- If activities.md has no `a-words` entry, appends one (exact text below). Removes every `origin: generated` entry whose `serves` or `checks` names only vocabulary goals.
- Removes `- **supply:** vocabulary` lines from goals.md.
- Prints a summary: questions moved per word, files removed, entries added or removed. `--dry-run` prints the same summary and writes nothing.

The `a-words` entry:

```
### `a-words`

- **serves:** group vocabulary
- **generator:** the five moves in `workflows/learn/skills/goal-setting/references/vocabulary-moves.md`, set for one word at a time from its `what it names`, `nearest confusable` and `synonyms`. Each question names that word's goal and carries its move.
- **learner does:** answers one short question about one word
- **tutor role:** examiner
- **tutor does:** sets the question as served, without rewording it or hinting; when the bank has nothing for the word, sets one move live, as vocabulary-moves.md describes
- **offer as:** not offered as a choice; a word's question is set when that word is studied or due
```

- [ ] **Step 1: Failing tests** on a fixture topic (goals: two words `w-a`, `w-b` in group vocabulary with `supply: vocabulary`, one capability `c-x`; a legacy `tasks/items.md` + `rubrics/items.md` with two `w-a` questions, one `w-b` question and one `c-x` question; activities.md with stamp entries `a-w-a`, `a-w-b` and a curated entry for `c-x`):
  - after a run: `tasks/a-words/w-a.md` holds the two `w-a` questions in order; `rubrics/a-words/w-a.md` their rubric sections; `w-b` likewise; `items.md` keeps only the `c-x` question and its header text; activities.md has the `a-words` entry, no `a-w-*` entries, and the `c-x` entry untouched; goals.md has no `supply` line;
  - `readFolderBanks` on the result gives labels `a-words/w-a/<id>` with `goals` `['w-a']` and the original `move`;
  - a second run exits 1 and changes nothing;
  - `--dry-run` writes nothing and prints the summary;
  - a legacy pair holding only word questions is deleted;
  - `survey(dir).problems` after migration contains nothing it didn't before.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, reusing the section splitting in `workflows/quiz/tools/lib/bank.mjs` where it fits (export a helper if needed). Header comment: what it moves, why scenario files are named by goal id, and that capability questions are left for curation, which places them by judgment.
- [ ] **Step 4: Run all tests.** Then, read-only, copy one real topic into the scratchpad (`cp -R /Users/presnick/Documents/Documents/code/2026/learning-topics/web-backends-2026-09 <scratchpad>/`), run the tool on the copy, and report the summary and whether `survey` on the copy shows any problems. Never run it on the real folder.
- [ ] **Step 5: Commit.** "Add a tool that moves banked word questions into a-words"

---

### Task 3: Skills and templates

**Files (each only where it describes supplies, stamps, or how words are served):**
- `workflows/learn/skills/goal-setting/references/vocabulary-moves.md`: it becomes the spec of the `a-words` generator, not a supply. The contract keeps its inputs and outputs (instruction, label, tags); the label for a live move stays `<MOVE>: <instance>`; banked questions use their path label.
- `workflows/learn/skills/goal-setting/references/slots.md`: the `supply` slot is retired (one paragraph on why, and that an old line is ignored); eight slots; remove `suppliesItsOwn` mentions.
- `workflows/learn/templates/goals.md`: the word example loses its `supply` line.
- `workflows/learn/templates/activities.md`: `origin: generated` stamps are retired; describe `a-words` with the entry text from Task 2.
- `workflows/learn/skills/curation/SKILL.md`, `curation/generate/SKILL.md`, `curation/verify/SKILL.md`, `curation/critique/SKILL.md`: remove the stamping step; curation writes the `a-words` entry when the topic has words and none exists; legacy stamps are left alone (study ignores them) and removed when `migrate-words.mjs` runs.
- `workflows/learn/skills/study/SKILL.md` and `study/references/running-an-activity.md`: a word is studied through `a-words`: `next-item.mjs <topic> --goal <word-id>`; exit 2 means set one move live from vocabulary-moves.md. No `supply` talk remains.
- `workflows/learn/skills/review/SKILL.md`: same for a due word (`--goal`); it no longer reads `supply` from review-due.
- `workflows/learn/skills/study/judge/SKILL.md`, `workflows/learn/skills/add-topic/SKILL.md`, `workflows/learn/skills/topic/SKILL.md`, `workflows/learn/skills/goal-setting/SKILL.md`, `workflows/learn/skills/goal-setting/critique/SKILL.md`, `workflows/quiz/skills/quiz/SKILL.md`: remove or reword mentions of supplies and stamps.
- `docs/superpowers/queue-learn-student-feedback.md`: under "Actions on the learning-topics repository", add: run `migrate-words.mjs` on each course topic (dry run first), then place each topic's remaining capability questions from `items.md` into the activity whose generator would produce them, during that topic's next curation.

- [ ] **Step 1: Make the edits.**
- [ ] **Step 2: Verify:** `grep -rn -E "supply|suppliesItsOwn|origin: generated" workflows/learn/skills workflows/learn/templates workflows/quiz/skills` shows only intended historical or legacy mentions (list each in the report with why it stays); no U+2014 or U+2013 on any added line; `node workflows/develop/tools/check-skills.mjs` reports nothing new.
- [ ] **Step 3: Commit.** "Teach the skills that words are an ordinary activity"
