# Goals Learned Elsewhere Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a goal be marked as taught elsewhere, deferred until done there, and recorded as completed elsewhere, with survey and the tutor aware of all three.

**Architecture:** The mark is a payload bullet in `goals.md` that only the tutor reads. Deferral is two new goal-scoped kinds in the status log, folded like `retired`/`revived`. Completion is a new attempt outcome that `met()` treats like `declared`. Survey derives a new phase, `waiting elsewhere`, from those.

**Tech Stack:** Node 22 ES modules, no dependencies. Tests with `node:test` and `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-10-02-learned-elsewhere-design.md`

## Global Constraints

- No em dashes or en dashes in any new text: prose, comments, console output, commit messages.
- Surgical edits only; never rewrite an existing file.
- Comment style in `workflows/learn/tools/`: the existing dense, reasoned block comments. New code matches it.
- New status kinds: `deferred` (goal required, `--where` required, non-empty) and `resumed` (goal required).
- New outcome: `elsewhere`. `met()` treats it exactly like `declared`.
- New phase name, exactly: `waiting elsewhere`.
- Display strings, exactly: `done elsewhere (<note>)`, or `done elsewhere` with no note; `you said so` for `declared`; `deferred: <where>` in the survey listing.
- Test command: `node --test 'workflows/learn/tools/test/*.test.mjs'` (the bare directory form fails on Node 22)

## Review Focus

- A deferred goal that later gets a passing attempt anyway: it shows as met, not deferred, and does not hold the phase at `waiting elsewhere`. (Task 4)
- A goal that is both deferred and retired: retired wins; it leaves the fraction and does not count as deferred. (Task 4)
- `--where ""`: refused like a missing `--where`. (Task 2)
- `resumed` with no earlier `deferred`: accepted silently, as `revived` is. (Task 2)
- `--outcome elsewhere` with no `--note`: accepted, shown as `done elsewhere` with no parentheses. (Task 3)

---

### Task 1: Test harness, and a regression test for `declared`

**Files:**
- Create: `workflows/learn/tools/test/helpers.mjs`
- Create: `workflows/learn/tools/test/declared.test.mjs`

**Interfaces:**
- Produces:
  - `makeTopic({ goals: string, activities?: string, status?: object[] }) -> string`: writes a topic folder under `mkdtempSync(join(tmpdir(), 'learn-test-'))` and returns its path. `goals` is the body placed under a `## Goals` heading. `status` events are written one JSON object per line to `status.jsonl`.
  - `run(script: string, args: string[]) -> { code: number, stdout: string, stderr: string }`: `spawnSync(process.execPath, ['workflows/learn/tools/' + script, ...args])` from the repo root (resolve it from `import.meta.url`).
  - `survey(dir: string) -> object`: `JSON.parse` of `run('survey.mjs', ['--dir', parent, dir]).stdout`. Check `survey.mjs`'s argument handling for the exact form a single topic takes.
  - `CAP_GOAL(id: string, extra?: string) -> string`: a minimal capability entry (`### \`<id>\``, a `goal` bullet, a `criterion` bullet, then `extra` lines).

- [ ] **Step 1: Write `declared.test.mjs`**

```js
test('declared after a miss meets the bar and schedules review in 3 days', () => {
  const dir = makeTopic({ goals: CAP_GOAL('c-read') });
  run('record-attempt.mjs', [dir, 'c-read', 'a-x/1', '--axes', '{"unaided":"yes","criterion":"not met"}']);
  const r = run('record-attempt.mjs', [dir, 'c-read', 'a-x/1', '--outcome', 'declared']);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /bar met/);
  assert.match(r.stdout, /\(3 days\)/);
});
```

- [ ] **Step 2: Run it.** `node --test 'workflows/learn/tools/test/*.test.mjs'`. Expected: PASS. This is a characterization test of existing behavior; if it fails, fix the helpers, not the tools.

- [ ] **Step 3: Commit.** `git add workflows/learn/tools/test && git commit -m "Start a test suite for the learn tools"`

---

### Task 2: `deferred` and `resumed` in the status log

**Files:**
- Modify: `workflows/learn/tools/lib/status.mjs` (`KINDS`, `appendStatus`, `foldStatus`, the shape comment at the top)
- Modify: `workflows/learn/tools/record-status.mjs` (usage comment, `USAGE`, `FLAGS`, the call to `appendStatus`, a warning)
- Test: `workflows/learn/tools/test/deferred.test.mjs`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces:
  - `KINDS.deferred = { goal: true, where: true }`, `KINDS.resumed = { goal: true }`.
  - `appendStatus(dir, kindName, { goal, needs, why, reason, where })`: `deferred` throws `deferred has to say where it will be learned.` when `where` is missing or empty; stores `event.where`.
  - `foldStatus(events)` also returns `deferredGoals: Map<goalId, where>`. `deferred` sets the entry, `resumed` deletes it. Last event wins.

