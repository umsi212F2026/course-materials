# Unified question banks

**Status:** approved design, 2026-10-03. Branch `learn-student-feedback`.

## Why

Course topics are curated twice: once as activities, whose checks are mostly generators the
tutor runs live, and again as a quiz bank drafted by hand against the same goals. The two passes
have their own reviews, re-derive the same scenarios, and drift apart (a criterion revised in one,
a rubric in the other). Separately, study banks have grown up in a third format (a task file and
a tutor key file) that the quiz cannot read.

## Design goals

1. **One curation process.** The instructor reviews a generator, then the bank it drafted;
   problems found in the bank send the instructor back to the generator.
2. **Scenarios with several questions,** each question bearing on one or more goals.
3. **One pool, three uses.** Study, review and the quiz draw on the same reviewed questions. Banks
   are public; practising is practising against what quizzes draw.
4. **One standard.** A question's rubric is what the study judge and the quiz grader both apply.
5. **Evidence is per goal.** An unaided, full-credit answer counts for each goal the question
   bears on, ruled goal by goal. Repeats count, and so do new questions in a familiar scenario.
6. **Serving never runs dry.** Unseen questions first, then the one seen longest ago.
7. **No more curation than today.** Banks stay roughly today's size.
8. **Course topics get reviewed banks; students' own topics don't need them.** A student topic
   runs its generators live.
9. **Activities without questions stay:** readings, worked examples, work on the student's own
   project.
10. **Existing topics keep working** and migrate when next curated.

## Goals

### Topic origin

A course topic's `goals.md` carries one line, `**origin:** course`, under its title. For example,
the top of the cloud-hosting topic's file:

```
# Learning goals: cloud hosting

**origin:** course
```

`readGoals` returns it as the topic's origin; absent means `learner`. Goals inherit it.
`new-word.mjs` and goal-setting stamp `- **origin:** learner` on any goal a student adds to a
course topic. Per-goal `origin: course` stamps become redundant; they are harmless and removed
when a topic is next curated.

Origin decides two things only: whether curation drafts and reviews banks (course), and whether a
quiz may draw on a goal (course goals only).

### Capabilities in parts

A goal may carry `- **capability:** <slug>`, a bare slug (two to four lower-case words with
hyphens, no prefix) shared by the part-goals of one capability. Parts stay in the default group.

- Survey lists parts under their capability with a fraction per capability, for example
  `weigh-hosting-plans 1/3`.
- Goal-setting's scope rule ("more than about three") counts capabilities, with an unlabelled
  goal counting as one. A new goal-setting move: when checking a criterion would need one very
  long question, split the capability into part-goals sharing a slug, each with its own criterion.
- Survey's problems check reports a malformed slug and a capability with only one part.

Parts are reviewed on their own schedules; that is the reason to split.

### `serves` may name a group

`- **serves:** group vocabulary` serves every goal in that group, including ones added later.

### The `supply` slot is retired

With vocabulary an ordinary activity, every goal is served the same way. A `supply` line in an
existing `goals.md` is ignored, not reported.

## Activities and banks

An activity is an exercise shape (critique a worked choice, make the call yourself, sort sources,
define a word). An activity that has questions carries a **generator** in `activities.md` and,
for a course topic, the **bank** it drafted. Activities without questions are unchanged.

Three places, for three readers:

| | holds | read by |
|---|---|---|
| `activities.md` | what the activity is, how to offer and run it, its generator | tutor, curation |
| `tasks/<activity-id>/` | what the learner sees | learner, through the tutor or quiz page |
| `rubrics/<activity-id>/` | how answers are judged | judge, grader, tutor |

Whether an activity has a bank is whether `tasks/<activity-id>/` exists, so an entry no longer
carries `kind: bank` or a `bank:` path.

### The generator declares its goals

A generator says which goals its questions bear on, and how a question is mapped to them. This
replaces the activity-level `checks` field. When a generator is run live (no bank), the tutor uses
that mapping to know which goals to have ruled. An old entry's `checks` line is read as the
generator's goals.

### Bank layout

```
tasks/<activity-id>/
  <scenario-id>.md    the scenario's setup, then one `### <question-id>` section per question
rubrics/<activity-id>/
  <scenario-id>.md    the scenario's shared key, then one `### <question-id>` section per question
