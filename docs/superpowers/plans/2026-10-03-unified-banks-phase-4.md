# Unified Banks, Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One curation process for course topics: the instructor reviews each generator with a sample scenario, then reviews the bank it drafts; students' own topics keep live generators.

**Architecture:** Survey learns to report bank problems, so curation and the bank check have a mechanical floor. The curation skill gains the course path with two instructor stops, a drafting sub-skill and a bank-check sub-skill; the activities template drops the fields the bank folders make redundant. The learn diagram's curation lane follows.

**Tech Stack:** Node 22 ES modules, no dependencies; `node:test`. Markdown skills. BPMN.

**Spec:** `docs/superpowers/specs/2026-10-03-unified-banks-design.md` (sections: Activities and banks; Curation; Migration).

**Decisions made for this phase (also in the rulings file):**
- **Course path only when the instructor runs it.** Curation drafts banks and stops for review only when the topic's origin is `course` and curation is run interactively by the instructor. A background run (spawned by `learn`), on any topic, writes activities only; generators run live.
- **`checks` stays as the generator's declaration.** The spec's "generator declares its goals" is the existing `checks` field, re-documented as: the goals this activity's questions can establish. A rubric's `goal:` line names which of those each question bears on. No new field.
- **`kind` and `bank:` are retired.** Every activity with questions has a generator; it has a bank when `tasks/<activity-id>/` exists. A check that used to be a single authored instance is a bank with one scenario. Old `kind:` and `bank:` lines are ignored.
- **Bank size:** about today's: roughly three questions per goal an activity names, unless its entry says otherwise.

## Global Constraints

- No em dashes or en dashes (U+2014, U+2013) in any new or changed line; replace any on a line you change.
- Surgical edits only.
- Match each file's voice and comment style.
- Bank layout and labels exactly as the spec: `tasks/<activity-id>/<scenario-id>.md`, `rubrics/<activity-id>/<scenario-id>.md`, label `<activity-id>/<scenario-id>/<question-id>`, reserved scenario `main-bank`.
- A multi-goal question's `credit:` lists one statement per goal, each starting with the goal id in backticks followed by a colon.
- Test command: `node --test 'workflows/*/tools/test/*.test.mjs'`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- A real course topic today (single-file banks, no folders): survey reports no new problems. (Task 1)
- A multi-goal question whose credit names only some of its goals: reported, naming the missing goal. (Task 1)
- A background curation run on a course topic in a student's clone: drafts nothing and never waits for an instructor. (Task 2)
- An old entry with `kind: bank` and `bank: tasks/...`: verify does not reject it; the fields are ignored. (Task 2)

---

### Task 1: Survey reports bank problems

**Files:**
- Modify: `workflows/learn/tools/lib/topic.mjs` (`idProblems`)
- Test: `workflows/learn/tools/test/bank-problems.test.mjs`

**Interfaces:**
- `idProblems` adds, for folder banks only (single-file banks are unchanged):
  - every problem `readFolderBanks(dir)` returns, verbatim;
  - `<label> names goal <id>, which is not in goals.md`;
  - `<label> names goals <a>, <b> but its credit has no statement for <b>` when a question names two or more goals and its rubric's credit lacks a line starting with that goal id in backticks followed by a colon (match `` `<id>`: `` anywhere in the credit text).

- [ ] **Step 1: Failing tests:** a folder bank whose rubric problem `readFolderBanks` reports (a question with no rubric entry) appears in `survey(dir).problems`; an unknown goal id is reported; a two-goal question with credit statements for both raises nothing; with a statement for only one, the missing goal is named; a single-goal question with plain credit raises nothing.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Import `readFolderBanks` from `../../../quiz/tools/lib/bank.mjs`.
- [ ] **Step 4: Run all tests**, then read-only `node workflows/learn/tools/survey.mjs --dir /Users/presnick/Documents/Documents/code/2026/learning-topics` with no new problems.
- [ ] **Step 5: Commit.** "Report bank problems in survey"

---

### Task 2: The curation skills and the activities template