- [ ] **Step 1: Write the failing tests**

```js
test('deferred without --where is refused', ...)        // code !== 0, stderr matches /say where/
test('deferred with --where "" is refused', ...)        // same
test('deferred with an unknown goal id is refused', ...) // stderr matches /is not in/
test('deferred then resumed folds to no deferral', ...)  // import foldStatus/readStatus from lib/status.mjs;
                                                          // after deferred: deferredGoals.get('c-read') === 'PS3'
                                                          // after resumed: deferredGoals.has('c-read') === false
test('resumed with no prior deferral is accepted', ...)  // code === 0, nothing written to stderr
test('deferred on a met goal warns but records', ...)    // after a passing attempt: code === 0,
                                                          // stderr matches /already met/, event is in the log
```

- [ ] **Step 2: Run them.** Expected: FAIL (`"deferred" is not a kind`).

- [ ] **Step 3: Implement.** Add both kinds to `KINDS`, the `where` check in `appendStatus` next to the `retired` reason check, and the `deferredGoals` map in `foldStatus` next to `retiredGoals`. In `record-status.mjs`, add `where` to `FLAGS` and to the usage text (`required on: deferred`), and pass it through. After the append, for `deferred`: if `met(goal, attemptsFor(dir, goalId))`, print `<goal> is already met; recorded anyway.` to stderr and exit 0.

- [ ] **Step 4: Run tests.** Expected: all PASS, including Task 1's.

- [ ] **Step 5: Commit.** "Add deferred and resumed to the status log"

---

### Task 3: The `elsewhere` outcome

