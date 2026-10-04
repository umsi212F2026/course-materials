---
name: curation-draft-bank
description: Draft one activity's question bank on a course topic, from its generator and the criteria of the goals it checks, as scenario files in tasks/<activity-id>/ with their rubrics in rubrics/<activity-id>/. Mode sample writes one scenario for the instructor to read beside the generator; mode full fills the bank to its target size, keeping what is there. Called by the curation orchestrator, on the course path only.
---

# Curation: draft bank

## Operates on

`<topic-dir>`, one course topic folder, and within it one activity's two bank folders:
`tasks/<activity-id>/` and `rubrics/<activity-id>/`. **You write those two folders and nothing
else**: not `activities.md`, not `goals.md`, not another activity's bank. That is what lets one
drafter per activity run in parallel without treading on each other.

**Only an activity with `checks` whose generator invents its own material gets a bank.** If you
are handed one whose generator picks from real items or from the learner's own work (their own
app, their own agent, their own chats), an orientation rehearsal, or an activity without
`checks`, write nothing and say so in your reply. A bank would replace the learner's own
material with invented material, and the picker serves a bank whenever one exists, so the live
generator would never run again.

You are told this directory, the activity and the mode. Do not choose them, and do not guess
them from the working directory: whatever invoked you established them already.

**What you read.** The activity's entry in `activities.md`: its `generator`, `checks` and
`serves`, and anything else in it that says how many questions or how they are run. The
criterion of each goal in `checks`, from `goals.md`, resolving a reference criterion through
`workflows/learn/skills/goal-setting/references/slots.md`. The files already in your two
folders. For `a-words`, the word's entry in `goals.md` (`what it names`, `nearest confusable`,
`synonyms`) and `workflows/learn/skills/goal-setting/references/vocabulary-moves.md`, which is
its generator.

**For `a-words`, the goals are the words.** It has no `checks`; where this file says "the goals
in `checks`", read the words in group `vocabulary`. In `sample` mode that is only the words with
no file in `tasks/a-words/` yet. In `full` mode it is every word, including one sampled at stop
1, and each is filled to about three questions. Each scenario is one word, named for its goal
id, and each question's `goal:` is that one word, with its `move:` set.

**The generator is your only brief.** Draft what it says: what varies, what is fixed, how hard,
which goals a question bears on. Where it leaves you guessing, guess as little as you can and
say so in your reply. A gap you quietly filled looks, to the instructor, like a generator that
works.

## The two modes

**`sample`: one scenario.** The instructor reads it beside the generator's text and decides
whether the generator is right, so make it the scenario the generator most plainly describes,
not an edge case. Give it enough questions to show how the generator maps onto each goal in
`checks`, usually one or two per goal. If it is kept, it becomes the bank's first scenario, so
write it to the same standard as any other.

**`full`: the bank, to its target size.** About three questions per goal in `checks` (per word,
for `a-words`), unless the entry says otherwise. Count what is already in your folders first, by
reading each rubric entry's `goal:` line; a question naming two goals counts toward both. Then
add new scenarios until every goal reaches its count. **Never edit or delete a scenario or
question already there**: it is a kept sample, or a question converted from an older file, and the instructor has
seen it or will. A word in `a-words` has one scenario, its own file, so a word sampled at stop 1
is filled by adding new questions to the end of its task and rubric files, leaving the ones there as they are.

Vary what the generator says varies. Two scenarios differing only in their names are one
scenario, and a learner who has met one has met the other.

If you are handed survey problems for your folders, fix those first and add nothing else. They
are format slips with one right answer.

## The format, exactly

One scenario is two files with the same name, one in each folder. A file's top part, before its
first `###`, is shared by all its questions: the setup in `tasks/`, the key in `rubrics/`. Then
one `### <question-id>` section per question, in both files, with the same ids.

`tasks/a-judge-plan-weighings/crumbs.md`, what the learner sees:

```
Crumbs is a two-person bakery moving its order form off a spreadsheet. It takes about forty
orders a week, most of them on Friday evening. Neither owner writes code.

### q1

Crumbs is offered a plan that bills by the request, and one that bills a flat monthly fee.
Which suits it better, and why? Answer in two or three sentences.

### q2

Which of these is the strongest reason for Crumbs to avoid running its own server?

1. Servers are slower than hosted platforms.
2. Nobody at Crumbs could keep one patched.
3. Its traffic is too low to justify any hosting.
```

`rubrics/a-judge-plan-weighings/crumbs.md`, what the judge, grader and tutor see:

