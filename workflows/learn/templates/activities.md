# Activities — <AREA>

Candidate activities for the study phase. More than will be used; the tutor chooses among them
with the learner.

<!--
  WHO THIS IS FOR. Written by the curation agent, read by the tutor agent. A human can read
  it and occasionally will — someone debugging the workflow, or the learner if they ask —
  so keep it legible. But write for the tutor: fields over prose, and everything it needs to
  actually run an activity rather than describe one.

  Delete these comments as you fill the file. Not for tidiness — they cost the tutor
  context on every read.

  This is the layout for <area>-<yyyy>-<mm>/activities.md in your learning-topics repository,
  which is created blank by
  workflows/learn/tools/new-topic.mjs before any phase runs. Don't edit this file; edit the copy.

  ONE FLAT LIST. No sections per goal — an activity can serve several, and orienting
  activities just serve all of them. The `serves` and `supports` fields are how the tutor
  narrows down.

  IDs are `a-` plus two to four kebab-case words, readable on their own —
  `a-read-unseen-diagram`, not `a-1`. The `a-` prefix is the one namespace rule that is
  load-bearing: goals.md's ids never start with it, and workflows/learn/tools/survey.mjs checks that.

  UNIQUE ACROSS THE TOPIC, not just across this file: these entries and every goal in
  goals.md. Nothing checks as you write — workflows/learn/tools/survey.mjs reports a duplicate the next time
  it walks the folder, by which point attempts point at it.

  They are STABLE. An id assigned once never changes, even if the wording it was derived from
  gets reworded later. If something is genuinely replaced rather than reworded, the
  replacement gets a new id and the old one gets `status: dropped`.

  GENERATED ENTRIES carry `origin: generated`. They are stamped by curation for a goal whose
  `supply` slot produces its own activities — a vocabulary word's moves come from
  workflows/learn/skills/goal-setting/references/vocabulary-moves.md, not from here — so there is no artifact
  to verify, no menu to choose among, and nothing to critique. The verify and critique passes
  skip them, and nothing drops one: it is that goal's only entry.

  Every entry says what the LEARNER DOES. A resource is not an activity: "read chapter 3"
  is not an entry, "read chapter 3 writing a one-line gloss for each unfamiliar term" is.

  CANDIDATES, deliberately more than will be used — you can't tell whether an artifact will
  orient someone until they try it. Don't rank them; characterize them, so the tutor can
  offer a real choice.

  Entries serving the same goal are SUBSTITUTES. The learner does one, not all of them, and
  for checks an unaided pass on either one meets the goal's bar. A goal that genuinely needs
  two different things done is a goal that should have been two, and the fix belongs in
  goals.md.

  Curation is agent-driven. Nothing here is negotiated with the learner.

  goals.md is authoritative. If a criterion here disagrees with the one there, fix this file.
-->

## Check notes

<!--
  Authored by curation/critique and placed by the orchestrator. Rewritten wholesale each pass,
  so don't edit it — it will be replaced.

  Dated, and short. What the tutor should know about this file as a whole before using it:
  the menu skews toward reading, two capabilities are thinner than they look, the depth
  runs heavier than goals.md asks for. Only things that survived the revision round —
  anything that got fixed doesn't belong here.

  Empty is a legitimate and good outcome. Say "nothing at file level" rather than inventing
  an observation.
-->

## Goals

<!--
  Copied from goals.md so the tutor doesn't need both files open. ONE ROW PER GOAL CURATION
  SERVES — every goal whose `supply` slot is the default, `curated`. That is what this phase
  is for: finding real things for a learner to do.

  A goal whose `supply` isn't `curated` is NOT copied here and gets no Coverage row. Its
  activities come from elsewhere; what it gets here is one generated entry, stamped by
  curation, carrying `origin: generated`. There is nothing to choose among and no gap a
  Coverage row could show. One supply per goal, so the two are exclusive.

  The `criterion` column is COPIED, and for a goal whose criterion is a reference rather than
  the learner's own text — `vocabulary`, `orientation` — copy the reference name. The
  sentence it points at is in workflows/learn/skills/goal-setting/references/slots.md and doesn't belong here
  in two places.

  The ids here are what `serves` refers to. They are COPIED FROM goals.md, not assigned here —
  goals.md is where a goal is named, and this table is a convenience copy of it. If an id
  here doesn't match one there, this file is the one that's wrong.