**Files:**
- Modify: `workflows/learn/tools/lib/bars.mjs` (`isDeclared` and its comment, `met()`, `describeRuling`)
- Modify: `workflows/learn/tools/record-attempt.mjs` (`OUTCOMES`, `USAGE`, the header comment's outcome list)
- Modify: `workflows/learn/tools/lib/topic.mjs` (the `outcome` line in the log-shape comment)
- Test: `workflows/learn/tools/test/elsewhere.test.mjs`

**Interfaces:**
- Produces:
  - `isOwnWord(r) -> boolean`: true for `outcome` `declared` or `elsewhere`. Replaces `isDeclared` at its one use in `met()`. Keep `isDeclared` exported only if something else imports it (grep first).
  - `describeRuling(r)`: `elsewhere` returns `done elsewhere (<r.note>)`, or `done elsewhere` without a note; `declared` returns `you said so`; `abandoned` is unchanged.

- [ ] **Step 1: Write the failing tests**

```js
test('elsewhere meets the bar and schedules review in 3 days', ...)
  // run record-attempt c-read elsewhere --outcome elsewhere --note "PS3"
  // stdout matches /bar met/ and /\(3 days\)/
test('survey shows done elsewhere with the note', ...)
  // the c-read row's `last` matches /done elsewhere \(PS3\)/
test('elsewhere with no note shows no parentheses', ...)
  // `last` matches /done elsewhere$/
test('declared now shows as you said so', ...)
  // `last` matches /you said so$/
```

- [ ] **Step 2: Run them.** Expected: FAIL (`--outcome must be one of: abandoned, declared`).

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run all tests.** Expected: PASS.

- [ ] **Step 5: Commit.** "Add the elsewhere outcome"

---

### Task 4: Deferral in survey, and the `waiting elsewhere` phase

**Files:**
- Modify: `workflows/learn/tools/lib/topic.mjs` (`derivePhase`, `groupRows`, `surveyTopic`, the phase comment: "Five phases" becomes six)
- Modify: `workflows/learn/tools/survey.mjs` (the per-goal print loop)
- Test: `workflows/learn/tools/test/phase.test.mjs`

**Interfaces:**
- Consumes: `foldStatus(...).deferredGoals` (Task 2); `elsewhere` (Task 3).
- Produces:
  - Each survey row gains `deferred: string | null`: the where, or null. It is null when the goal is retired or met, so met and retired win over deferral.
  - `derivePhase` returns `'waiting elsewhere'` when, among required goals that are not retired, every one is met or deferred and at least one is deferred. Checked after `not started` and before `nothing pending`.
  - `groupRows` order within a group: unmet, then deferred, then met, then retired. Deferred goals stay in `total`.
  - `--report` prints a deferred goal as `<render(goal), padded to tick>deferred: <where>`.

- [ ] **Step 1: Write the failing tests.** Each topic has two required capability goals, `c-a` and `c-b`, and one live activity serving both, so the phase isn't `in curation`.

```js
test('a deferred goal is listed after unmet and stays in the fraction', ...)
  // defer c-b: phase 'studying'; default group total 2, met 0; goals order ['c-a','c-b']; c-b.deferred === 'PS3'
test('everything else met makes the phase waiting elsewhere', ...)
  // defer c-b, pass c-a: phase 'waiting elsewhere'
test('elsewhere on the deferred goal finishes the topic', ...)
  // then record c-b --outcome elsewhere: phase 'nothing pending', c-b.deferred === null
test('resumed puts the goal back to studying', ...)
  // defer c-b, pass c-a, resume c-b: phase 'studying'
test('a deferred goal later passed shows as met', ...)
  // defer c-b, pass c-b by axes: c-b.met === true, c-b.deferred === null
test('retired wins over deferred', ...)
  // defer c-b, retire c-b: total 1, c-b.deferred === null, pass c-a gives 'nothing pending'
test('report prints the deferral', ...)
  // run survey --report: stdout matches /c-b.*deferred: PS3/
```

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement** as in Interfaces. Pass `status.deferredGoals` into the row build in `surveyTopic`.

- [ ] **Step 4: Run all tests.** Expected: PASS.

- [ ] **Step 5: Commit.** "Derive deferral and the waiting elsewhere phase in survey"

---

### Task 5: Skill text, template and guides

**Files:**
- Modify: `workflows/learn/skills/study/SKILL.md`
  - A new subsection after _When the learner marks it learned_, titled _Goals taught elsewhere_, covering:
    - **First encounter:** the goal carries `taught elsewhere` and has no attempts and no deferral. State the goal, the criterion and where it is taught, then offer: do it here; already done elsewhere (ask where, encouraged, not required); I'll learn it there later; remove it.
    - **The commands for each choice:** `record-attempt.mjs <topic> <goal> elsewhere --outcome elsewhere --note "<where>"`; `record-status.mjs <topic> deferred <goal> --where "<where>"`; and `retired` as in _When a goal turns out not to matter_.
    - **Deferral at any time, for any goal.**
    - **Never offer a deferred goal.**
    - **The check-in:** in phase `waiting elsewhere`, ask once per deferred goal whether it is done there. Yes records `elsewhere`; not yet changes nothing; "do it here" records `resumed`.
    - **Completed elsewhere** comes back for review in about three days, like `declared`.
  - Step 1 of the session loop: skip deferred goals.
- Modify: `workflows/learn/skills/topic/SKILL.md`, in the phase table at lines 44-50 and the "five rows" sentence: add the row `` every required goal met or deferred, one deferred `` → `waiting elsewhere. Study, for the check-in.`
- Modify: `workflows/learn/skills/learn/SKILL.md`: where it presents topics, a topic at `waiting elsewhere` is shown as waiting on class, not as stuck or finished.
- Modify: `workflows/learn/skills/goal-setting/SKILL.md`: when the learner says a goal is covered in class or a problem set, write `- **taught elsewhere:** <where>` on it.
- Modify: `workflows/learn/skills/goal-setting/references/slots.md`: the `declared` paragraph (about line 217) also names `elsewhere`. Add a note under the vocabulary payload discussion that `taught elsewhere` is payload read only by the tutor.
- Modify: `workflows/learn/templates/goals.md`: in the Goals comment, a short paragraph on `taught elsewhere`: what it is, who writes it, and that tools ignore it.
- Modify: `workflows/learn/guides/study/howto.md`: a section _Goals you'll learn in class_, covering the four-way menu, deferring, and the check-in, in the voice of the existing sections.

- [ ] **Step 1: Make the edits.**
- [ ] **Step 2: Verify.** Check that no added line in `git diff -U0` contains U+2014 or U+2013 (in zsh: `git diff -U0 | grep -E $'^\\+.*(—|–)'`). Expected: no output.
- [ ] **Step 3: Commit.** "Teach the tutor, goal setting and learn about goals taught elsewhere"

---

### Task 6: The study lane in the diagram

**Files:**
- Modify: `workflows/learn/learn.bpmn`

Load the `workflow-diagram` skill first and follow its conventions.

- [ ] **Step 1: Add the study-lane step.** Before the activity is offered, add a step "Offer the elsewhere menu" taken when the goal carries `taught elsewhere` and is untouched. Its documentation lists the four choices and the commands each records. The other three choices rejoin at the "carry on?" gateway.
- [ ] **Step 2: Validate.**
  - `node workflows/diagram/tools/check-di.mjs workflows/learn/learn.bpmn`. Expected: `DI consistent, flow reaches an end`.
  - Lint with bpmnlint. If the worktree lacks `node_modules`, use the main checkout's binary, `/Users/presnick/Documents/Documents/code/2026/course-materials/workflows/diagram/tools/node_modules/.bin/bpmnlint -c workflows/diagram/.bpmnlintrc workflows/learn/learn.bpmn`. Expected: no output.
- [ ] **Step 3: Render and look.** `node workflows/diagram/tools/render.mjs workflows/learn/learn.bpmn <scratchpad>/learn.png <study subprocess id>`. Check that no label collides.
- [ ] **Step 4: Commit.** "Draw the elsewhere menu in the study lane"
