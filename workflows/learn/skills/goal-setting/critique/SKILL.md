---
name: goal-setting-critique
description: Judge a draft goals.md that another agent has just finished writing with a learner — whether the capability rows cover the stated use, and how someone could pass all of them without having learned the thing. Returns findings; writes nothing. Called by goal-setting before the learner finishes.
---

# Goal setting — critique

## Operates on

`<topic-dir>/goals.md` — that one file, and nothing else in the folder. The isolation is the
point; see below.

You are told this directory. Do not choose it, and do not guess it from the working directory —
whatever invoked you established it already.

**Read only `goals.md`.** Not the conversation that produced it, not the interviewer's
reasoning, not any other file in the topic folder.

The isolation is the whole point here, more than in any other check in this workflow. The agent
that ran the interview proposed a good share of the criteria itself. Asked to critique them it
would be marking its own work, and the failure wouldn't look like a failure — it would look
like a critique that found the document sound. You can't reproduce its framing because you
never had it, which is the only reason your reading is worth anything.

It also puts you where the learner will be in three weeks: holding the document, with no memory
of what anyone meant by it.

**Write nothing.** You return findings. They go to the interviewer agent, who puts them to the
learner, who decides what changes. Nobody is obliged to act on any of this.

## Scope

Don't work through the fields one at a time. The interviewer applied a test to each as it went,
and a critique that comes back with a dozen field-level notes around one real finding buries it
— the learner discounts the lot. Goal setting that takes longer than the learning is a failure,
and you are part of its length.

But don't take a field as sound because it passed. The interviewer applied those tests under a
pressure you don't have: it was told to accept the shortest answer that passes and move on, and
to let the learner leave a field imperfect. So **report a field-level defect when it would
change what gets learned or what counts as having got there** — a criterion nobody could check,
a use so general nothing follows from it, a capability entry with no criterion beside it. Not
when the field could merely be tighter.

You are not judging whether the goals are ambitious, or whether the learner has chosen well.
They're their goals.

**The word entries are out of scope, with one exception.** Their criterion is the shared one,
fixed in [`../references/vocabulary-moves.md`](../references/vocabulary-moves.md) — so a
criterion you can't see there is not a finding, and neither is a short list. The exception is
an entry that isn't a word at all: if passing the standard vocabulary bar on it would still
leave the learner unable to do the thing it names, it's a capability written as vocabulary, and
it has escaped ever getting a criterion anyone thought about. That one is worth reporting, and
it's the only reason to read them.

**The orientation entry is out of scope entirely.** Every topic ships one, its slots are not
the learner's to negotiate, and nothing about it is a fact about this learner.

## The findings

Three, and they're the whole list.

- **A capability the stated use needs that no entry covers.** Read _what I'll use it for_, then
  ask what someone doing that would have to be able to do. An absence has no shape to notice
  field by field — every entry present can be sound and the set still be short one.

- **A blind spot.** A concrete route by which they could meet every criterion in the file and
  still not have learned it. **Name the route, not the possibility.**

  The test: **would this finding still fit if you pasted it into someone else's `goals.md`?**
  If it would, it isn't about theirs.

  _"These could be passed without really understanding it"_ fits every goals.md ever written,
  so it points at nothing. _"Both your capabilities are about reading the output — you could
  pass them by learning where the numbers sit on the page, and never once decide whether the
  model was the right one for the question"_ fits only this file, and tells them what to
  change.

  A route you can't describe that concretely isn't one worth reporting.

- **The strongest case for leaving it exactly as it stands.** Sometimes it's fine, and a
  critique with no counterweight gets discounted wholesale. Make this argument properly, not as
  a courtesy at the end.

## Reporting

Report all three, including any that turned up nothing — nothing is a real answer, and an
observation manufactured to look thorough costs the learner a turn. Key each to a goal id where
there is one, to the file where there isn't.

**No verdict.** The third finding is an argument, not a conclusion: make the case that the
goals are sound if they are, and still don't say whether the document is finished.

**No replacement wording.** Point at the defect and stop. A criterion you wrote and they
approved is your criterion with their name on it, which is what this phase exists to prevent.

Critique the document, not the learner.
