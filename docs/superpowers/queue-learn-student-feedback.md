# Queue: learn workflow changes from student feedback

Branch `learn-student-feedback`. Each item is its own design cycle (design, spec where needed,
plan, implementation). Update this file as items finish or are added. Nothing on this branch has
been merged or pushed.

## How work proceeds here

- **Design first.** Brainstorm with the instructor one question at a time, recommend an option,
  then write a spec to `docs/superpowers/specs/`. Bounded changes get a short design in chat
  instead.
- **Plan, then implement with subagents.** A plan in `docs/superpowers/plans/`, one task per
  test cycle, run with fresh implementer and reviewer subagents; a whole-phase review at the end
  on the most capable model, then one fix wave and one re-review. The working ledger lives in
  `.superpowers/sdd/<plan>/` (gitignored, deleted when the plan finishes).
- **Rulings.** Decisions made without the instructor go in a committed rulings file, with what
  each costs if wrong, deleted once the instructor has reviewed it (item 3's was
  `rulings-unified-banks.md`, reviewed and deleted; see git history).
- **Checks.** Tests: `node --test 'workflows/*/tools/test/*.test.mjs'`; add
  `SOURCES_ROOT=/Users/presnick/Documents/Documents/code/2026` so the pool compatibility test
  compares real pools. Skills: `node workflows/develop/tools/check-skills.mjs`. Diagrams:
  `node workflows/diagram/tools/check-di.mjs workflows/learn/learn.bpmn`, and bpmnlint from the
  main checkout (this worktree has no `node_modules`):
  `/Users/presnick/Documents/Documents/code/2026/course-materials/workflows/diagram/tools/node_modules/.bin/bpmnlint -c workflows/diagram/.bpmnlintrc <file>`.
- **Real data is read-only.** Learning topics live in
  `/Users/presnick/Documents/Documents/code/2026/learning-topics`; copy into a scratch folder to
  try anything that writes.

## In order

1. ~~Offer three choices after every not-met ruling (try again, later, mark it learned).~~ Done,
   `6910b51`.
2. ~~Goals learned elsewhere.~~ Done, `444a61c..a080c5b`. Spec
   `specs/2026-10-02-learned-elsewhere-design.md`.
3. **Unified question banks.** Spec `specs/2026-10-03-unified-banks-design.md`. Five phases:
   - ~~Phase 1: bank format, picker, multi-goal judge.~~ Done, `10d6158..93158f9`. Plan
     `plans/2026-10-03-unified-banks-phase-1.md`.
   - ~~Phase 2: goal model (topic origin, capability, `serves: group`).~~ Done,
     `481a63d..745010b`. Plan `plans/2026-10-03-unified-banks-phase-2.md`. Real course topics
     don't carry the `**origin:** course` header yet; their per-goal stamps still work.
   - ~~Phase 3: vocabulary as `a-words`, `supply` retired, `migrate-words.mjs`.~~ Done,
     `4785f33..0761ad8`.
   - ~~Phase 4: curation with two instructor stops.~~ Done, `64a432a..6e380de`.
   - The rulings made during phases 3 to 5 have been reviewed by the instructor. Changes that
     came out of the review: hyphens after every entry-point name and no dashes in descriptions
     (`eecd4ff`, `d6f1ba1`); `CONTRACT.md` deleted, its lasting facts moved into the libraries'
     header comments (`ecc362c`).
   - ~~Phase 5: quiz.~~ Done, `34f264c..ecc362c`. Plan
     `plans/2026-10-03-unified-banks-phase-5.md`. Folder ids are qualified on the quiz path;
     pool keys work at topic, activity and scenario level; practice prefers unseen questions;
     multi-goal questions are graded and recorded per goal. What the instructor's private
     tools must change is under "Actions on course-private" below.
