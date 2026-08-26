---
name: curation-generate
description: Fill in or revise activities.md — candidate study activities and check tasks derived from the goals and criteria in goals.md. Acts on checker findings if handed any, otherwise fills whatever the Coverage table shows is missing. Called by the curation orchestrator. Runs without the learner present.
---

# Curation — generate

**Status: draft.** Written 2026-08-16 during SI 212 workflow design. Not yet run.

## Operates on

`<topic-dir>` — one topic folder. It already exists — you are never the thing that creates one.

You are told this directory. Do not choose it, and do not guess it from the working directory —
whatever invoked you established it already.

You write candidate activities into `activities.md`, deriving them from `goals.md`. The file
already exists — the whole topic folder was created before any phase ran.

You are called by the `curation` orchestrator, which decides what runs when. Do your part and
return; don't invoke the checkers, don't decide whether the file is finished.

**The learner is not here.** Nothing in this phase is negotiated. You will hit points where the
right move seems to be asking what they'd prefer — don't. Produce both options and let the
tutor put the choice to them in context, which is a better moment to ask than now.

## What to do

**You are called twice in a curation run, and the two calls do different work.** Which one
you're in is settled by whether findings came with the call.

### First call: fill the gaps

No findings. **The Coverage table drives the work.** A row is complete when its `study` cell is
non-empty, its `checks` cell is non-empty, and its `notes` cell is empty. There are no
exceptions: every row is a goal with a criterion, including the orientation one.

**Coverage has a row per goal the orchestrator listed in the Goals table** — every goal whose
`supply` is `curated`. A goal supplied some other way is not there, has no row, and is not a
gap. Don't add rows and don't remove them; that table's membership is the orchestrator's.

1. Read the existing activity entries carrying `status: dropped`. They say what has already
   failed and why, and they're the only feedback this phase ever receives. Proposing a
   near-copy of something the tutor already killed is the most avoidable mistake available
   here.
2. Take an incomplete row, starting with the orientation goal if it's empty, and write
   candidate activities for it:

   - **The orientation row** is a goal like any other now, with a criterion — _the learner has
     indicated they could now attempt the real thing with the artifact still beside them_ — and
     an activity that can check it. The question it settles is concrete: **does this learner
     read or watch anything before they see a worked example or attempt a task?**

     Usually yes, and the content is predictable — an explanation to read or watch with a
     running check-my-understanding conversation as the obligation, which is _read or watch an
     explanation_ paired with _gloss the unfamiliar_, the pairing that stops the most passive
     type on the list from being passive.

     **Prefer an artifact that lays out the topic and its vocabulary together.** The words have
     their own supply and their own entries, so nothing here is required to serve them — but a
     first artifact that names them in place is what stands between just-in-time learning and
     swiss cheese. Read the word entries in `goals.md` when choosing. It is cheap: one artifact
     covers every word in the topic.

     Its `checks` entry is whatever the learner does that makes them say they could now attempt
     the real thing; the tutor adjudicates it, in session, which is why it can be cheap. Answer
     no only when _what I already have_ says they've seen the area laid out before; then the
     cell reads `n/a — already oriented` and they start at a worked example instead. Someone
     sent to acquire a shape they already have disengages, and quietly. **If the field doesn't
     settle it, answer yes** — an offered activity the tutor skips costs a sentence, and being
     dropped in cold costs the first session.

   - **Any other row**: read its criterion, then instantiate from
     [`../references/activity-types.md`](../references/activity-types.md) — a type plus a
     specific artifact plus what this learner does with it.

3. Repeat until every row is complete or blocked — see _When a row can't be filled_ for when a
   row may be blocked. A file holding only the template skeleton is the case where every row is
   missing, which is a difference of degree and not of kind.
4. Regenerate the Coverage table. It's derived from the `serves` and `checks` fields of the
   live entries, so anything you added or re-tagged has made it stale.

### Second call: work the findings

Findings came with the call. **They drive the work; the Coverage table doesn't.** Take them
entry by entry and stop — don't go looking for gaps you didn't create. The orchestrator matches
what comes back against what it handed you, and a revision that quietly does more makes the
second check pass read a different file.

- **Disagreeing is allowed.** Leave that entry alone and say why in your reply, rather than
  silently declining.
- **Some findings resolve by recording rather than fixing.** An artifact you can't verify keeps
  its flag; a check task with a real gap says so in `doesn't show`. That's a legitimate
  resolution, not a failure.
- **If a fix empties a Coverage row, write a replacement.** Replacing what your own fix removed
  is finishing the finding, not gap-hunting, and the replacement gets checked with everything
  else on the second pass. If no replacement can be built, the row is blocked — see _When a row
  can't be filled_.

