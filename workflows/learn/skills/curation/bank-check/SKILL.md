---
name: curation-bank-check
description: Check a course topic's question banks question by question, in a fresh context. Each answer must be true of its scenario, each question answerable from the setup alone without giving its answer away, each goal's credit statement faithful to that goal's criterion, and each mcq unambiguous. Returns findings per label, each marked question, scenario or generator; writes nothing. Called by the curation orchestrator on the course path, after the banks are drafted.
---

# Curation: bank check

## Operates on

`<topic-dir>`, one course topic folder: its folder banks, `tasks/<activity-id>/` with
`rubrics/<activity-id>/`, checked against the criteria in `goals.md` and the generators in
`activities.md`.

You are told this directory. Do not choose it, and do not guess it from the working directory:
whatever invoked you established it already.

**You are given the folder and nothing else**: not the drafters' reasoning, not the session
that produced the banks. That is the point of you. A drafter knows what it meant, and a question
that only works if you know what was meant is the question this pass exists to catch. You read
it as the learner and the judge will, with only what is written.

**Write nothing.** You return a report; the orchestrator puts it in front of the instructor, who
decides what is kept or cut.

**Folder banks only.** A single-file bank (`tasks/items.md` and the like) or a key-file study
bank has not been through this process yet and is converted before it is; skip it, and say in
your report that you did.

## First, the survey

```
node workflows/learn/tools/survey.mjs --dir <data-dir> <topic-folder>
```

with `<data-dir>` the folder that holds the topic. Its `problems` are the mechanical floor: a
scenario with no rubric file, a question with no rubric entry or two, duplicate question ids, an
mcq answer that is not one of its choices, a goal id that is not in `goals.md`, a multi-goal
question with no credit statement for one of its goals, a bank folder with no activity entry.
The orchestrator should have cleared these before calling you. Report any that name a bank
label, verbatim and marked `question` (or `scenario`, for one about a whole file), and then
check everything else anyway. Don't re-derive what survey checks; spend the reading on what it
can't.

**One mechanical check survey doesn't make: every id on a question's `goal:` line is in its
activity's `checks`.** For `a-words`, which has no `checks`, the ids must be words in group
`vocabulary`. Report any that isn't as a `question` finding. A question claiming a goal its
generator never declared collects evidence the generator was never reviewed for.

## Every question, five checks

For each `### <question-id>` in each `tasks/<activity-id>/<scenario-id>.md`, read the
scenario's setup, the question, the scenario's key (the top of its rubric file), the question's
rubric entry, and the criterion of each goal its `goal:` line names, from `goals.md`, resolving a
reference criterion through `workflows/learn/skills/goal-setting/references/slots.md`.

1. **The answer is true of the scenario.** Work the question from the setup yourself **before**
   reading the `answer` line; an answer read first tends to look right. Then compare. A wrong
   key is the worst defect available here, because the judge and the grader will both apply it.
2. **It is answerable from the setup alone.** Every fact about this scenario that the answer
   depends on is in the setup or the question. The learner brings the capability the goal names;
   they cannot bring what only the key says.
3. **Each goal's credit statement is faithful to that goal's criterion.** Full credit should mean
   the criterion is met in this question: not less, which certifies the goal too easily, and not
   more, which holds the learner to a bar the goal never set. A question naming two or more goals
   has one statement per goal, each starting with the goal id in backticks and a colon. And ask
   whether the question bears on each goal it names at all: a goal listed on a question that
   doesn't exercise it collects evidence that means nothing.
4. **It does not give its answer away**: not in its wording, not by one choice standing out from
   the rest, and not through another question in the same scenario. Questions are served one at
   a time and in any order, so none may reveal or lean on another's answer.
5. **An mcq is unambiguous.** Exactly one choice is right, given the setup, and it is the one
   `answer` names (1-based). Each wrong choice is wrong for a reason the setup supplies, not on a
   technicality a careful learner could argue.

## Marking each finding

Every finding carries one mark, which says what has to change:

- **`question`**: this question is at fault, and fixing or cutting it is enough.
- **`scenario`**: the setup or the key is, so every question in the scenario inherits it. A setup
  missing a fact, or a key that contradicts the setup.
- **`generator`**: the cause is in the activity's generator, so redrafting the bank would make the
  same mistake again. Several scenarios from one activity failing the same way, a difficulty the
  generator never pinned down, a goal mapping that doesn't hold for the questions it produces.
  This mark sends the generator back to the instructor at stop 1, and only that activity's
  scenarios are redrafted, so use it when, and only when, fixing the bank alone would not stop
  the fault recurring. Read the activity's `generator` in `activities.md` to decide.

## Reporting

Grouped by activity. Each finding gives its label, its mark, which check it fails,
what is wrong, and what would fix it. The label is the question's,
`<activity-id>/<scenario-id>/<question-id>`; for a `scenario` finding,
`<activity-id>/<scenario-id>`; for a `generator` finding, the activity id.

Then what you checked and found nothing wrong in: per activity, how many scenarios and questions
you read. A bank check that returns "no findings" without saying what it read is
indistinguishable from one that didn't run.

Empty is a good outcome. A finding manufactured to look thorough costs the instructor a
decision at stop 2.

## Depends on

- [`curation`](workflows/learn/skills/curation/SKILL.md) - skill
- [`survey.mjs`](workflows/learn/tools/survey.mjs) - tool
- [`slots.md`](workflows/learn/skills/goal-setting/references/slots.md) - reference
