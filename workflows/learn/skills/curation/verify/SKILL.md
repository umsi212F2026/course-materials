---
name: curation-verify
description: Check the facts in a draft activities.md — that named artifacts exist and are what they claim, that ids resolve, that required fields are present, and that the Coverage table matches the entries. Returns a report; writes nothing. Runs alongside curation-critique, which handles everything requiring judgment.
---

# Curation — verify

**Status: draft.** Written 2026-08-16 during SI 212 workflow design. Not yet run.

## Operates on

`<topic-dir>/activities.md` — that one file, checked against what it claims.

You are told this directory. Do not choose it, and do not guess it from the working directory —
whatever invoked you established it already.

Everything here has a definite answer. That isn't the same as mechanical — "does this chapter
cover gateways" has a right answer and takes reading to settle.

**Work all five sections; each has its own unit.** §1 is every artifact and every `blocked`
row, §2 every id an entry names, §3 every entry, §4 and §5 the file as a whole.

Sections 2 to 5 are mechanical and will likely become a program. Section 1 won't: confirming
that a source is what it claims to be needs an agent, and it's the part worth most.

**Read `goals.md` and `activities.md`, and open anything they point at.** A URL, a file under
`tasks/`, whatever an `artifact` names — you have to, since confirming a source is real means
looking at it. What's withheld from you is the generator's reasoning and the conversation that
produced the file, not access to what the file cites.

**Skip every entry carrying `origin: generated`.** Those were stamped by the orchestrator for a
goal whose `supply` slot produces its own activities — there is no artifact to resolve, no
required fields to check, and no Coverage row to match. An entry with no `artifact` and no
`kind` is a defect everywhere else and correct there.

**Write nothing.** You return a report; the orchestrator decides what to do with it and is the
only thing that touches the file. That's what lets you and the critique pass run at the same
time.

## 1. Artifacts

The job most worth doing carefully, because a bad citation is the failure this phase produces
most easily and detects least. Two questions, and the second matters more:

**Is it there?** Does the URL resolve, does that chapter or exercise range exist in that
edition, is the tool still live.

**Is it what the entry claims?** A renumbered chapter in a new edition, a video replaced with a
different one, a domain that lapsed and now parks ads — every one of these resolves fine.
Existence catches almost none of the failures worth catching.

**Read proportionally.** You aren't reading a book to check a citation. A page's own
description, its headings, a table of contents, the first screen — enough to tell whether the
entry's claim is supported or contradicted. If it's contradicted, that's a finding. If you
genuinely can't tell without reading forty pages, report it unconfirmable and say so; that's a
useful answer and pretending otherwise isn't.

Report each artifact as **confirmed**, **unconfirmable** with what you couldn't check, or
**wrong**.

**Skip anything carrying a `verified` date from the last month or so.** Re-resolving every link
on every pass is the slowest thing you do and buys almost nothing.

You have no way to tell whether an artifact changed since it was verified, and you don't need
one: whoever edits an artifact clears its marker, so a missing marker means check it. Retry
anything marked `NOT VERIFIED` — that's a record of failure, not of confirmation.

**Re-check any row blocked for want of a real artifact.** `generate` searched before blocking
it; you search again, independently, and a few minutes is enough. Finding a source is a
finding. Failing to find one is worth reporting too — two independent failures are much better
evidence than one, and a wrong block reaches the learner as "your goal needs revising."

Only that blocking condition is yours. A row blocked because its criterion can't be examined,
or bundles two capabilities, is `curation/critique`'s to re-check.

## 2. References resolve

- Every `serves` id is a goal in the Goals table, or `all`.
- Every `checks` id is a goal in the Goals table.
- Every goal in `goals.md` whose `supply` is `curated` — the default, so most of them — has a
  row in the Goals table. A goal supplied any other way has no row and never should; see §5.
- Every goal in the Goals table has a row in Coverage.
- Every id referenced in Coverage exists as an entry.
- No two entries share an id, and no entry id is also a goal id.
- Every goal whose `supply` is something other than `curated` has one live entry carrying
  `origin: generated`. A missing one is a finding for the orchestrator, not for the generator:
  stamping them is its job.

## 3. Required fields

Every live entry has `serves`, `supports`, `artifact`, `learner does`, `tutor role`,
`tutor does`, `done when`, `offer as`.

Every entry carrying `checks` also has `kind`, `worked example`, `doesn't show` — and if `kind`
is a bank, says how many items and how to pick from it.

A field that's present but empty is missing. Say which.

## 4. The Coverage table matches

Rebuild it from the `serves` and `checks` fields of the live entries and compare, cell by cell.
Dropped entries don't appear; `blocked` cells stay as they are.

It's supposed to be derived, so any difference means it's stale — and a stale Coverage table is
worse than none, because everyone downstream reads it instead of counting. Report the
differences specifically, not just that one exists.

## 5. Goal text hasn't drifted

The Goals table is copied from `goals.md`. Compare those two, id by id, text and criterion.
`goals.md` is authoritative; report any divergence as a defect in `activities.md`.

Where a criterion in `goals.md` is a **reference** — `vocabulary`, `orientation` — the copy is
the reference name, not the sentence it points at. That sentence lives in
`workflows/learn/skills/goal-setting/references/slots.md` and copying it here would be the
second definition site this design exists to avoid.

**A goal whose `supply` isn't `curated` has no row here and no Coverage row.** Its absence is
the design, not divergence.

---

## Reporting

Two parts.

**Findings** — for the generator's revision round. Each says what's wrong and what would fix
it, keyed to an entry or goal id.

**Verification results** — per artifact: confirmed, unconfirmable with what you couldn't check,
or wrong. The orchestrator writes these into the file as soon as you return, which is what puts
the `verified` markers there for the next pass to skip.

Report what you checked and found nothing wrong in, too. A verify pass that returns "no
findings" without saying what it ran is indistinguishable from one that didn't run.

## Depends on

- [`generate`](workflows/learn/skills/curation/generate/SKILL.md) — skill
- [`slots.md`](workflows/learn/skills/goal-setting/references/slots.md) — reference