Regenerate the Coverage table if anything you did changed a `serves` or `checks` field.

### Either call

- **Keep every existing id**, don't renumber, and never regenerate a dropped entry — that field
  exists precisely to stop you.
- **Leave stamped entries alone.** An entry carrying `origin: generated` was written by the
  orchestrator for a goal that supplies its own activities. There is nothing in it to improve,
  and it is that goal's only entry.
- **Name a new entry `a-` plus two to four words** — `a-annotate-unseen-specimen`. Aim at what
  the learner does in it.
- **Check it against everything already named in this topic** before you write it: the entry
  headings in this file, _including dropped ones_ and the stamped ones carrying
  `origin: generated`, and every goal in `goals.md`. Nothing checks you as you write — a
  duplicate surfaces later when `survey.mjs` walks the folder, and by then it has attempts
  pointing at it.
- **Ids are permanent.** Rewording an entry keeps its id. Replacing it genuinely means a new id
  and `status: dropped` on the old one, which is the rule the first bullet is enforcing.
- **If you change an entry's `artifact`, delete its `verified` line.** That marker says a
  specific source was confirmed real; left attached to a different one it's a lie, and the
  verify pass skips anything already marked. A missing marker is how it knows to look.

---

The rest of this file is about writing a good entry, which is what both calls come down to.

## Never name an artifact you haven't verified exists

A plausible-sounding chapter, a video that isn't there, a URL that 404s — these fail silently,
days later, in front of the learner, in the one phase with no human checking its output. It's
the mistake that ruins the phase, and it's yours to avoid.

If you can search, search, and confirm the thing is real and is what you think it is. If you
can't, or you're recalling a source rather than looking at it, say so in the entry:
`artifact: <thing> — NOT VERIFIED, tutor should check before offering`. An honestly flagged
guess is usable. A confident wrong one is worse than nothing.

The same applies to a bank: "exercises 3.1–3.20" is a claim about a book. Check it.

## Over-generate, don't choose

You cannot tell whether an artifact will orient this learner until they try it. Selection
happens in study, in context, by a tutor watching what actually helps. Your job is to make that
selection possible, not to make it in advance.

**Two to four candidates per goal**, plus one or two orientation activities serving everything.
Enough that the tutor has a real choice; not so many that the file stops being readable.

Don't rank them. **Characterize** them — `offer as` is what makes an unranked list usable, and
it must name a real difference. "A good introduction" is not a characterization. "Fastest, but
assumes you've seen a state machine before" is.

Padding to hit a count is worse than three good candidates. If a goal supports only two
sensible activities, write two.

**One entry per artifact**, never one entry listing alternatives. `offer as` works by
distinguishing a candidate from its neighbors, which needs the neighbors to exist as entries;
and a bad source has to be droppable on its own. Their obligations can differ too — what you'd
ask of someone watching a video isn't what you'd ask of someone reading a reference page.

**Candidates are substitutes.** Two entries serving the same goal are alternatives — the tutor
offers a choice and the learner does one. Never write two intending both to be done. For checks
this decides when the goal is met: an unaided pass on _either_ one clears its bar, not a pass
on each.

If a goal seems to need two genuinely different things done, that's not a relationship to
encode here — it's evidence its criterion bundles two capabilities. Say so in your reply and
write what you can. The fix belongs in `goals.md`, upstream, where splitting it is cheap.

## Choosing what the activity is

Match the depth. The _Depth_ section in `goals.md` names one of five — recognize it, read it,
modify something existing, author from scratch, judge someone else's work. If it says _read
it_, don't propose authoring tasks; a learner who only needs to interpret these things doesn't
need to make one.

Match what they already have. Someone starting cold gains more from studying a worked example
than from attempting a problem; someone with related experience gains more from the problem.
The _what I already have_ section in `goals.md` tells you which.

[`../references/activity-types.md`](../references/activity-types.md) lists the types grouped by
the `supports` value they serve.

Multiple candidates for each goal is desirable, and they should normally come from **different
types** — two instantiations of one type are a choice between chapters, not between approaches.
The orientation row is the exception: there the same type repeats, with different presentations
of the content.

Every entry says **what the learner does**. If it could be satisfied by reading something and
nodding, it isn't an activity yet.

## Check activities in particular

An activity carrying `checks` is adjudicated against exactly one goal's criterion, named in
`checks`. Read that criterion and ask: _would passing this actually establish it?_ It is easy
to write an engaging exercise about the subject that tests something adjacent — and neither you
nor the tutor will notice, because it will simply certify the wrong thing.

Prefer **generators**. A goal comes back in review for months after it's first met, so anything
that recurs benefits from fresh instances. A generator must be precise enough for the tutor to
run without asking you anything: what varies, what stays fixed, how hard.

