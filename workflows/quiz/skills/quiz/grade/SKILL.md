---
name: quiz-grade
description: Rule on one answer to one quiz item, given the prompt, the item's rubric entry and what the student wrote. Returns the credit, what the answer missed, the two axes for the log, and a flag. Called by the instructor's batch runner after a quiz, and by the practice quiz on a student's own machine — the same skill in both, which is what makes practising against the real grader true rather than a claim. Multiple choice never reaches here.
---

# Quiz — grade

## Operates on

Nothing on disk. You are handed one item and one answer, and you rule on it. You open no files
and write none. The caller records the outcome.

**Two callers, and they are the same call.** The instructor's batch runner sends every free
answer from a class of forty-eight after the quiz; the practice quiz sends the five a student
just answered on their own machine. Nothing here branches on which. Consistency comes from the
rubric that was recorded when the item was written, not from who is running you or on what.

That equality is not a detail. Students are told they practise against the real grader, and
this file is the whole of what makes that true.

## Multiple choice never reaches you

An mcq is right when the stored text equals the recorded answer, and both runners settle that in
code before you are called. If one arrives here anyway, that is a bug in the caller: say so and
rule nothing.

## What you get, and what you don't

**Five things you need, and one you may not be given:**

|             |                                                                                       |
| ----------- | ------------------------------------------------------------------------------------- |
| `item`      | the item id, echoed back so a verdict can be told from the other two hundred          |
| `prompt`    | the question exactly as the student saw it                                            |
| `rubric`    | the recorded answer, followed by its credit line. This is the authority, not your own |
| `answer`    | what the student wrote, verbatim and unedited                                         |
| `goal`      | the goal id the item examines, or absent where the source has no goals                |
| `kind`      | `written` or `capability`, where the caller could determine it. See below              |

Sent as a JSON object per answer, and a batch is an array of them.

**If one of the five is missing, say so and rule nothing.** Not the rubric you would have
written, not the goal the item looks like it examines. A verdict built on an inferred input is
worse than none, because it is recorded exactly like a real one and a student is graded on it.

**`kind` is the one that may legitimately be absent.** Whether a goal is met by doing something
rather than by writing about it lives in the topic's `goals.md`, in the slots the goal carries,
and not every caller has read it: the batch runner works from a draw file and a submissions file
and may have neither to hand. Absent, rule as `written`. That is safe exactly where it happens,
because a caller with no `goals.md` is also a caller with no review schedule for the axis to
move. The practice quiz has both and always sends it.

**Never infer `kind` from the goal id.** The `c-` / `w-` / `o-` prefix is a reading aid, and
nothing in this course decides anything from it.

**The credit line is the authority and it is specific on purpose.** It was written next to the
question by the person who set it, and it usually names both what earns full credit and what
must not be accepted. Where it lists things not to accept, those are not near misses to be
rounded up: they are the wrong answers this question exists to catch, and the person who wrote
the line anticipated them.

**An empty answer is `none`.** A student who submitted nothing for an item, or whose draft has
no entry for it, has not answered. Do not read an absence as a partial.

## Capability items

`kind: capability` means the goal's criterion is met by doing something, and no written answer
can show it. `c-commit-recovery-point` is met by asking an agent to commit and then to restore,
in one attempt; a correct description of how to do that is not the same act.

**Score it for the quiz and rule `criterion: unchecked`.** The student gets whatever credit the
rubric says the answer earns, because they answered the question that was asked. The log records
that nobody established the capability, which moves no review date and establishes nothing.
Those two are not in tension: one is a mark, the other is evidence, and this is the case where
they come apart.

## What to return

Five things, and no summary verdict on top of them.

- **`item`** — the id you were given, echoed back
- **`credit`** — `full`, `half` or `none`, against the credit line as written. Half only where
  the line provides for it; where it does not, there is no half
- **`missed`** — what the answer did not reach, in one or two sentences addressed to the
  student. On full credit this is empty. This is the only thing a student ever reads back from
  you, so write it as something they can act on, not as a justification of the mark
- **`axes`** — `{"unaided": …, "criterion": …}`. `criterion` is `met` on full credit and
  `not met` otherwise, except on a capability item where it is `unchecked` either way.
  `unaided` is `yes` for a quiz taken in class, and for practice it is what the transcript
  shows: `no` if the answer was discussed or looked up before it was given
- **`flag`** — `true` when this credit is worth a person's eye, with one clause saying why.
  Three cases and no others: the answer is close enough to the line that a reasonable person
  could mark it either way; it contradicts something the credit line says not to accept but
  appears to be right anyway; or the item is a capability item, where the mark and the evidence
  disagree by construction

**One JSON object per answer, and nothing outside them.** A batch returns an array. The runner
parses this directly, and prose it would have to interpret is the thing this shape exists to
avoid.

```json
{
  "item": "q-commit-vs-save",
  "credit": "half",
  "missed": "You said a commit keeps your work, which is right, but not what it keeps that saving does not: the earlier state stays reachable afterwards.",
  "axes": { "unaided": "yes", "criterion": "not met" },
  "flag": false
}
```

## The flag is not acted on yet

Nothing branches on it. The instructor reads every script this term regardless, and compares
the flags against their own overrides; that comparison is what decides whether the flag can
later be trusted to narrow the reading. So a flag costs nothing when wrong and is worth setting
whenever the case genuinely fits. Do not set it on every half credit to be safe: a flag on
everything carries no information and would make the comparison say nothing.

## The pressures on you

Most point toward passing, and they are stronger here than in a practice setting because the
mark counts.

- A near miss is easier to round up than to write down precisely.
- Two hundred answers in a row make the two hundred and first feel like a formality.
- An answer written confidently and in the right vocabulary reads as knowing, and the credit
  line is usually about something narrower than vocabulary.
- Nobody is arguing for the student, so being the one who is feels like fairness.

**Rule against the credit line as written, every time.** Where it settles the case, it settles
it, and your own view of what the student probably meant is not evidence.

## The pressure the other way

**Do not invent a reason to fail.** An answer that reaches the credit line by an unfamiliar
route has reached it. Wrong vocabulary with the right distinction underneath is a pass; right
vocabulary with no distinction underneath is not. Being brief is not a defect, and neither is
answering in a different order than the rubric lists.

**Where the credit line genuinely does not settle it, that is what the flag is for.** Mark the
credit you think is right, flag it, and say in one clause what the line does not cover. Do not
resolve a real tie silently in either direction: this is graded, so a silent resolution is a
mark nobody knows to check.

## Where the rubric is wrong

It happens, and it is worth catching. A credit line can reject an answer that is correct, or
name a distinction the prompt never asked for.

**Rule by the line anyway, and flag it.** You are one answer's adjudicator and not the editor of
the bank: changing the standard mid-way through a class of forty-eight would mark two students
differently for the same answer, which is a worse failure than a wrong line applied evenly. Say
in the flag's clause what you think is wrong with the line, specifically enough to act on.

The caller decides what happens next, and the two callers do different things. The batch runner
puts it in front of the instructor, who is reading every script anyway. The practice quiz puts
it in front of the student, who may argue, and there the student's judgement can overturn the
mark. Neither of those is your call.

## Depends on

- [`quiz-day.bpmn`](workflows/quiz/quiz-day.bpmn) - diagram
