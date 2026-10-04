# Progress View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `progress.mjs` tool that draws a topic's sequence of sets as ASCII text (full view and one-set line) and as JSON, and a study skill that shows it at the start of a session and after each attempt.

**Architecture:** A pure function builds the view's data from `surveyTopic(dir)`; two renderers (text and one-set line) and `--json` print it. Study calls the tool; nothing new is stored.

**Tech Stack:** Node 22 ES modules, no dependencies; `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-04-progress-view-design.md`

## Global Constraints

- Output is ASCII only. Marks exactly: `#` met, `~` tried, `.` not started, `>` deferred; legend exactly ` # met  ~ tried  . not started  > deferred`; current-set marker `<- next`; header separator ` - `.
- Header variants exactly: `<topic> - set <n> of <total> is next`, `<topic> - every set is done`, and, when undecided, `<topic> - sequence not decided yet - set <n> of <total> is next` (or `... - every set is done`).
- One-set line exactly as the spec: `<label>  <marks>  <met>/<total>   (set <n> of <total>)`, with `; set <c> is still next` inside the parentheses when `n` is not the current set.
- No em dashes or en dashes in any new or changed line. Surgical edits only. Match the comment style of `workflows/learn/tools/`.
- Test command: `node --test 'workflows/*/tools/test/*.test.mjs'`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- A real topic with no Sequence section: full view draws the default order, header says not decided, no crash. (Task 1)
- A set whose goals are all retired: drawn with no marks and `0/0`, never `<- next`. (Task 1)
- A set with only deferred goals left: not current (matches `next-goal`'s rule). (Task 1)
- Columns line up when labels differ in length (`Orientation` vs `Words` vs `Set 4`). (Task 1)

---

### Task 1: `progress.mjs`

**Files:**
- Create: `workflows/learn/tools/progress.mjs`
- Create: `workflows/learn/tools/lib/progress.mjs` (pure: `buildProgress(survey) -> view`, `renderFull(view) -> string`, `renderSet(view, n) -> string`)
- Test: `workflows/learn/tools/test/progress.test.mjs`

**Interfaces:**
- `buildProgress(s)` from `surveyTopic(dir)`: `{ topic, decided, current, sets: [{ number, label, met, total, goals: [{ id, state, mark, capability, where }] }], next: [{ name, tried }], deferred: [{ id, where }] }`. `state`: `met` (row met), `deferred`, `tried` (attempts > 0, not met), `open`; retired goals omitted. Goals within a set ordered met, tried, open, deferred (goals.md order within each). `current` is 1-based, the first set with a goal that is neither met nor deferred, else null (same rule as `next-goal.mjs` without skips). `label`: `Orientation`, `Words` (vocabulary), `Capabilities`, a single other group title-cased, or `Set <n>` for mixed groups. `next`: the current set's non-met, non-deferred goals, tried first, a split capability collapsed to one entry `{ name: '<slug> <met>/<total>', tried }`.
- `renderFull(view)`: header, blank line, one row per set (`' ' + number + ' ' + label padded to the longest label + '  ' + marks padded to the longest marks + '  ' + met/total`, plus `'   <- next'` on the current set), blank line, `' Next set: '` with up to six names joined by `', '` (tried ones suffixed ` (tried)`), then `, ...` if more, then `  (<id> deferred: <where>, ...)` if any; wrapped at about 96 columns with a one-space indent; omitted when `current` is null; blank line; legend.
- `renderSet(view, n)`: the one-set line.
- CLI: `node workflows/learn/tools/progress.mjs <topic-folder> [--json] [--set <n>]`; flags checked as in `record-status.mjs`; `--set` out of range is exit 1.

- [ ] **Step 1: Failing tests** (pure functions on hand-built survey objects, plus a CLI test on a `makeTopic` fixture): marks and order; retired omitted from marks and counts; each label; header variants; `<- next` on the current set only; a set of only deferred goals is not current; the next-set line (tried first, capability collapsed with fraction, six-name truncation with `...`, deferred in parentheses); `renderSet` for the current and a later set; `--json` keys; every output character is ASCII (`/^[\x00-\x7F]*$/`); column alignment with labels of different lengths.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run all tests**, then read-only: `node workflows/learn/tools/progress.mjs /Users/presnick/Documents/Documents/code/2026/learning-topics/web-backends-2026-09` prints a not-decided view in the default order.
- [ ] **Step 5: Commit.** "Draw a topic's progress through its sets"

---

### Task 2: Study, the guide, and the queue

**Files:**
- Modify: `workflows/learn/skills/study/SKILL.md`: **Open** shows `progress.mjs <topic>` (full view) in place of the two-or-three-line summary, then one line on where they left off; after each `record-attempt.mjs` call in the loop, show `progress.mjs <topic> --set <n>` for that goal's set, or the full view when that attempt finished its set (nothing in it left that is neither met nor deferred, which the full view's header or `current` shows). Add the tool to "Depends on".
- Modify: `workflows/learn/guides/study/howto.md`: a short paragraph explaining the view and its marks.
- Modify: `docs/superpowers/queue-learn-student-feedback.md`: item 6 done, with the commits; note that item 7 will draw `--json`.

- [ ] **Step 1: Make the edits.**
- [ ] **Step 2: Verify:** check-skills reports nothing new; no U+2014 or U+2013 on any added line; commands match Task 1.
- [ ] **Step 3: Commit.** "Show progress in study sessions"
