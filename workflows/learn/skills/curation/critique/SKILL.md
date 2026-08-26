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

**Goals that supply their own activities are out of scope**, and so are the entries stamped for
them — anything carrying `origin: generated`. A vocabulary word's activities come from a fixed
menu of moves, not from this file; there is no menu to judge, no artifact to weigh, and no
Coverage row. Nothing covering them is a gap and nothing about them is a finding. Judge the
Goals table and the entries the generator wrote.

**Work all four sections; each has its own unit.** §1 is every entry the generator wrote, §2
every one of those carrying `checks`, §3 the file as a whole, §4 every `blocked` cell.

**Read only `goals.md` and `activities.md`** — plus anything they point at, if you need it to
judge an entry. You don't have access to the conversation that produced them. The point of this
pass is that you don't know what the author meant — you can only see what they wrote, which is
the position the tutor will be in.

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
  learner obligation is missing.
- **Does `offer as` name a real difference** from its neighbors? "A good introduction" is not a
  characterization, and a menu whose candidates all sound the same is not a choice.
- **Could a generator be run from what's written**, without asking the author what they meant?
  What varies, what stays fixed, how hard — all three, or the tutor is inventing them.

## 2. Check the checks

For each activity carrying `checks`, read the criterion it names — resolving a reference like
`orientation` through `workflows/learn/skills/goal-setting/references/slots.md` — and ask the
question the author was too close to ask:

**Would passing this actually establish that criterion?**

An engaging exercise about the right subject that tests something adjacent will certify the
wrong thing, and nothing downstream will catch it. This is the most consequential finding
available in this pass. Say which part of the criterion goes untested, and whether
`doesn't show` admits it.

## 3. Look at the menu as a whole

Findings that only exist at the level of the file:

- **Where does the mass sit?** If most candidates have the learner receiving rather than
  producing, the menu is bad however good each item is.
- **Is the variety real?** Four activities differing only in which chapter they use are one
  activity wearing four labels. Candidates for one capability should come from different types
  in [`../references/activity-types.md`](../references/activity-types.md); if they don't, say
  so.
- **Should an activity carry `checks` that doesn't, or not carry it that does?** An activity
  clears a goal's bar only if an _unaided_ attempt at it would establish the criterion.
  Completing a partial instance wouldn't, however unaided — the activity did part of the work.
  Both errors matter: one leaves a goal unmeetable, the other certifies it too easily.
- **Are the candidates substitutes?** They're supposed to be — the learner does one, and either
  one can meet the goal. If two entries look like they'd have to _both_ be done, that criterion
  bundles two capabilities. Report it; the fix is upstream in `goals.md`, and catching it here
  is far cheaper than after a learner has passed one half and been told they're finished.
- **Does the depth match?** Compare against the depth in `goals.md`. Authoring tasks for a
  learner who only needs to read are over-scoped; the reverse leaves them short.
- **Does it match what they already have?** Someone starting cold needs worked examples before
  problems; someone with related experience is being condescended to by them.
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
