# Unified Banks, Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the goal model a topic-level origin that goals inherit, capability slugs that group part-goals in survey, and a `serves: group <name>` form.

**Architecture:** `readGoals` reads an `**origin:**` header line and fills each goal's `origin` from it unless the goal says otherwise. A ninth slot, `capability`, carries a bare slug; survey groups a group's goals by it. `readActivities` expands `serves: group <name>` into that group's goal ids. Skill and template text follows.

**Tech Stack:** Node 22 ES modules, no dependencies; `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-03-unified-banks-design.md` (section: Goals).

**Scope change from the spec's delivery list:** retiring the `supply` slot moves to phase 3. Vocabulary is served through `supply: vocabulary` until phase 3 makes `a-words` an ordinary activity, so retiring it now would break serving words.

## Global Constraints

- No em dashes or en dashes (U+2014, U+2013) in any new or changed line.
- Surgical edits only; never rewrite an existing file.
- Match the dense, reasoned comment style of `workflows/learn/tools/`.
- Topic origin header, exactly: a line `**origin:** course` (or `learner`) between the `#` title and `## Goals`. Absent means `learner`.
- Capability slug: two to four lower-case words joined by single hyphens, no prefix (`^[a-z0-9]+(-[a-z0-9]+){1,3}$`).
- Serves group form, exactly: `group <group-name>` as one item of the `serves` list.
- Test command: `node --test 'workflows/*/tools/test/*.test.mjs'`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- A goals.md with no origin header and goals stamped `origin: course` individually (every real course topic today): each goal stays `course`. (Task 1)
- An origin header with an unknown value (`**origin:** instructor`): reported as a problem by survey, topic treated as `learner`. (Task 1)
- A capability named by only one goal: reported, since it is almost always a typo in one part's label. (Task 2)
- `serves: group nonsense` where no goal has that group: reported as a problem, not silently empty. (Task 3)
- Survey JSON consumers (learn, topic skills) still find every goal under `groups[].goals`; capability grouping adds fields, it does not move goals out of that list. (Task 2)

---

### Task 1: Topic origin, inherited by goals

**Files:**
- Modify: `workflows/learn/tools/lib/topic.mjs` (`readGoals`, `surveyTopic`, `idProblems`)
- Modify: `workflows/learn/tools/lib/slots.mjs` (the `ORIGINS` comment: origin is now set once per topic and inherited)
- Modify: `workflows/learn/tools/new-word.mjs` (stamp `- **origin:** learner` on a word added to a course topic)
- Test: `workflows/learn/tools/test/origin.test.mjs`

