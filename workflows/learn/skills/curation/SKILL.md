---
name: curation
description: Run the curation phase — stamp an entry for every goal that supplies its own activities, generate candidates and check tasks for the rest into activities.md, have them checked by a separate agent, and take one revision round. Use after goal setting has produced goals.md, and again when the tutor has dropped enough candidates that study is short of options.
---

# Curation

## Operates on

`<topic-dir>` — one topic folder, whose `activities.md` you are filling in.

You are told this directory. Do not choose it, and do not guess it from the working directory —
whatever invoked you established it already.

Orchestration. The work is in the steps below; you decide what runs, in what order, and when to
stop. You are also the **only thing that writes to `activities.md`** once generation is done,
which is what lets checkers run in parallel without treading on each other.

The sequence looks deterministic enough to be a program and isn't. Several junctures need
judgment: whether a blocked row is genuinely blocked, whether a report is severe enough to
justify a second revision, how to reconcile findings that disagree.

**What you don't do:** compose annotations — you haven't read the file and the checker has, so
writing notes from its findings would mean describing things you never saw. Place the text it
wrote, verbatim. And don't edit the substance of any entry; that's the generator's.

## Preconditions

`<topic-dir>/goals.md` exists and has at least one goal in the **default group** —
`capabilities`. A file with words and an orientation and nothing else is what `add-topic`
leaves behind: goal setting hasn't run, this phase has nothing to derive from, and you should
stop and say so.

## Every goal gets an entry; two kinds of entry

**A goal whose `supply` slot is `curated`** — the default — is what this phase is for. Its
activities are real things a learner does, found and characterized by `curation/generate`, and
they are what the Goals and Coverage tables are about.

**A goal whose `supply` is anything else produces its own activities**, and there is nothing
here to curate: no artifact to verify, no menu to choose among, no criterion to critique. What
it gets is **one stamped entry**, so that every goal is reachable through the same lookup and
review never has to ask what kind of goal it is looking at.

One supply per goal, so the two are exclusive: a goal is either this phase's work or it isn't.

```
### `a-w-schema`

- **origin:** generated
- **serves:** `w-schema`
- **checks:** `w-schema`
- **learner does:** whatever the goal's supply instantiates — see
  workflows/learn/skills/goal-setting/references/vocabulary-moves.md
- **offer as:** the only candidate; which move gets set is the supply's, not this entry's
```

The id is `a-` plus the goal id, which cannot collide and is obviously not something anyone
wrote. `origin: generated` is what tells `verify` and `critique` to skip it, and the tutor
never to drop it.

**Stamping is idempotent, so do it every pass, first.** A goal with a non-default supply and no
entry gets one; a goal that already has one is left alone. Adding a word mid-topic is one line
in `goals.md` and no conversation, so this is how the entry catches up.

## Sequence, for the curated goals

The learner is not involved in this phase and should not be interrupted during it.

0. **Stamp.** One entry for each goal whose `supply` is something other than `curated` and
   which hasn't got one, as above. Those goals get no Goals row and no Coverage row.

1. **Generate.** Run `curation/generate`. It reads the file and fills whatever the Coverage
   table shows is missing — an empty skeleton just means everything is.

2. **Check.** Run `curation/verify` and `curation/critique`, each **in a fresh context, as a
   separate agent**, with `goals.md` and `activities.md` and nothing from step 1 — not its
   reasoning, not this conversation. The isolation is the point: the value of a check is that
   the checker doesn't know what the generator meant, and passing along context destroys it.

   **Tell `critique` this is the first round.** It writes no annotations on a file about to be
   revised.

   Run them concurrently. Neither writes, and neither needs the other's results. `verify`
   handles what has definite answers — artifacts real, ids resolving, fields present, the
   Coverage table matching. `critique` handles what doesn't — could a tutor run this, would
   passing this establish the criterion, is the menu sound. Splitting them also stops one agent
   doing twenty link resolutions and then judging the criteria tired.

   **Three things come back, and each is handled differently.**

   **Artifact markers, from `verify` — into the file now.** `verified: <date>` on each artifact
   it confirmed, `NOT VERIFIED — <what couldn't be checked>` on each it couldn't settle.
   Nothing on the ones it found _wrong_: those are findings, and a fixed entry gets a new
   artifact with no marker. These aren't comments on defects the generator might resolve,
   they're facts that stay true — and step 4's check pass reads them to know what it can skip,
   so holding them back would cost the whole second verification. If `generate` changes an
   artifact in between, it clears that marker itself.

   **Findings, from both — merged and held for step 3.** Merge by id. Each checker works a
   fixed list of sections and the two lists don't overlap, so neither decides what's in scope
   and neither can leave a question to the other.

   **No annotations come back.** `critique` writes none on the first round, because none of
   them would ever be placed.

3. **Revise, once.** Hand the findings from step 2 back to `curation/generate`; being given
   findings is what tells it to work them rather than to look for gaps. It may push back on one
   rather than acting on it — that's allowed, and its reasons come back to you rather than
   being buried in the file.

4. **Check again**, same way, on the revised file — telling `critique` this is the second
   round, so annotations come back this time. `verify` skips whatever already carries a recent
   marker, which is most of it.