```

An activity has no bank or one; activities without questions, and generators run live, have no
folders. A bank has one or more scenario files, and every question is in one. A scenario file's
top part (before its first `###`) is shared by its questions: the setup in `tasks/`, the key in
`rubrics/`. Nothing is shared across scenario files; an instruction every scenario needs ("answer
in two or three sentences") is written at the top of each.

**`main-bank` is the reserved name for a scenario file with no shared setup.** Its top part is
empty and its questions stand alone, though any one of them may set up its own situation in its
body. A bank may have named scenarios, a `main-bank`, or both. Vocabulary keeps a file per word
(the word is a natural unit to keep or cut), even though a word has no setup.

Each rubric question section carries:

- `goal:` one or more goal ids, comma-separated. Omitted only for a question that cannot
  establish any goal (a warm-up).
- `answer:` what a complete answer says.
- `credit:` what full and half credit mean **for each named goal**.
- `type:` `free` (default) or `mcq`; for `mcq`, the question body ends in a numbered list and
  `answer` is the 1-based choice.
- `move:` for a vocabulary question, the move (DEFINE, INTERPRET, DISTINGUISH, CATCH, APPLY). It
  sets the attempt's tag through the move table now in `quiz-practice.mjs`, which moves to a shared
  library.
- `tutor note:` optional; follow-ups specific to this question, for the tutor only: a partner
  question to compare against if it was served before, a known trap, what to ask when the answer
  is wrong in a particular way.

**Where tutoring instructions live.** The activity's entry in `activities.md` keeps what holds for
every question: the method (`tutor role`, `tutor does`, `done when`), `offer as` (used before any
question is picked), the generator, and curation's records. A note about one scenario (such as two
made-up vendors sharing a name) goes in that scenario's key; a note about one question goes in its
`tutor note`. Questions whose method differs are usually two activities.