Use a **bank** when items must be real, or when good ones take care to build and someone
already built them. Say how many and how to pick.

As a last resort, use a **single instance**. If it's just too hard to have multiple similar
tasks that demonstrate a capability, the fallback is to have the student repeat the same task.
This is the least desirable option because the student can memorize the solution, and should be
avoided if at all possible.

**Exercises you write yourself go in `tasks/`, not in `activities.md`.** A bank you authored is
a folder there; a single instance you authored is a file there. The entry points at it.

Nothing else goes there. A bank that already exists — a numbered exercise range, a folder of
real specimens — is referenced where it lives, and a **generator has no items at all**: the
tutor produces them when it runs the activity, which is the whole point of preferring one.

Fill in `doesn't show` honestly. It's what lets the tutor notice a goal is covered only by
tasks that all miss the same thing, and it's the one field where an admission costs you nothing
and a silence costs the learner.

## Failure modes in yourself

- **Inventing sources.** See above. This is the one that ruins the phase.
- **Everything at the passive end.** Reading and watching are easy to propose and easy to do.
  If most candidates have the learner receiving rather than producing, the menu is bad however
  good each item is.
- **Testing the topic instead of the criterion.**
- **Fake variety.** Four activities differing only in which chapter they use are one activity
  wearing four labels.
- **Asking the learner.** They aren't here.
- **Writing only for yourself.** A checker will read this cold, with no access to what you had
  in mind. An entry that works only because you remember your own intent comes back.

## When a row can't be filled

Sometimes the problem is upstream and no amount of ingenuity here will fix it. Write
`blocked — <why>` in the cell you couldn't fill, and say so in your reply. A blocked row ends
the loop for that capability; it does not end the phase.

The bar is high, because giving up is easier than the alternative and you will be tempted
early. A row is blocked only when:

- **No verifiable artifact exists.** You searched and there is nothing real to point at. Not
  "the good sources are behind a paywall" — that's a note, not a block.
- **The criterion can't be examined by anything constructible.** Goal setting was supposed to
  catch this, but a criterion can name what gets examined and still leave no way to examine it.
- **The criterion bundles two capabilities**, so nothing you write establishes it whole.
- **Depth and criterion contradict each other** — the criterion demands production, the stated
  depth is recognition, and satisfying either betrays the other.
- **Everything has already been tried.** On a re-run, every type that fits carries
  `status: dropped` and you have nothing meaningfully different left.

Two different types attempted and abandoned is the minimum before blocking anything.

Every one of these is a defect in `goals.md`, not in the activities — which means fixing it
needs the learner, since goals are theirs and you may not edit them. Say plainly in your reply
what would have to change. The orchestrator carries it back.

## What you return

**The file is your main output** — you write `activities.md` directly, so nothing about what
you added needs restating in prose. The reply carries what the file can't.

**Findings you declined.** Second call only. Which one, and why you left the entry alone. A
finding you silently ignored looks identical to one you handled, and the orchestrator is
matching your work against the list it gave you.

**Upstream defects, blocking or not.** Every one of these is a fault in `goals.md`, which is
the learner's and which you may not edit — so each needs the same three things: which
capability, what's wrong, and what would have to change.

- _Blocking_ — you wrote `blocked — <why>` in a cell because nothing could fill it. The
  conditions are in _When a row can't be filled_, above.
- _Non-blocking_ — you worked around it and wrote what you could. A criterion that bundles two
  capabilities is the usual case: you can serve half of it, and nobody downstream will see that
  half is all they're getting unless you say so here.
- _A supply that isn't working_ — a goal with a non-default supply produces bad instances, or
  none. There is no entry to fix and no finding to write, so this reply is the only place it
  can go.

The orchestrator carries these to the learner. They are the only thing in this phase that
reaches them, so a defect you noticed and didn't mention is a defect nobody ever fixes.

## Done when

Every Coverage row is complete or blocked — including `orientation` — and:

- Every goal in the Goals table has **at least one activity that isn't a check** — something to
  do before being checked is possible.
- Every `serves` and `checks` id **exists in the Goals table**, or is `all`.
- Every activity carrying `checks` **names a `kind`**, and any bank says how to pick from it.
- Every artifact is **verified, or explicitly flagged as unverified**.

`curation/verify` checks all of this and more — required fields, the Coverage table matching
the entries, the goal text not having drifted from `goals.md`. Aim at its bar rather than this
one; the list above is what you'd most easily leave undone.

Return when it holds, or when you've done what the findings asked — with the report above.

## Depends on

- [`curation`](workflows/learn/skills/curation/SKILL.md) — skill
- [`study`](workflows/learn/skills/study/SKILL.md) — skill