```
Forty orders a week, peaking on Friday evening, is a small and spiky load. Neither owner can
maintain software, so anything needing upkeep counts against a plan.

### q1

- **goal:** `c-weigh-hosting-plans`, `c-name-upkeep-costs`
- **answer:** Per-request billing, because the load is small and idle most of the week; and it
  needs no upkeep from people who can't provide it.
- **credit:**
  - `c-weigh-hosting-plans`: full for choosing per-request and tying it to the low, spiky
    load; half for the right choice with no reason from the setup.
  - `c-name-upkeep-costs`: full for naming that neither plan should need maintenance the owners
    can't do; half for mentioning upkeep without connecting it to Crumbs.
- **tutor note:** if they choose the flat fee for predictability, ask what forty orders a week
  would cost per request.

### q2

- **goal:** `c-name-upkeep-costs`
- **type:** mcq
- **answer:** 2
- **credit:** full for 2 only.
```

The rules behind that example:

- **Scenario ids are named for their content** (`crumbs`, `tally`, a word's goal id for
  `a-words`), lower case with hyphens, even when the bank has one scenario. The file is
  `<scenario-id>.md` in both folders.
- **`main-bank` is the reserved scenario for questions with no shared setup.** Its top part is
  empty, and each question carries whatever situation it needs in its own body. Never give a
  scenario with a setup that name, and never use it to avoid naming one.
- **Question ids are letters, digits and hyphens, unique within their scenario**; `q1`, `q2` is
  fine. A heading with any other character is not a heading to the reader, and its text runs on
  into the question before it. The label everywhere is
  `<activity-id>/<scenario-id>/<question-id>`.
- **Every question has exactly one rubric section with its id**, and every rubric section a
  question.
- **The rubric fields**, as `- **name:** value` lines:
  - `goal:` the goal ids this question bears on, from the activity's `checks` and nowhere else,
    comma-separated. A warm-up that cannot establish any goal omits it, and counts toward
    nothing.
  - `answer:` what a complete answer says. For an mcq, the 1-based number of the right choice.
  - `credit:` what full and half credit mean. A single-goal question has one statement. **A
    question naming two or more goals lists one statement per goal**, as an indented list, each
    starting with the goal id in backticks and a colon; one missing is a problem survey reports.
  - `type:` `free`, the default, which you may omit, or `mcq`. An mcq's question body ends in a
    numbered list of choices.
  - `move:` for an `a-words` question only, the move from vocabulary-moves.md that it makes.
  - `tutor note:` optional; follow-ups for this one question, for the tutor only: a known trap,
    what to ask when the answer is wrong in a particular way. What holds for every question is
    in the activity's entry already, and a note about the whole scenario goes in its key.
- **An instruction every question needs** ("answer in two or three sentences") goes at the top
  of each scenario's setup, or in each question of `main-bank`. Nothing is shared across files.

## What makes a question good

**Answerable from the setup alone.** Every fact about the scenario that the answer depends on is
in the setup or the question. What the learner brings is the capability the goal names, never
knowledge of this scenario that only the key holds.

**Nothing gives its answer away**: not the question's wording, not a choice that is obviously
the odd one out, and not a question written before it in the same scenario. Questions are served
one at a time, and study serves a scenario's questions in the order they are written, so a later
question may reveal an earlier one's answer, but none may reveal a later one's, and none may
depend on another's answer to be answered.

**The answer is true of the scenario.** Work it out from the setup as the learner would before
writing the `answer` line, rather than writing the scenario to fit an answer you had in mind.

**Each credit statement is that goal's criterion, applied to this question.** Full credit means
the criterion is met here, no more and no less. A statement that asks for less certifies the
goal too easily; one that asks for more holds the learner to a bar the goal never set.

**An mcq has one right choice**, and each wrong one is wrong for a reason the setup supplies,
not by a technicality.

Write no em dash or en dash anywhere in a bank: these files ship to students in the course's
own voice.

## Before you return

Run survey on the topic, with `<data-dir>` the folder that holds it:

```
node workflows/learn/tools/survey.mjs --dir <data-dir> <topic-folder>
```

Fix every entry in its `problems` that names a label or file in your activity, and run it again
until none do. Leave problems elsewhere alone; they are not yours.

## What you return

- **What you wrote:** each scenario file, and how many questions now bear on each goal in
  `checks`, counting what was there before.
- **Where the generator left you guessing**, specifically: which part, and what you chose. The
  orchestrator carries this to the instructor at stop 1, where it is cheap to fix.
- **A goal you could not reach its count for**, and why. A generator that cannot produce three
  distinct questions on a goal is a finding about the generator, not a reason to pad.

## Depends on

- [`curation`](workflows/learn/skills/curation/SKILL.md) - skill
- [`survey.mjs`](workflows/learn/tools/survey.mjs) - tool
- [`slots.md`](workflows/learn/skills/goal-setting/references/slots.md) - reference
- [`vocabulary-moves.md`](workflows/learn/skills/goal-setting/references/vocabulary-moves.md) -
  reference