**Files:**
- Modify: `workflows/learn/templates/activities.md`: retire `kind` and `bank`; re-document `checks` as the goals this activity's questions can establish (rubric `goal:` lines narrow it per question); describe the bank folders and labels, `main-bank`, per-question `tutor note`, and per-goal credit lists; the Coverage table's `checks` cell also counts activities whose bank names the goal.
- Modify: `workflows/learn/skills/curation/SKILL.md`:
  - **Who runs it decides the path.** A background run, or any run on a topic whose origin is not `course`: steps as today, no banks. An interactive run by the instructor on a course topic: the course path below.
  - **The course path**, after the existing check-and-revise steps settle the generators:
    1. **Stop 1, generators.** For each activity with a generator, `curation/draft-bank` drafts one sample scenario with its questions and rubric into the bank folders. Present each generator's text beside its sample; the instructor gives feedback in the session; revise generators as they say. A kept sample is the bank's first scenario.
    2. **Draft the banks.** One `curation/draft-bank` per activity, in parallel, to about three questions per goal the activity names.
    3. **Check the banks.** `curation/bank-check` in a fresh context, plus `survey`'s problems for the topic.
    4. **Stop 2, banks.** Present the findings; the instructor keeps or cuts scenarios and questions. A finding that is really about a generator sends that generator back to stop 1; only its scenarios are redrafted.
    5. **Land** as today (`curated` per goal).
  - **Converting older files**, on a course topic's next interactive curation: add the topic's `**origin:** course` header and remove per-goal `origin: course` stamps; run `migrate-words.mjs` (dry run first) once phase 5 has landed; place each capability question left in `items.md` into the activity whose generator would produce it, as a scenario; convert any key-file study bank (`tasks/X.md` + `tasks/X-key.md`) into the activity's folders, the key's shared lists becoming the scenario key and its cases becoming per-question rubric entries.
- Modify: `workflows/learn/skills/curation/generate/SKILL.md`: every activity with questions gets a generator that says what varies, what is fixed, how hard, and which goals its questions bear on (`checks`); no `kind`; a generator must be precise enough to draft a bank from without asking.
- Modify: `workflows/learn/skills/curation/verify/SKILL.md` and `curation/critique/SKILL.md`: drop the `kind` requirement; the critic judges whether each generator's goal mapping is right and whether a drafted scenario would test what it claims.
- Create: `workflows/learn/skills/curation/draft-bank/SKILL.md`: given one activity entry (generator, `checks`, `serves`) and the goals' criteria, write scenario files to `tasks/<activity-id>/` and `rubrics/<activity-id>/` in the exact format (scenario setup or `main-bank`; `### <question-id>` sections unique within the scenario; rubric `goal`, `answer`, `credit` with per-goal statements for multi-goal questions, `type`, `move` for words, optional `tutor note`); scenario files named for their content; questions answerable from the setup alone; nothing in a question gives its answer away. Modes: `sample` (one scenario) and `full` (to the target size, keeping existing scenarios). Writes only those folders.
- Create: `workflows/learn/skills/curation/bank-check/SKILL.md`: a fresh-context checker for one topic's banks. For every question: the answer is true of the scenario; it is answerable from the setup alone; each goal's credit statement is faithful to that goal's criterion (and present, for multi-goal questions); it does not give its answer away; mcq answers are unambiguous. Reads only; returns findings per label, each marked `question`, `scenario` or `generator` (the last sends the generator back to stop 1). Include the survey command to run first.
- Modify: `workflows/learn/skills/learn/SKILL.md` where it spawns curation in the background: say that run never drafts banks or waits for review.
- Each new skill gets a "Depends on" list; add the new skills to `curation/SKILL.md`'s.

- [ ] **Step 1: Make the edits.**
- [ ] **Step 2: Verify:** `node workflows/develop/tools/check-skills.mjs` reports nothing new; no U+2014 or U+2013 on any added line; every command and path quoted matches the tools (`next-item.mjs`, `survey.mjs`, `migrate-words.mjs`, `readFolderBanks` problems).
- [ ] **Step 3: Commit.** "Teach curation to draft and check banks for course topics"

---

### Task 3: The curation lane in the diagram

**Files:**
- Modify: `workflows/learn/learn.bpmn`

Load the conventions in `.claude/skills/workflow-diagram/SKILL.md` first.

- [ ] **Step 1:** After the existing check-and-revise loop in the curation lane, add a gateway "course topic, run by the instructor?" whose default ("no") goes on to landing as today. On "yes": a HUMAN task "Review each generator beside its sample", an AI AGENT task "Draft the banks (curation/draft-bank)", an AI AGENT task "Check the banks (curation/bank-check)", a HUMAN task "Keep or cut scenarios and questions", and a gateway "a generator at fault?" looping back to the generator review on "yes", otherwise on to landing. Documentation on each element names the skill and what it writes.
- [ ] **Step 2: Validate.** `node workflows/diagram/tools/check-di.mjs workflows/learn/learn.bpmn` and `/Users/presnick/Documents/Documents/code/2026/course-materials/workflows/diagram/tools/node_modules/.bin/bpmnlint -c workflows/diagram/.bpmnlintrc workflows/learn/learn.bpmn` both pass.
- [ ] **Step 3: Render and look** with `node /Users/presnick/Documents/Documents/code/2026/course-materials/workflows/diagram/tools/render.mjs workflows/learn/learn.bpmn <scratchpad>/curation.png <curation subprocess id>`; no label collisions.
- [ ] **Step 4: Commit.** "Draw the course curation path"
