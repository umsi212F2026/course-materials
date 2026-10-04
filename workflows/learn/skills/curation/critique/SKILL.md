---
name: curation-critique
description: Judge a draft activities.md — whether entries can be run as written, whether check tasks would establish the criteria they claim, and whether the menu as a whole is sound. Returns a report and annotation text; writes nothing. Runs alongside curation-verify, which handles the checkable facts.
---

# Curation — critique

## Operates on

`<topic-dir>/activities.md` — that one file. You judge what is in it, not the folder around it.

You are told this directory. Do not choose it, and do not guess it from the working directory —
whatever invoked you established it already.

Nothing here has a definite right answer.

**The words are out of scope**, and so is the `a-words` entry that serves them, along with any
legacy stamp carrying `origin: generated`. A word's questions come from a fixed menu of moves,
not from this file; there is no menu to judge, no artifact to weigh, and no Coverage row.
Nothing covering them is a gap and nothing about them is a finding. Judge the Goals table and
the entries the generator wrote.

**Older entries with no `checks` are listed, not judged.** A reading, a walkthrough or an
exercise meant as practice before a check comes from before every activity was checkable, and
curation converts it on the course path. List each by id in your report, apart from the
findings, and write no finding or annotation about it one by one; a file-level annotation may
say how many there are.

**Work all four sections; each has its own unit.** §1 is every entry the generator wrote, §2
every one of those again, for its `checks`, §3 the file as a whole, §4 every `blocked` cell.

**Read only `goals.md` and `activities.md`**, plus anything they point at, and an activity's
bank folder if it has one, when you need them to judge an entry. You don't have access to the
conversation that produced them. The point of this pass is that you don't know what the author
meant: you can only see what they wrote, which is the position the tutor will be in.

**Write nothing.** You return a report; the orchestrator is the only thing that touches the
file.

**You are told which round this is, and it changes what you return.** On the **first**,
findings only — a revision follows, and annotations written now would describe defects that are
about to be fixed. On the **second**, findings and annotations both: nothing changes after you.

Produce **findings**, not a verdict.

## 1. Read each entry as the tutor would

With no knowledge of what the author intended:

- **Could you run this?** `learner does` and `tutor does` have to be concrete enough to act on.
  "Discuss the concepts" is not runnable.
- **Is it an activity or a resource?** If it could be satisfied by reading and nodding, the
  learner obligation is missing. Outside the orientation, a reading, a video or a walkthrough is
  a resource however good its obligation: it belongs in a question activity's `worked example`,
  and a new entry made of one is a finding.
- **Does `offer as` name a real difference** from its neighbors? "A good introduction" is not a
  characterization, and a menu whose candidates all sound the same is not a choice.
- **Could a generator be run from what's written**, without asking the author what they meant?
  What varies, what stays fixed, how hard, and which goals its questions bear on: all four, or
  the tutor is inventing them. On a course topic an agent drafts a bank from that text alone, so
  a gap here becomes a bank of questions testing whatever the drafter guessed.

## 2. Check the checks

Every activity carries `checks`. For each, read the criterion it names (resolving a reference
like `orientation` through `workflows/learn/skills/goal-setting/references/slots.md`) and ask
the question the author was too close to ask:

**Would passing this actually establish that criterion?**

An engaging exercise about the right subject that tests something adjacent will certify the
wrong thing, and nothing downstream will catch it. This is the most consequential finding
available in this pass. Say which part of the criterion goes untested, and whether
`doesn't show` admits it.

**Is the generator's goal mapping right?** `checks` may name several goals, and the generator
says which of its questions bear on which. Ask it of each goal in turn: would a question the
generator maps to this goal, answered in full, establish this goal's criterion? A mapping that
claims a goal its questions only brush against certifies that goal too easily; one that leaves
out a goal its questions plainly test leaves it unmet for no reason.

**Are the cases it states real?** For a goal with cases, the generator says which cases each
kind of its questions carries. Ask of each claim whether a question of that kind, answered in
full, really exercises that case. A case claimed but never reached passes untested, which is
the failure cases exist to stop. A kind of question carrying two cases that a learner could get
one right and one wrong on is a finding too: one ruling covers both, so it should be two kinds.

**If the activity's bank folder `tasks/<activity-id>/` holds a scenario**, read one and ask
whether it would test what the generator claims. A generator whose text reads well and whose
scenario tests something else is a finding against the generator, keyed to the entry. A
`kind:` or `bank:` line on an older entry is retired; it is not a finding.

## 3. Look at the menu as a whole

Findings that only exist at the level of the file:

- **Where does the mass sit?** If most candidates have the learner receiving rather than
  producing, the menu is bad however good each item is.
- **Is the variety real?** Four activities differing only in which chapter they use are one
  activity wearing four labels. Candidates for one capability should come from different types
  in [`../references/activity-types.md`](../references/activity-types.md); if they don't, say
  so.
- **Does each entry's `checks` hold?** Every activity carries one, and clears a goal's bar
  only if an _unaided_ attempt at it would establish the criterion. Completing a partial
  instance wouldn't, however unaided: the activity did part of the work. Such an entry is help
  on another activity's questions, not an activity, and that is a finding. A goal in `checks`
  that the questions don't establish certifies it too easily; one they plainly establish but
  `checks` leaves out leaves it unmet for no reason.
- **Are the candidates substitutes?** They're supposed to be — the learner does one, and either
  one can meet the goal. If two entries look like they'd have to _both_ be done, that criterion
  bundles two capabilities. Report it; the fix is upstream in `goals.md`, and catching it here
  is far cheaper than after a learner has passed one half and been told they're finished.
- **Does the depth match?** Compare against the depth in `goals.md`. Authoring tasks for a
  learner who only needs to read are over-scoped; the reverse leaves them short.
- **Does it match what they already have?** Someone starting cold needs a strong
  `worked example` behind the first questions; someone with related experience is being
  condescended to by one.
- **Do the goals all share a blind spot?** If every check for a goal leaves the same thing
  untested, its coverage is only apparent.

## 4. Is a blocked row really blocked?

You're the guard against premature surrender. For each `blocked` cell, ask whether the stated
reason holds — a criterion that can't be examined by anything constructible, a capability whose
criterion bundles two others.

If you can see a way to build it, the row isn't blocked and that's a finding. If you agree it
is, say so plainly; a second independent judgment is much better evidence than the first.

_(Whether a real artifact exists for a blocked row is `curation/verify`'s job, not yours.)_

---

## Reporting

Two parts, with different roles. Findings may prompt improvements to the activities.md file.
Annotations help the tutor make use of the file as it is. **First round: findings only.**

**Findings** — for the generator. Keyed to entry or goal id, most consequential first, each
saying what would fix it.

**Older entries**: each live entry with no `checks`, by id, and nothing more.

**Annotations** — text to be consumed by the tutor, who will never see your findings. Write
them as final prose, ready to be placed verbatim; the orchestrator positions them but won't
compose them. Three kinds, each keyed to where it goes:

- against an entry id — something the tutor should know that the entry doesn't say. A generator
  whose difficulty is underspecified, an artifact that's real but harder going than it looks.
- against a goal id — a coverage deficiency an empty cell can't express.
- for the file as a whole — skew, thin coverage, depth mismatch.

Write annotations for everything a tutor should know about the file you were given. It is the
file they will get.

Empty is a good outcome. "Nothing at file level" is a real answer; manufacturing an observation
to look thorough costs the tutor attention on every read.

## Depends on

- [`slots.md`](workflows/learn/skills/goal-setting/references/slots.md) — reference
