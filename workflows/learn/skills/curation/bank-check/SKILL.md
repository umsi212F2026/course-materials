---
name: curation-bank-check
description: Check a course topic's question banks question by question, in a fresh context. Each answer must be true of its scenario, each question answerable from the setup alone without giving its answer away, each goal's credit statement faithful to that goal's criterion, each mcq unambiguous, and each listed case really exercised and not bundled with one a learner could split from it, each question complete when drawn alone without its scenario's framing, and each worded to admit the answer its key gives; it also reports which cases each bank exercises and which it never does. Returns findings per label, each marked question, scenario or generator; writes nothing. Called by the curation orchestrator on the course path, after the banks are drafted.
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
mcq answer that is not one of its choices, a question naming no goal, a goal id that is not in
`goals.md`, a multi-goal question with no credit statement for one of its goals, a malformed or
duplicate case id, a `cases:` line naming a case its goal does not define or a goal the question
does not name, a question on a goal with cases that lists none for it, a bank folder with no
activity entry.
The orchestrator should have cleared these before calling you. Report any that name a bank
label, verbatim and marked `question` (or `scenario`, for one about a whole file), and then
check everything else anyway. Don't re-derive what survey checks; spend the reading on what it
can't.

**One mechanical check survey doesn't make: every id on a question's `goal:` line is in its
activity's `checks`.** For `a-words`, which has no `checks`, the ids must be words in group
`vocabulary`. Report any that isn't as a `question` finding. A question claiming a goal its
generator never declared collects evidence the generator was never reviewed for.

**For `a-words`, also check each word's bank against "What a word's bank holds" in
vocabulary-moves.md**: one DISTINGUISH question per entry on the word's `nearest confusable`
line, aimed at that entry, and one or two CATCH questions, at least one of them free. Report a
DEFINE, INTERPRET or APPLY question in a bank drafted under this rule, a confusable with no
DISTINGUISH question, a DISTINGUISH aimed at a synonym, a word whose only CATCH is an mcq, and an
mcq CATCH with a wrong choice that doesn't misuse the word. A word with no mcq CATCH is not a
finding: the drafter keeps one only when it comes out good. Across the topic's mcqs, report a
right choice that is the longest on most of them, or that sits in one position on most. In a released topic's older bank, list its DEFINE and INTERPRET
questions instead, for the instructor to decide at the course path's recuration.

## Every question, nine checks

For each `### <question-id>` in each `tasks/<activity-id>/<scenario-id>.md`, read the
scenario's setup (its top part above any `## Framing` line), its framing if it has one, the
question, the scenario's key (the top of its rubric file), the question's
rubric entry, and the criterion of each goal its `goal:` line names, with the goal's cases if
it has them, from `goals.md`, resolving a reference criterion through
`workflows/learn/skills/goal-setting/references/slots.md`.

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
   the rest, and not through a question written before it in the same scenario. Study serves a
   scenario's questions in file order, skipping one no longer needed, so a later question may
   reveal an earlier one's answer, but none may reveal a later one's. Nor may a question depend
   on another's answer to be answered, which a learner who skipped that one never saw. **Except
   in `a-words`**: every question in a word's file names that one word, so a later one is served
   only after a miss on an earlier one, once its feedback has been given, and an earlier question
   revealing a later one's answer is not a finding there.
5. **An mcq is unambiguous.** Exactly one choice is right, given the setup, and it is the one
   `answer` names (1-based). Each wrong choice is wrong for a reason the setup supplies, not on a
   technicality a careful learner could argue.
6. **Its cases are real, and not bundled.** For each goal with cases, does the question, answered
   in full, really exercise every case its `cases:` line lists? A case listed but not reached
   would be passed untested. And could a learner get one listed case right and another wrong?
   One ruling covers all of them, so such a question should be split, one per case.
7. **It stands alone when drawn.** A quiz shows the setup and this one question, never the
   framing and never another question, so checks 1, 2 and 5 judge against the setup alone.
   Read the setup and the question together, with no framing: is it a complete task that says
   how to answer? Report a setup that speaks of the questions as a set or says how to answer; a
   question that makes sense only through the framing or a sibling question; and framing that
   carries a fact an answer depends on, or says how to answer. Survey already reports the
   plainest wordings of these; this check is for the rest.
8. **Its wording fits the answer its key gives.** The question does not presuppose an answer of
   a shape the key rejects: asking which step decides something when the key says no step does
   and the omission is the answer, or asking for one cause when the key names two.
9. **A compound holds together.** A compound is one question in lettered `####` parts under a
   `###` stem. Apply checks 1 to 8 to each part, then ask: is each part's answer true of the
   scenario, worked yourself before reading its key; is each mcq part unambiguous with its
   choices balanced; does any part give another's answer away, since a learner sees all the
   parts at once; does the stem frame every part, so none needs a sibling to make sense; does
   it name exactly one goal, with every case its `cases:` line lists exercised by the parts
   together, and none a learner could get right while missing another. Survey reports the
   mechanical slips (parts out of order, a part with no rubric part, fewer than two parts, a
   goal or cases on a part, an image in a part); this check is for the rest. Mark a part's
   fault `question`.

## Marking each finding

Every finding carries one mark, which says what has to change:

- **`question`**: this question is at fault, and fixing or cutting it is enough.
- **`scenario`**: the setup, the framing or the key is, so every question in the scenario
  inherits it. A setup missing a fact, a key that contradicts the setup, a setup that speaks of
  the run or says how to answer, or framing that carries a fact or says how to answer.
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

Then, per activity, **the cases its bank exercises and the ones it never does**: for each goal
in its `checks` that has cases, each case with the number of questions listing it, and every
case listed by none. A bank that skips the hard case is seen here, before verify finds the gap
across the whole file. A question with no `cases:` line on such a goal predates the cases and
counts toward all of them; say how many there are.

Then what you checked and found nothing wrong in: per activity, how many scenarios and questions
you read. A bank check that returns "no findings" without saying what it read is
indistinguishable from one that didn't run.

Empty is a good outcome. A finding manufactured to look thorough costs the instructor a
decision at stop 2.

## Depends on

- [`curation`](workflows/learn/skills/curation/SKILL.md) - skill
- [`survey.mjs`](workflows/learn/tools/survey.mjs) - tool
- [`slots.md`](workflows/learn/skills/goal-setting/references/slots.md) - reference
