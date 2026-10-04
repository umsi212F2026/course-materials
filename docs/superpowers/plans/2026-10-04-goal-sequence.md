# Goal Sequence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read a `## Sequence` section from goals.md, report it in survey, choose the next goal from it, and teach the template and skills to use it.

**Architecture:** `lib/topic.mjs` parses the section and resolves each goal's set (goal id, then capability slug, then group); `surveyTopic` adds a `sequence` block and `idProblems` its problems. A new `next-goal.mjs` picks a random open goal from the current set. The goals template ships a starting section; study, goal-setting and the student guide follow.

**Tech Stack:** Node 22 ES modules, no dependencies; `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-04-goal-sequence-design.md`

## Global Constraints

- No em dashes or en dashes (U+2014, U+2013) in any new or changed line; replace any on a line you change.
- Surgical edits only.
- Match the dense, reasoned comment style of `workflows/learn/tools/`.
- Section heading exactly `## Sequence`, after `## Goals`; one numbered line per set (`1. a, b, c`); items comma-separated, backticks allowed and stripped.
- Default order when the section is absent: `orientation`, `vocabulary`, `capabilities`, then any other group in order of first appearance among the goals.
- Messages, exactly: `Sequence names <item>, which is no group, capability or goal`; `Sequence lists <goal-id> in two sets`; `<goal-id> is in no set in the Sequence`; report line `sequence: not decided yet`.
- Test command: `node --test 'workflows/*/tools/test/*.test.mjs'`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- A topic with no Sequence section (every real topic today): no new problem, `decided: false`, the default order, unchanged `--report` apart from the one `sequence:` line. (Task 1)
- A Sequence item matching both a group and a capability slug of the same name: one rule decides (goal id, then slug, then group, for a goal; for the item itself, it simply matches whatever has that name). (Task 1)
- `new-word.mjs` adding a word to a topic whose Sequence follows Goals: the entry lands in Goals, not in Sequence. (Task 1)
- `next-goal.mjs` when the current set's only open goals are deferred: it moves to the next set rather than exiting 2. (Task 2)

---

### Task 1: Parse, resolve and report the sequence

**Files:**
- Modify: `workflows/learn/tools/lib/topic.mjs` (a `readSequence(dir, goals)` export; `surveyTopic`; `idProblems`)
- Modify: `workflows/learn/tools/survey.mjs` (`--report` prints `  sequence: not decided yet` under the topic heading when undecided)
- Test: `workflows/learn/tools/test/sequence.test.mjs`

**Interfaces:**
- `readSequence(dir, goals) -> { decided: boolean, sets: string[][], problems: string[] }`: `sets[i]` is the goal ids in set `i`, in goals.md order. Resolution per goal: the set listing its id, else the set listing its `capability`, else the first set listing its `group`. Problems as in Global Constraints. When `decided` is false, `sets` is the default order (one set per group, empty sets dropped) and `problems` is empty.
- `surveyTopic(dir)` adds `sequence: { decided, sets: [{ goals: [{ id, state }] }], current }`; `state` from the row: `retired` if retired, else `deferred` if deferred, else `met` if met, else `open`; `current` is the index of the first set with an `open` goal, or `null`.
- `idProblems` adds `readSequence`'s problems.

- [ ] **Step 1: Failing tests:**
  - no section: `decided` false; sets are orientation, vocabulary, capabilities, then a fourth group;
  - the spec's example section with goals in each group plus `c-weigh-sleep` and `w-lock-in`: `c-weigh-sleep` in set 2, `w-lock-in` in set 4, other words in set 2, other capabilities in set 3;
  - a capability slug listed in set 1 puts all its parts there, and a goal id in another set beats the slug;
  - a word appended later with `new-word.mjs` lands in its group's set, and its entry is in the Goals section (the Sequence section is unchanged);
  - each problem message; a goal in no set; `current` skips sets whose goals are all met, deferred or retired, and is `null` when nothing is open;
  - `--report` prints `sequence: not decided yet` only when undecided.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, reusing `section()` with a `## Sequence` heading pattern.
- [ ] **Step 4: Run all tests**, then read-only `node workflows/learn/tools/survey.mjs --dir /Users/presnick/Documents/Documents/code/2026/learning-topics --report`: no new problems, one `sequence: not decided yet` line per topic.
- [ ] **Step 5: Commit.** "Read the goal sequence and report it in survey"

---

### Task 2: `next-goal.mjs`

**Files:**
- Create: `workflows/learn/tools/next-goal.mjs`
- Test: `workflows/learn/tools/test/next-goal.test.mjs`

**Interfaces:**
- CLI: `node workflows/learn/tools/next-goal.mjs <topic-folder>`, flags checked as in `record-status.mjs`. Uses `surveyTopic(dir).sequence`; picks uniformly at random (`Math.random`) among the `open` goals of set `current`; prints `goal: <id>` and `set: <n> of <total>` (1-based), plus `sequence: not decided yet` when undecided; exits 2 with `nothing open in <topic>` on stderr when `current` is null.

- [ ] **Step 1: Failing tests:** chooses only from the current set; never a met, deferred or retired goal; over 50 runs reaches every open goal of the current set; moves past a set whose open goals are all deferred; exit 2 when nothing is open.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, with a header comment on why the tool picks (an agent asked to pick at random does not).
- [ ] **Step 4: Run all tests.**
- [ ] **Step 5: Commit.** "Pick the next goal from the sequence"

---

### Task 3: Template, skills, guide and queue

**Files:**
- Modify: `workflows/learn/templates/goals.md`: after the Goals section, a `## Sequence` section with `1. orientation`, `2. vocabulary`, `3. capabilities`, and an HTML comment explaining items (group, capability slug, goal id), most-specific-wins, and that every goal must land in a set.
- Modify: `workflows/learn/skills/study/SKILL.md`, step 1: unless the learner names a goal, run `next-goal.mjs` and offer that goal's activities; any other goal they want, from any set, with no comment; when undecided, say so once and offer to set it (a goal-setting conversation). Add the tool to "Depends on".
- Modify: `workflows/learn/skills/goal-setting/SKILL.md`: the ORDER THE SETS move exactly as the spec's three cases.
- Modify: `workflows/learn/skills/goal-setting/references/slots.md` or the template comment (one place, not both): how a goal's set is resolved.
- Modify: `workflows/learn/guides/study/howto.md`: one paragraph: the tutor suggests what to do next from the topic's sequence, and you can always pick something else.
- Modify: `docs/superpowers/queue-learn-student-feedback.md`: item 5 done; under "Actions on the learning-topics repository", add the Sequence section to each course topic during migration (a short default, adjusted per topic).

- [ ] **Step 1: Make the edits.**
- [ ] **Step 2: Verify:** check-skills reports nothing new; no U+2014 or U+2013 on any added line; commands and messages match Tasks 1-2.
- [ ] **Step 3: Commit.** "Teach goal-setting and study the sequence"