-->

| id                      | Goal | Criterion — what gets examined, and what counts |
| ----------------------- | ---- | ----------------------------------------------- |
| `o-orientation`         |      | `orientation`                                   |
| `c-read-unseen-diagram` |      |                                                 |

## Coverage

<!--
  DERIVED. Every cell here is computed from the `serves` and `checks` fields of the
  activities below — this table declares nothing. If the two disagree, the activities win
  and this table is stale.

  Regenerate it whenever activities are added, dropped, or re-tagged. It exists to restore
  the coverage view that was lost when activities became one flat list, and it's the first
  thing to read when deciding what's missing.

  ONE ROW PER GOAL IN THE TABLE ABOVE, in the same order. Generated entries don't appear here
  and neither do the goals they serve; nothing is ever missing for those.

  study   live activities whose `serves` includes this goal and which are not checks
  checks  live activities whose `checks` is this goal
  notes   authored by curation/critique, placed by the orchestrator. Usually empty. For deficiencies an empty cell can't
          express — most often that every check for this goal shares the same
          `doesn't show`, so the coverage is only apparent.

  Dropped activities don't appear. An empty `study` or `checks` cell is a gap, and that's
  the whole point of the table.

  A cell may instead read `blocked — <why>`, meaning curation tried and couldn't: no
  verifiable artifact exists, or the criterion can't be examined by anything constructible.
  That's a defect in goals.md rather than here, and it needs the learner to resolve.

  THE ORIENTATION GOAL is an ordinary row and always first, because it is first in goals.md.
  It is a goal like any other, with a criterion, an adjudicator and a bar — a row naming no
  goal could never finish. It carries the activities that serve `all` — the ones that give the
  learner the shape of the thing before any particular part is in play — and its `checks` cell
  is filled like any other.

  If `goals.md` says the learner is already oriented, its entry there will have been deleted
  and this row won't exist. If the entry is there but `what I already have` settles it, write
  `n/a — already oriented` in `study` and leave it. That's a complete row too.
-->

| goal                    | study | checks | notes |
| ----------------------- | ----- | ------ | ----- |
| `o-orientation`         |       |        |       |
| `c-read-unseen-diagram` |       |        |       |

---

## Activities