**Interfaces:**
- Produces: `readGoals(dir) -> { goals, origin }`, where `origin` is `'course' | 'learner'` (header value if it is one of `ORIGINS`, else `'learner'`). Each goal's `origin` is its own `origin` field when written, else the topic's. Existing callers that destructure `{ goals }` keep working.
- `surveyTopic(dir)` adds `origin` (the topic's) to its result.
- `idProblems` reports `goals.md has origin: <value>, which is not one of: learner, course` for an unknown header value.

- [ ] **Step 1: Failing tests** in `origin.test.mjs` (build goals.md text directly; `makeTopic` puts its `goals` under `## Goals`, so write the file yourself where a header is needed):
  - header `**origin:** course`, a goal with no origin line: `readGoals(dir).origin === 'course'`, the goal's `origin === 'course'`;
  - same header, a goal with `- **origin:** learner`: that goal is `learner`;
  - no header, a goal with `- **origin:** course`: the goal is `course`, topic origin `learner`;
  - no header, no goal origin: both `learner`;
  - header `**origin:** instructor`: topic origin `learner`, and `survey(dir).problems` includes the message above;
  - `new-word.mjs` on a course topic (read its usage for arguments): the new entry contains `- **origin:** learner`; on a learner topic it does not.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Parse the header from the text before the `## Goals` heading with `/^\*\*origin:\*\*\s*(\S+)\s*$/m`. Inheritance happens in `readGoals` after `applySlots`, using whether the entry's fields carried `origin`.
- [ ] **Step 4: Run all tests.** Then, read-only, `node workflows/learn/tools/survey.mjs --dir /Users/presnick/Documents/Documents/code/2026/learning-topics` and confirm no new problems.
- [ ] **Step 5: Commit.** "Read a topic-level origin that goals inherit"

---

### Task 2: Capability slugs, grouped in survey

**Files:**
- Modify: `workflows/learn/tools/lib/slots.mjs` (a ninth slot `capability: { default: '', values: null, kind: 'data' }`, with a comment)
- Modify: `workflows/learn/tools/lib/topic.mjs` (rows carry `capability`; `groupRows` adds `capabilities`; `idProblems` checks slugs)
- Modify: `workflows/learn/tools/survey.mjs` (`--report` prints parts under their capability)
- Test: `workflows/learn/tools/test/capability.test.mjs`

**Interfaces:**
- Each survey row gains `capability: string` (`''` when none).
- Each group in `groups` gains `capabilities: [{ slug, met, total }]`, in order of first appearance, counting only non-retired goals, same rule as the group fraction. `goals` keeps every goal, in the existing order rule (unmet, deferred, met, retired), so nothing that reads `goals` changes.
- `--report`: within a group, goals without a capability print as now. Goals with one print after them, under a line `    <slug> <met>/<total>`, each indented two more spaces than an ordinary goal line, keeping the group's order rule within each capability.
- `idProblems`: `<goal-id> has capability <slug>, which isn't a slug (two to four lower-case words with hyphens)`; and `capability <slug> has only one part (<goal-id>)`.

- [ ] **Step 1: Failing tests:**
  - three goals with `- **capability:** weigh-hosting-plans` and one plain goal, one part passed: the default group's `capabilities` deep-equals `[{ slug: 'weigh-hosting-plans', met: 1, total: 3 }]`; every goal is still in `goals`;
  - a retired part leaves both halves of its capability's fraction;
  - `--report` output contains `weigh-hosting-plans 1/3`, and the parts' lines appear after it;
  - `- **capability:** Weigh_Plans` gives the slug problem; a capability on one goal gives the one-part problem.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run all tests.** Then the read-only real-data survey, confirming no new problems and unchanged output (no real topic uses `capability` yet).
- [ ] **Step 5: Commit.** "Group part-goals under a capability slug"

---

### Task 3: `serves: group <name>`

**Files:**
- Modify: `workflows/learn/tools/lib/topic.mjs` (`readActivities`, `idProblems`)
- Test: `workflows/learn/tools/test/serves.test.mjs`

**Interfaces:**
- `readActivities(dir)` expands a `serves` item `group <name>` into the ids of every goal whose `group` is `<name>`, in goals.md order, so `entry.serves` stays a list of goal ids. It also returns `servesGroups: string[]`, the group names written, for problem reporting. `all` is unchanged.
- `idProblems`: `<activity-id> serves group <name>, which no goal is in`.

- [ ] **Step 1: Failing tests:**
  - goals `w-a`, `w-b` in group `vocabulary` and `c-x` in the default group; an entry `serves: group vocabulary`: `serves` deep-equals `['w-a','w-b']`;
  - a word added afterwards (append a third `w-c` entry): `serves` now includes it with no edit to activities.md;
  - `serves: c-x, group vocabulary` mixes both;
  - `serves: group nonsense` gives the problem, and no "is not in goals.md" problem for the token itself.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** `readActivities` reads goals with `readGoals(dir)`.
- [ ] **Step 4: Run all tests.**
- [ ] **Step 5: Commit.** "Let an activity serve a whole group"

---

### Task 4: Templates and skill text

**Files:**
- Modify: `workflows/learn/templates/goals.md` (the origin header line, with a comment that only course topics carry it and goals inherit it; the `capability` slot, in the Goals comment)
- Modify: `workflows/learn/templates/activities.md` (the `serves` field's comment: `group <name>` is allowed)
- Modify: `workflows/learn/skills/goal-setting/references/slots.md` (nine slots; `origin` inherited from the topic, with goals a student adds to a course topic stamped `learner`; the `capability` slot)
- Modify: `workflows/learn/skills/goal-setting/SKILL.md`:
  - PUSH BACK ON SCOPE counts capabilities, with an unlabelled goal counting as one;
  - a new move, SPLIT INTO PARTS: when checking a criterion would need one very long question, split the capability into part-goals sharing a `capability:` slug, each with its own criterion;
  - when adding a goal to a course topic, write `- **origin:** learner` on it.
- Modify: `workflows/learn/skills/topic/SKILL.md` and `workflows/learn/guides/learn/howto.md`, only where they describe survey's output: parts are listed under their capability with a fraction.

- [ ] **Step 1: Make the edits.**
- [ ] **Step 2: Verify.** No U+2014 or U+2013 character on any added line of `git diff -U0`, and `node workflows/develop/tools/check-skills.mjs` reports nothing new.
- [ ] **Step 3: Commit.** "Document topic origin, capabilities and group serving"