5. **Land the second report. All three streams, and this time findings land too.**

   _Markers_ — into the file, as in step 2.

   _Annotations_ — placed verbatim, against entries, against Coverage rows, and as the
   file-level block. These are the only ones you will ever have; a file covered in notes about
   problems the generator already fixed would teach the tutor to ignore all of them.

   _Findings, from the second report._ `critique`'s need no action — it writes the tutor-facing
   version of the same defects as annotations, and you've just placed them. For each of
   `verify`'s, write `status: dropped — <the finding>` on that entry. `status` is yours to set;
   entry substance stays the generator's.

   **Regenerate the Coverage table if you dropped anything.** It's derived from the entries, so
   a drop leaves it claiming a check that no longer exists. A goal left with no live check is a
   gap, not a blocked row — it shows as an empty cell, and the tutor reporting it is what
   brings this phase back.

   **Never drop a stamped entry**, whatever a checker says about it. They are told to skip
   those; if one comes back with a finding, the finding is about the supply and belongs in your
   reply rather than in the file.

6. **Clear the queue, one line per goal.** This is the step that makes the phase terminate, and
   it is not optional.

   ```
   node workflows/learn/tools/record-status.mjs <topic-folder> curated <goal-id>
   node workflows/learn/tools/record-status.mjs <topic-folder> blocked <goal-id> --needs goal-setting --why "<what has to change>"
   ```

   **Every goal you were invited here for gets exactly one of those.** `curated` for one that
   now has live entries — including a goal you only stamped in step 0. `blocked` for one you
   couldn't build anything for, with the reason, which goes to the learner in a goal-setting
   conversation.

   **There is no third outcome.** A goal you leave on the queue is a goal `learn` invites this
   phase back for, silently, forever — with nobody present to fix what is actually wrong with
   it. That dead end is why this log exists.

   Nothing else needs seeding. A goal exists because it has an entry in `goals.md`, and where
   it stands is derived from `evidence/attempts.jsonl` by `workflows/learn/tools/survey.mjs` —
   a goal with no attempts reads as _not started_ without anyone having written that down. The
   only copy you make is the one into `activities.md`'s Goals block, and that copy takes its
   ids from `goals.md` rather than minting them.

7. **Stop.** Everything the second report said is now in the file — as a marker, an annotation,
   or a drop. Nothing is carried in your head and nothing was discarded. A weakness the tutor
   can see beats another round of polish, and the second round has sharply diminishing returns.

   One revision is the rule, and it's yours to break — but only for a finding that would
   _mislead_ a learner rather than merely underserve one: a check task that certifies the wrong
   thing, an artifact that's wrong rather than unverifiable. "Could be better" is never
   grounds. If you take a third pass, say why.

## When to run this phase again

Not on a schedule, and not on your own reading of the folder. **Run it when the queue says so**
— `workflows/learn/tools/survey.mjs` lists a goal outstanding with `needs: curation`, and
`learn` spawns this in the background. Three things put a goal there:

- **A goal was added** — by goal setting, or by `new-word.mjs`. Those arrive `goal-added`.
- **A tutor ran out of candidates** — enough entries picked up `status: dropped` that a goal
  has no live check activity, or nothing left to do before one.
- **A review sitting found a goal with no live entry to check it with.**

The middle one is why the drop reasons have to be specific: they are the only feedback this
phase ever gets, and the queue entry says a goal is short, not what was wrong with what it had.

Adding a word is the cheap case: step 0 stamps its entry, steps 1 to 5 find nothing to do, and
step 6 clears it.

A re-run needs no special handling: step 1 sees a file with gaps and fills them, keeping every
id and skipping anything marked dropped. Step 2 checks the whole file, not just the additions —
a new activity can leave an old one redundant.

## Blocked rows

`curation/generate` may report a goal it can't build activities for — no verifiable artifact
exists, or the criterion can't be examined by anything constructible, or it bundles two
capabilities. The checker will have tried independently before you accept it.

These are the one thing in this phase that has to reach the learner. Every case is a defect in
`goals.md`, which is theirs and which nothing outside a goal-setting conversation may change.
Don't paper over it and don't let study start on a goal that can't be checked.

**Record it, don't just report it**, because you may well be running in the background with
nobody there to report to:

```
node workflows/learn/tools/record-status.mjs <topic-folder> blocked <goal-id> --needs goal-setting --why "<what has to change>"
```

`--needs goal-setting` is what routes it to the learner rather than back here. The `--why` is
what they will be shown — write what would have to change about the goal, not what generate
found difficult.

It used to go in a Coverage cell that nothing read, which is how the case that _required a
human_ ended up with no channel while the case an agent could fix alone had one.

## Depends on

- [`add-topic`](workflows/learn/skills/add-topic/SKILL.md) — skill
- [`critique`](workflows/learn/skills/curation/critique/SKILL.md) — skill
- [`generate`](workflows/learn/skills/curation/generate/SKILL.md) — skill
- [`verify`](workflows/learn/skills/curation/verify/SKILL.md) — skill
- [`learn`](workflows/learn/skills/learn/SKILL.md) — skill
- [`record-status.mjs`](workflows/learn/tools/record-status.mjs) — tool
- [`survey.mjs`](workflows/learn/tools/survey.mjs) — tool
- [`vocabulary-moves.md`](workflows/learn/skills/goal-setting/references/vocabulary-moves.md) —
  reference