4. ~~**Help is always available; help just means the attempt doesn't count.**~~ Done,
   `5c6d08e`. A helped review still counts as a lapse (instructor's choice). A student reported
   the agent refusing to engage because it wanted an independent test. Study already gives help
   when asked; the refusals come from review (`review/SKILL.md`, "Offer no help ... until it has
   been ruled on"; it says the attempt is meant to be cold and helps only if they insist) and from
   the practice quiz (`quiz/SKILL.md`, "say you cannot answer until they submit"). The
   instructor's decision: the tutor always discusses and guides, in review and in the practice
   quiz too, and simply records the attempt as not independent (`unaided: no`). For work done in
   a web page the student knows whether they got help, so there is little room for
   self-deception. Bounded change (skill text); design in chat, then implement.
5. ~~**Sequenced sets of goals.**~~ Done, `9332b07`, `f7beb10`, `2f20d5b` and `6b023e3` (which
   taught goal-setting and study the sequence), `3e8b2e6` and `f9bade0` (the final fix wave).
   Spec `specs/2026-10-04-goal-sequence-design.md`. A `## Sequence` section above `## Goals`,
   `next-goal.mjs` for study (`--skip` for goals set aside in the sitting; goals with nothing
   live are never picked), survey problems for an item that matches nothing, a goal in two
   sets, a goal in none, and an entry stranded inside the section. Migration is under "Actions
   on the learning-topics repository".
6. ~~**Progress view.**~~ Done, the tool in `238a646` and its fix in `fc13d01`; study shows it
   (the full view at the open and when a set finishes, one set's line after each attempt) and
   the study guide explains it. Item 7 will draw `--json`, which will need goal text, structured
   capability data (slug, met, total) and goals.md order for an HTML panel, since today
   `next[].name` is a formatted string and goals are sorted by state. Original brief:
   Metacognitive information for the student: the sequence of sets from item 5 drawn as columns,
   with checkmarks and other marks for attempts and completions (and, from item 2, deferred and
   done-elsewhere), shown at the start of a session and again after each task. The instructor
   wants hierarchy (capabilities grouping their parts) so a topic doesn't read as an
   overwhelming list. Survey already gives the data (`groups[].capabilities`, rows with `met`,
   `deferred`, `last`). Rendering in chat or in item 7's web panel is open.
7. **Web side panel for tutor-initiated questions.** Questions the tutor sets open in a web page
   beside the chat, so the chat stays mostly student-initiated; the chat notices when the student
   presses Submit. The chat stays responsive throughout; if the student uses it during a question,
   that is recorded and the page's answer is not treated as independent. Precedent: the practice
   quiz serves a page on 127.0.0.1 from a foreground process that exits on Submit
   (`workflows/quiz/tools/quiz-practice.mjs`). Students run Codex, so start with a feasibility
   test of the Submit notification there before writing a spec.
8. **Personalized problem-set questions** (spec B, not yet written). Decided so far:
   - A bank can belong to one student. A generator that reads a problem-set repo lives in
     `activities.md` like any generator (public).
   - **Study:** the tutor runs it on the student's own problem-set repo and adds the questions to
     that student's bank in their learning-topics clone; served and reviewed like any bank.
   - **Quiz:** the instructor runs the same generator in the grading pass (each student repo is
     already processed in a Docker container), producing per-student questions and rubrics on the
     private side; `quiz-bake` draws them by uniqname. The quiz never uses student-generated
     questions (a student could pick easy ones or soften a rubric).
   - **Review:** the instructor reviews the generator plus a sample of its output; an agent checks
     every question against that student's repo (answer true of their code, rubric faithful to
     the goal's criterion). This loosens "instructor reviews the bank" for this category only.
   - **Goals:** no problem-set goals. The generator is aimed at topic goals that the problem set
     exercises, and each question's rubric names them; a question fitting no goal is quiz-only
     (as problem-set follow-ups are today) and never enters study or review.
   - Builds on item 3's bank format and picker; the private-side steps would be described as an
     interface for course-private to implement.

## Actions on the learning-topics repository (outside this branch)

- Add the `**origin:** course` header line to every course topic's `goals.md` (under the title,
  above `## Goals`), and remove the per-goal `origin: course` stamps it makes redundant. Until
  then the per-goal stamps keep working. Check with `survey.mjs`: each topic's `origin` should
  read `course` and no problems should appear.
- Add a `## Sequence` section to each course topic's `goals.md`, just above `## Goals`: a short
  default (`1. orientation`, `2. vocabulary`, `3. capabilities`), adjusted per topic where a
  capability is basic enough to come with the words, or parts build on each other. Until then
  survey reports `sequence: not decided yet` and the default order applies, which is not a
  problem. Check with `survey.mjs`: no problem should name a Sequence item or a goal in no set.
- Run `node workflows/learn/tools/migrate-words.mjs <topic-folder>` on each course topic, with
  `--dry-run` first to read its summary. It moves banked word questions into `a-words`, adds
  the `a-words` entry, and removes the word stamps and `supply` lines. Then, during that topic's
  next curation, place each remaining capability question in `items.md` into the activity whose
  generator would produce it.

  **Migrating a topic and updating every pool that draws from it are one change.** Nothing
  fails if the pool is left alone. Session 5's `words` key stops resolving, which is loud, but
  in sessions 7 and 9 `items.md` survives holding only the capability questions, so the old
  `<topic>/items` keys go on resolving and the quiz quietly shrinks to almost nothing: the
  strata go from 26 and 40 questions to 3 and 4 (session 7), and from 44, 29 and 29 to 5, 3 and
  4 (session 9). The tool now warns on stderr, per pool key, with the bank's count before and
  after; treat the warning as the to-do list. The mapping for each real pool, from counts in
  each `rubrics/<bank>.md` (a question with a `move` is a word question, one without is a
  capability question):

  - **Session 5** (commits-and-history; `words` held 30 word questions over 8 words, all with a
    move). Convert it from the topic form, dropping `topic`, so its ids are qualified like every
    other pool's: `learning-topics/commits-and-history-2026-09/a-words: 4` and
    `learning-topics/commits-and-history-2026-09/commit-and-restore: 1`. Total 5, mix unchanged.
  - **Session 7** (total 5). Old: `ps1-data-analysis/knowing-it-is-right: 1`, coding-agents
    `items: 2` (26 questions: 23 word over 10 words, 3 capability over 3 goals) and react-apps
    `items: 2` (40: 36 word over 12 words, 4 capability over 2 goals). Expected per quiz: 3.57
    word questions and 0.43 capability ones. New: keep `knowing-it-is-right: 1`;
    `learning-topics/coding-agents-2026-09/a-words: 2`;
    `learning-topics/react-apps-2026-09/a-words: 2`. No `items` key: the nearest whole mix to
    0.43 capability questions is none, and that was also the old draw's commonest outcome (63%
    of quizzes had no capability question).
  - **Session 9** (total 6). Old: `items: 2` each from web-backends (44: 39 word over 13 words,
    5 capability over 3 goals), software-design (29: 26 word over 9 words, 3 capability over 2
    goals) and software-construction (29: 25 word over 9 words, 4 capability over 2 goals).
    Expected per quiz: 5.29 word and 0.71 capability. New:
    `learning-topics/web-backends-2026-09/a-words: 1`,
    `learning-topics/web-backends-2026-09/items: 1`,
    `learning-topics/software-design-2026-09/a-words: 2`,
    `learning-topics/software-construction-2026-09/a-words: 2`. One capability question,
    from the topic whose capability bank is largest.

  An `a-words` key plus an `items` key of 1 each for every topic would keep the totals but turn
  a mix that was nearly nine words in ten into half capability questions, drawn from banks of 3
  to 5, so it is not used. When a topic's capability questions move into activities, its
  `items` key moves with them.

  **A topic-level key is not a drop-in replacement.** A topic count is spread evenly over all
  the topic's banks in name order, whatever their size. `learning-topics/coding-agents-2026-09: 2`
  would give half the count to the 3-question `items` bank, and in a topic with activity banks
  as well (react-apps, web-backends, software-construction) it would also draw from banks the
  old pool never named.

## Actions on course-private (outside this branch)

The shared quiz libraries changed in phase 5. Single-goal questions from single-file banks work
as before; these changes are needed before folder-bank questions, and especially multi-goal ones,
reach a real quiz. The mechanisms are explained in the header comments of
`workflows/quiz/tools/lib/bank.mjs`, `lib/grade.mjs` and `quiz-draw.mjs`.

- **quiz-regrade** (needed for any folder-bank question): `resolveRubrics` (around lines 61-75)
  must find a folder question's rubric at `rubrics/<activity>/<scenario>.md` and its task at
  `tasks/<activity>/<scenario>.md`, from the item's `activity` and `scenario`. For multi-goal
  questions, the prompt needs a `per_goal` variant of its verdict shape, and its coverage check
  must accept a verdict carrying `per_goal` with no top-level `credit`.
- **quiz-review** (needed for any folder-bank question): the same `resolveRubrics` fix (it calls
  it around line 592).
- **quiz-bake**: call `courseOnly` before drawing, filtering each stratum by object identity, and
  report its dropped questions and any stratum it leaves short. Cosmetic: print `s.bank ??
  s.name` in the plan line.
- **quiz-comments**: score with `graded.value ?? CREDIT_VALUE[graded.credit]`, add a word for
  `partial`, and consider listing each `per_goal` entry's `missed`.
- **quiz-bank-check**: check and tally `goals`, not only `goal`.
- **tests/quiz-draw.test.mjs**: four tests fail on this branch because the fixture topic has no
  `goals.md`. Add one with `**origin:** course` and an entry for each goal its rubrics name.
- **The quiz app**: confirm it treats an item id as an opaque string; qualified ids contain `/`.
- No change needed: quiz-seed, quiz-grade (`--queue` and `--merge`), quiz-export, quiz-scores.

## Parked ideas

- Evidence for a `taught elsewhere` goal drawn from that problem set's personalized questions.
- Recording real-quiz results into a student's attempt log.

## Deferred minors from item 2's review

- `declared.test.mjs`: the setup miss isn't asserted.
- Test temp directories are never removed.
- No test that repeated `deferred` lines resolve to the last one.
- `record-status.mjs`: `readIds` is read twice; a dead `goal &&` guard.
- A long or multi-line `--note` renders verbatim in survey's `last`.
- `elsewhere.test.mjs`: its regex truncates on an escaped quote.
- `learn.bpmn`: two record flows share a stub off `S_el_choice`.
- `study/SKILL.md` still says "a `resumed` line proves they already chose"; it now reads the
  survey's `resumed` field.

## Deferred minors from item 3, phase 1

- No test of `MOVE_TAGS`'s shape.
- `bank.mjs`: `label3` is a clumsy name; the credit capitalise-and-join is duplicated between the
  single-file and folder paths; `statSync` throws on a broken symlink in `tasks/`.
- `bank.mjs` `topPart` drops every `# ` line, not only the title. Fix before phase 4 drafting.
- No mcq folder test of `expected`, or of `move` being absent.
- `pick.mjs`: an unparseable `at` gives NaN ordering.
- `next-item.mjs`: untested paths (equal-`at` ties, exit 1 on misuse).

## Deferred minors from item 3, phase 2

- `readGoals` returns extra `written` and `malformed` fields used only by `idProblems`.
- Survey `--report`: no test of a part's two-space indent; a capability slug used in two groups
  gets two partial headings; a long line in `survey.mjs` (the `tick` computation).
- `serves: group`: the matcher is strict on case and spacing (`Group x` falls through to the
  unknown-id problem, so it is still reported).
- The spec says parts stay in the default group; nothing enforces it, and slots.md says
  "usually".
- slots.md: `capability` sits loosely under "data or reference", and that table row is wider
  than its neighbours.
- Untested: a header after `## Goals` is ignored; one- and five-word slugs rejected;
  `serves: group capabilities` (the default group) expands; a backticked group item expands.

## Deferred minors from item 3, phases 3 to 5

- `migrate-words.mjs`: the unreadable-id warning is worded wrongly for a line in the preamble; a
  column-0 bullet after a blank line under a stamp is removed with it; a split that falls inside
  a fence puts a blank line inside the fence; it takes the first `goal:` line where `bank.mjs`
  takes the last (malformed rubrics only); a failed rename partway through the edits is not
  rolled back.
- No test pins that a topic whose only entries are stamps reads `in curation`.
- `curation/SKILL.md`: paragraph flow before "The layout every step writes"; an awkward wrap in
  `curation/draft-bank`.
- `learn.bpmn`: the curation lane's `C_revise` and `C_sample` writes are documented but not drawn
  as data associations; a long corridor for the plain-path flow.
- A topic-level pool key also spreads over activities marked dropped (`bank.mjs` doesn't read
  activities.md).
- `grade.test.mjs` byte-identity fixture lacks the no-verdict and orphan-verdict cases.
- `quiz-practice.mjs` keys goal criteria and `kinds.json` by bare goal id across topics (two
  topics sharing a goal id in one draw would share one entry); pre-existing.
- `workflows/diagram/tools/render.mjs` times out (`Page.captureScreenshot`) on this machine even
  on unchanged files; a copy launched with headless `shell`, a `protocolTimeout` and
  `--disable-gpu` renders.
