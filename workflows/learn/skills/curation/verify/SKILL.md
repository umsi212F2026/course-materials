---
name: curation-verify
description: Check the facts in a draft activities.md, that named artifacts exist and are what they claim, that ids resolve, that required fields are present, that the Coverage table matches the entries, and that every case of a goal is exercised. Returns a report; writes nothing. Runs alongside curation-critique, which handles everything requiring judgment.
---

# Curation — verify

## Operates on

`<topic-dir>/activities.md` — that one file, checked against what it claims.

You are told this directory. Do not choose it, and do not guess it from the working directory —
whatever invoked you established it already.

Everything here has a definite answer. That isn't the same as mechanical — "does this chapter
cover gateways" has a right answer and takes reading to settle.

**Work all six sections; each has its own unit.** §1 is every artifact and every `blocked`
row, §2 every id an entry names, §3 every entry, §4 and §5 the file as a whole, §6 every case of
every goal.

Sections 2 to 5 are mechanical and will likely become a program. Section 1 won't: confirming
that a source is what it claims to be needs an agent, and it's the part worth most. Section 6 is
half of each: a bank's `cases:` lines can be counted, a generator's text has to be read.

**Read `goals.md` and `activities.md`, and open anything they point at.** A URL, a file under
`tasks/`, whatever an `artifact` names — you have to, since confirming a source is real means
looking at it. What's withheld from you is the generator's reasoning and the conversation that
produced the file, not access to what the file cites.

**Skip the `a-words` entry and every entry carrying `origin: generated`.** The orchestrator
writes `a-words` from fixed text, for the words; a stamp is a legacy placeholder from before
it, which nothing serves from. Neither has an artifact to resolve, required fields to check, or
a Coverage row to match. An entry with no `artifact` is a defect everywhere else and correct
there.

**Write nothing.** You return a report; the orchestrator decides what to do with it and is the
only thing that touches the file. That's what lets you and the critique pass run at the same
time.

## 1. Artifacts

The job most worth doing carefully, because a bad citation is the failure this phase produces
most easily and detects least. Two questions, and the second matters more:

A reading or video that a `worked example` cites is an artifact too, and gets the same two
questions; its marker goes on that entry's `verified` line with the rest.

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

- Every `serves` id is a goal in the Goals table, or `all`, or `group <name>` naming a group some
  goal is in.
- Every `checks` id is a goal in the Goals table.
- Every goal in `goals.md` that is not a word has a row in the Goals table. A word has no row
  and never should; see §5.
- Every goal in the Goals table has a row in Coverage.
- Every id referenced in Coverage exists as an entry.
- No two entries share an id, and no entry id is also a goal id.
- If `goals.md` has any word, there is a live `a-words` entry carrying
  `serves: group vocabulary`. A missing one is a finding for the orchestrator, not for the
  generator: writing it is its job.

## 3. Required fields

Every live entry has `serves`, `supports`, `artifact`, `learner does`, `tutor role`,
`tutor does`, `done when`, `offer as`, `checks`, `worked example` and `doesn't show`, and a
`generator` if it sets the learner questions.

**An entry with no `checks` is an older shape**, from before every activity was checkable: a
reading, a walkthrough, an exercise meant as practice before a check. Don't report it as a
finding, which would get it dropped with nothing in its place. List it separately (see
_Reporting_); curation converts it on the course path.

**A banked activity's `checks` includes every goal its rubrics name.** Read the `goal:` line of
each rubric section under `rubrics/<activity-id>/`; a goal named there and missing from
`checks` is a finding. A live activity has no rubrics, so its `checks` stands as written.

`kind` and `bank` are retired. An older entry may still carry `kind: bank` or a
`bank: tasks/...` path; ignore both lines, and report neither as a finding nor as missing
anything. Whether an activity has a bank is whether `tasks/<activity-id>/` exists, and checking
that bank is not this pass's job.

A field that's present but empty is missing. Say which.

## 4. The Coverage table matches

Rebuild it from the `checks` fields of the live entries and compare, cell by cell; it has a
`checks` and a `notes` column and nothing else. An older table with a column for activities
that were not checks is stale: report it, and the rebuild drops that column. A goal's `checks`
cell also counts a live activity whose bank, `tasks/<activity-id>/`, holds a question whose
rubric `goal:` names it. Dropped entries don't appear; `blocked` cells stay as they are.

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

**A word has no row here and no Coverage row.** Its absence is the design, not divergence.

## 6. Every case is exercised

For each goal in `goals.md` with a `cases` slot, each of its cases must be exercised by some
live activity, live meaning not dropped. For a banked activity only its bank counts: a question
whose rubric `cases:` line lists the case for that goal. A generator's stated case counts only
for an activity with no bank. A case nothing covers is a finding, the same as an empty `checks`
cell, keyed to the goal and naming the case.

A banked question on such a goal with no `cases:` line was written before the goal had cases,
and covers none of them here, since which it exercises is only settled question by question in
study. Survey reports it, so don't report it again here.

---

## Reporting

Three parts.

**Findings** — for the generator's revision round. Each says what's wrong and what would fix
it, keyed to an entry or goal id.

**Older entries**: each live entry with no `checks`, by id, and nothing more. These are not
findings and nothing is dropped for them. An orientation entry among them (one whose `serves`
or `supports` makes it the topic's orientation) is marked as such: its conversion is only
adding `checks: o-orientation`, not a fold-or-drop decision for the instructor.

**Verification results** — per artifact: confirmed, unconfirmable with what you couldn't check,
or wrong. The orchestrator writes these into the file as soon as you return, which is what puts
the `verified` markers there for the next pass to skip.

Report what you checked and found nothing wrong in, too. A verify pass that returns "no
findings" without saying what it ran is indistinguishable from one that didn't run.

## Depends on

- [`generate`](workflows/learn/skills/curation/generate/SKILL.md) — skill
- [`slots.md`](workflows/learn/skills/goal-setting/references/slots.md) — reference