**Scenario files are named for their content** (`crumbs.md`, `tally.md`, a word's name), even
when a bank has only one scenario. **Question ids are unique within their scenario**, so a
scenario may number its questions `q1`, `q2`. The label everywhere (study, review, quiz) is the
question's path, `<activity-id>/<scenario-id>/<question-id>`, for example
`a-judge-plan-weighings/crumbs/v4`. Renaming a scenario only makes the picker treat its questions
as unseen; whether a goal is met depends on rulings, not labels.

**What each party sees.** The learner: the scenario's setup and the one question. The judge,
grader and tutor: the learner text plus the scenario's key and the question's rubric entry. The tutor never shows rubric text to the learner.

### What counts

- The judge rules on each goal the question names, separately: unaided, and criterion met. Each
  ruling is recorded as its own attempt under the same label.
- Criterion met means full credit for that goal under the rubric. Half credit is not met; the
  learner can still mark the goal learned.
- A repeat counts like a first sighting.

## Serving

`workflows/learn/tools/next-item.mjs <topic> (--goal <id> | --activity <id>) [--after <label>] [--key]`

- Candidates: with `--goal`, every question in any bank whose rubric names that goal; with
  `--activity`, every question in that activity's bank.
- Order: questions this learner has never been served (by label, from the attempt log), then the
  one served longest ago. With `--after`, a tie goes to a question whose label shares that label's
  `<activity-id>/<scenario-id>` prefix.
- Prints the label, the learner text, whether it is a repeat, and its tags. `--key` prints the
  judge's version instead.
- Old labels in the log that match no question are ignored.

**Study** offers activities by `serves`. For an activity with a bank it serves through the picker
with `--activity`; a learner who carries on gets `--after` the last label. For an activity with no
bank (a student topic, or a word a student added) the tutor runs the generator live, as today.

**Review** serves the goal that is due with `--goal`, falling back to the generator live when no
bank question names it.

## The judge

`workflows/learn/skills/study/judge/SKILL.md` gains two inputs: `goals`, a list of goal ids each
with its resolved criterion, and `rubric`, the judge's version of the question. It returns one
ruling per goal. A single-goal call with no rubric (a live generator) is unchanged.

## Vocabulary

One activity per topic, `a-words`, with `serves: group vocabulary`. Its generator is the five
moves; the entry points at `workflows/learn/skills/goal-setting/references/vocabulary-moves.md`
as its spec and reads each word's `what it names`, `nearest confusable` and `synonyms`. Its bank
has a scenario per word. A word with no bank questions is served by running the moves live.

Removed: the `origin: generated` placeholder entries, curation's stamping step, and study's
separate path for words. Kept: the moves reference, the tags, and the `one production pass` bar.

## Curation

**Course topics.** A session the instructor sits in, with two stops.

1. **Generate** activities with generators (no stamping).
2. **Check, as today:** verify and critique in fresh contexts, then one revision. The critic also
   judges each generator: what varies and what is fixed, and whether it maps questions to goals.
3. **Stop 1: generators.** Each generator drafts one sample scenario, shown beside its text as
   files on the curation branch. The instructor gives feedback in the session. A kept sample
   becomes the bank's first scenario.
4. **Draft the banks** at about today's sizes, one drafter per activity, in parallel.
5. **Check the banks** with an agent: answer true of the scenario; answerable from the setup
   alone; each per-goal credit faithful to that goal's criterion; question doesn't give its answer
   away.
6. **Stop 2: banks.** The instructor keeps or cuts scenarios and questions. A finding about a
   generator sends that generator back to stop 1, and only its scenarios are redrafted.
7. **Land:** `curated` per goal, as today.

**Student topics:** steps 1 and 2 only.

## Quiz

- `workflows/quiz/tools/lib/bank.mjs` reads the folder layout (assembling learner text and rubric
  as above) and still reads single-file banks.
- Pool draw keys may name a topic (`<source>`, count spread across its activities), an activity
  (`<source>/<activity>`), a scenario (`<source>/<activity>/<scenario>`), or an existing single
  bank file as today. `exclude` may name questions. Every existing pool file draws as before.
- The practice quiz picks through `next-item.mjs` ordering, so it prefers questions this student
  hasn't seen. It records one ruling per named goal.
- The grader returns credit per named goal. A question's score is the average of its per-goal
  credits (full 1, half 0.5, none 0); a single-goal question scores as today.
- A real quiz cannot avoid questions a student has seen, because their attempt log is in their own
  clone. Its independence rests on bank size.
- Only goals whose origin is `course` are drawn on.

## Migration

**Course topics,** converted upstream and delivered through `update`, each when next curated:

- Word questions in `items.md` become `a-words` scenarios; an `a-words` entry is added; the `a-w-*`
  placeholder entries and `supply: vocabulary` lines are removed.
- Capability questions in `items.md` move into the activity whose generator would produce them.
- So `items.md` is split, never turned into a single scenario. Until a topic is migrated it keeps
  working as a single-file bank.
- Key-file study banks (cloud-hosting) become folders; the key's shared lists become the scenario
  key, and its cases table becomes per-question entries.
- One `origin: course` header replaces the per-goal stamps.

Goal ids never change, so every recorded attempt keeps pointing at its goal.

**Students' own topics** cannot be migrated by the course. The tools accept the old shape
indefinitely: a `supply` line is ignored, an `origin: generated` entry is skipped, a word with no
serving activity is served by the moves live, and `checks` is read as the generator's goals. The
student's own curation converts the topic the next time it runs.

## Tests

Extending `workflows/learn/tools/test/` (`node --test 'workflows/learn/tools/test/*.test.mjs'`),
plus quiz tool tests:

- Folder bank parsing and assembly of learner text and judge text; single-file banks still read.
- Picker: unseen first, then longest ago; `--after` tie-break; `--goal` across banks; old labels
  ignored.
- Multi-goal rulings recorded one per goal under one label.
- Topic origin and inheritance; capability grouping, fractions and problems in survey;
  `serves: group`.
- Old-shape tolerance: `supply`, `origin: generated`, `checks`.
- Every existing pool file draws the same; topic, activity and scenario keys; score averaging.

## Delivery

One design, planned in phases that each ship on their own:

1. Bank format, `bank.mjs` folder reading, the picker, and the judge's multi-goal input.
2. Goal model: topic origin, capability, `serves: group`, `supply` retired.
3. Vocabulary as `a-words`, with the migration and tolerance rules.
4. The curation skill: two stops, bank drafting and the bank check.
5. Quiz: pool keys, practice picking, per-goal grading and score averaging.

## Out of scope

- Personalized questions from a student's problem-set repo (a separate spec; it builds on banks
  that belong to one student).
- The progress view and sequenced goal sets (#2, #3 in the queue), which will draw on the
  capability hierarchy.
- Recording real-quiz results into a student's attempt log.