<!--
  One heading per activity, one bullet per field — not a table row. Several values run to
  a sentence or more, which table cells can't hold, and check activities carry five fields
  the others don't, which a table would render as columns of empty cells indistinguishable
  from unfilled ones. The Goals block above is a table for the opposite reasons: short
  values, same shape every row.

  FIELDS. Every activity has `serves` through `offer as`. `status` appears only once the
  activity is dead, and `origin` only on an entry curation stamped rather than wrote. The
  block below that applies only to activities that can finish a goal — the ones carrying
  `checks`.

  serves        goal ids from the table above, or `all` — which goals this helps with
  supports      one or more of:
                  orient   first pass; get the shape of the thing
                  deepen   build up a specific part, or connect it to what's known
                  attempt  do the real thing, with help available if asked for

                There is no separate "check" value. Every attempt is made the same way, with
                the tutor helping on request; whether an attempt turns out to have been
                unaided is an outcome, not a setting. What decides whether an activity can
                *finish* a goal is the `checks` field below — some activities can't, however
                unaided the attempt, because the activity itself does part of the work.
  artifact      what it is and where, and roughly how long it takes
  verified      the date curation/verify confirmed this artifact is real and
                is what the entry says it is. `NOT VERIFIED — <what couldn't be confirmed>`
                if it couldn't. Absent means nobody has looked yet.

                Anyone editing the artifact clears this — a marker attached to a different
                source than the one it was granted for is worse than none.
  learner does  the obligation, not just the resource — this is the field that makes it an
                activity rather than a reading list
  tutor role    the stance to take while this runs: explainer, socratic questioner,
                critique target, critic, role-play partner, or none — the learner works
                alone and you wait
  tutor does    during, and afterwards
  done when     for orient and deepen: the learner can attempt the real thing with the
                artifact still beside them. For an activity carrying `checks`: its criterion
                met with no help.
  offer as      what makes this one different from its neighbors — fastest, most thorough,
                assumes more background, hands-on rather than expository. This is what you
                say when presenting a choice, so make it a real distinction.
  check note    authored by curation/critique, placed by the orchestrator. Present only when there is
                something the tutor should know that the entry itself doesn't say — a
                generator whose difficulty is underspecified, an artifact that's real but
                harder going than it looks, a task that works but only once.

                Only for what survived the revision round; anything fixed leaves no note.
                curation/generate may delete a note whose cause it has fixed, and must not
                otherwise edit one. Each check pass rewrites them.

  origin        omit on anything you wrote. `generated` on an entry curation stamped for a
                goal whose `supply` produces its own activities — see the note at the head of
                this file. verify and critique skip those, and nothing drops one.

  status        omit while the activity is live — that's the default and needs no saying.
                When it stops being a candidate, `dropped — <why, and who>`: the curator
                writing it off as unworkable before anyone tried, or the tutor after it
                failed in practice — a source that oriented nobody, a task that turned out
                to test the wrong thing.

                Not progress. What's been attempted and how it went lives in
                evidence/attempts.jsonl; this field is only about whether the candidate is
                still worth offering, and it is the only place that question is answered.

                Dropped entries stay in the file. Deleting one means it gets regenerated
                next time curation runs, and this field is the only feedback curation
                receives. Trim a dead entry to its id, a line saying what it was, and this
                field; the rest is dead weight in the tutor's context.

  ONLY FOR ACTIVITIES THAT CAN FINISH A GOAL

  checks          the one goal id an unaided attempt at this would settle. Usually a single
                  id, and always a subset of `serves` — an activity can help with several
                  goals while only settling one. The pass condition is that goal's criterion
                  from the table above, applied as written; don't restate it here or the two
                  will drift.

                  Omit it when an unaided attempt still wouldn't establish the criterion,
                  because the activity does part of the work itself — completing a partial
                  instance doesn't show they could produce one from nothing. Such an
                  activity is worth having; it just can't finish anything.

  kind            generator | bank | single instance

  generator       the instruction for producing a fresh instance: what to vary, what to
                  hold constant, how hard. Precise enough to run without asking the curator
                  anything. The default for anything recurring — it never runs out, and
                  every attempt is a new item.

  bank            a set of ready items: `tasks/<folder>`, a numbered range in a book, a
                  folder of real specimens. Say how many there are and how the tutor should
                  pick — usually "any not yet used". The right choice when the items must be
                  real, or when good ones take care to build and someone already built them.
                  It can be exhausted, so say what to do when it runs low.

                  SAY HOW AN ITEM IS NAMED, because "any not yet used" only works if used
                  items can be told apart afterwards. Don't invent a scheme: the item already
                  has a name. A folder of files is named by filename; a numbered range in a
                  book by its number, which means something because this entry names the book.
                  Whatever you say here is what the tutor puts after the slash in the label it
                  passes to record-attempt.mjs — `<entry-id>/<item>` — and what a later
                  session reads back from served.mjs to avoid re-serving.

                  A generator needs none of this — every instance is fresh, so there is
                  nothing to have used up. A single instance is its own entry.

  single instance one item, `tasks/<file>` or a pointer to something real. Fine for a first
                  attempt, weak thereafter: a goal comes back in review for months, and the
                  same item on the third visit tests memory of that item rather than the
                  goal. If a check activity has only one instance, say so in `doesn't show`.

  worked example  what to show at the first level of help: a solved instance, or an
                  instruction to work one live and narrate the decisions
  doesn't show    what a pass here still leaves open, stated as a claim the checker can
                  contest. Both kinds belong: part of the criterion this activity doesn't
                  exercise, and what the criterion can't settle even when fully met — "only
                  one instance exists, so this doesn't show they could do it again."

                  "Nothing" is a legitimate entry. It's also a strong claim, so expect
                  curation/critique to test it.
-->

### `<activity-id>`

- **serves:**
- **supports:**
- **artifact:**
- **learner does:**
- **tutor role:**
- **tutor does:**
- **done when:**
- **offer as:**
