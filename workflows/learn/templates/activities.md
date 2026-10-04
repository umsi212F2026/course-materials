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

  VOCABULARY IS ONE ACTIVITY, `a-words`, an ordinary entry that serves every word through its
  group, those added later included. Curation writes it, exactly as below, when the topic has
  words and no such entry; its generator is
  workflows/learn/skills/goal-setting/references/vocabulary-moves.md, and a course topic's bank
  holds one scenario file per word, tasks/a-words/<goal-id>.md:

      ### `a-words`

      - **serves:** group vocabulary
      - **generator:** the five moves in `workflows/learn/skills/goal-setting/references/vocabulary-moves.md`, set for one word at a time from its `what it names`, `nearest confusable` and `synonyms`. Each question names that word's goal and carries its move.
      - **learner does:** answers one short question about one word
      - **tutor role:** examiner
      - **tutor does:** sets the question as served, without rewording it or hinting; when the bank has nothing for the word, sets one move live, as vocabulary-moves.md describes
      - **offer as:** not offered as a choice; a word's question is set when that word is studied or due

  LEGACY STAMPS. An older file may hold entries carrying `origin: generated`, placeholders that
  curation once stamped for each word. They are retired: nothing serves from one, survey skips
  them, and workflows/learn/tools/migrate-words.mjs removes them. Never write one; leave an old
  one alone until that tool runs.

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
  SERVES: every goal except the words. That is what this phase is for: finding real things for
  a learner to do.

  A word is NOT copied here and gets no Coverage row. The `a-words` entry serves it through
  its group, with a generator that is fixed, so there is nothing to choose among and no gap a
  Coverage row could show.

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

  ONE ROW PER GOAL IN THE TABLE ABOVE, in the same order. `a-words` doesn't appear here and
  neither do the words it serves; nothing is ever missing for those.

  study   live activities whose `serves` includes this goal and which are not checks
  checks  live activities whose `checks` names this goal, or whose bank holds a question
          whose rubric `goal:` names it
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
  a sentence or more, which table cells can't hold, and check activities carry three fields
  the others don't, which a table would render as columns of empty cells indistinguishable
  from unfilled ones. The Goals block above is a table for the opposite reasons: short
  values, same shape every row.

  FIELDS. Every activity has `serves` through `offer as`, and one that sets questions has a
  `generator`. `status` appears only once the activity is dead, and `origin` only on a legacy
  stamp, which nothing writes now. The block after those applies only to activities that can
  finish a goal: the ones carrying `checks`.

  serves        goal ids from the table above, or `all`: which goals this helps with. An item
                may also be `group <name>`, which stands for every goal in that group, those
                added later included. A group no goal is in is reported by survey.
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
                critique target, critic, role-play partner, examiner (sets a question cold and
                leaves the judging to the adjudicator), or none (the learner works
                alone and you wait)
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

  generator     the instruction for producing a fresh question: what varies, what is held
                fixed, how hard, and which of the goals in `checks` a question bears on.
                Every activity that sets questions has one, whether or not it carries
                `checks`. Precise enough to run, or to draft a bank from, without asking the
                curator anything. Where there is no bank the tutor runs it live, so every
                attempt is a new question.

  origin        omit. `generated` marks a legacy stamp from before `a-words`; see the note
                at the head of this file. Nothing serves from one and nothing new carries it.

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

  checks          the goals an unaided attempt at this activity's questions can establish:
                  one id or several, comma-separated, and always a subset of `serves`. An
                  activity can help with several goals while settling fewer. This is the
                  generator's declaration of what its questions bear on; in a bank, each
                  question's rubric `goal:` line narrows it to the ones that question bears
                  on. The pass condition is each goal's criterion from the table above,
                  applied as written; don't restate it here or the two will drift.

                  Omit it when an unaided attempt still wouldn't establish the criterion,
                  because the activity does part of the work itself: completing a partial
                  instance doesn't show they could produce one from nothing. Such an
                  activity is worth having; it just can't finish anything.

  worked example  what to show at the first level of help: a solved instance, or an
                  instruction to work one live and narrate the decisions
  doesn't show    what a pass here still leaves open, stated as a claim the checker can
                  contest. Both kinds belong: part of the criterion this activity doesn't
                  exercise, and what the criterion can't settle even when fully met: "only
                  one instance exists, so this doesn't show they could do it again."

                  "Nothing" is a legitimate entry. It's also a strong claim, so expect
                  curation/critique to test it.

  BANKS. An activity has a bank when tasks/<activity-id>/ and rubrics/<activity-id>/ exist (a
  tasks folder alone is an older study artifact, and is not read as a bank); the folders are the
  whole declaration, and the entry says nothing about them. Course topics have them, drafted
  from the generator and reviewed by the instructor at curation; a student's own topic runs its
  generators live. Even on a course topic, only an activity with `checks` whose generator
  invents its own material is banked: one that picks from real items or the learner's own work,
  an orientation rehearsal, and one without `checks` stay live, since the picker serves a bank
  whenever one exists. One file per scenario, with a twin under rubrics/:

      tasks/<activity-id>/<scenario-id>.md     the setup, then one `### <question-id>` per question
      rubrics/<activity-id>/<scenario-id>.md   the key, then one `### <question-id>` per question

  A file's top part, before its first `###`, is shared by that scenario's questions; nothing is
  shared across files. `main-bank` is the reserved scenario name for questions with no shared
  setup. Scenario files are named for their content (`crumbs.md`), question ids are unique
  within their scenario, and a question's label everywhere is its path,
  `<activity-id>/<scenario-id>/<question-id>`. workflows/learn/tools/next-item.mjs serves from
  banks, unseen questions first; workflows/learn/tools/survey.mjs reports a malformed bank, and
  a bank folder with no entry here.

  Each rubric question section carries:

      goal:        ids from `checks`, comma-separated
      answer:      what a complete answer says
      credit:      what full and half credit mean. A question naming two or more goals lists
                   one statement per goal, each starting `<goal-id>`: with the id in backticks
      type:        free (the default) or mcq; an mcq's question ends in a numbered list and
                   `answer` is the 1-based choice
      move:        for a word's question, its move
      tutor note:  optional; follow-ups for this one question, for the tutor only

  What holds for every question stays in the entry here. A note about one scenario goes in its
  key, and a note about one question in its `tutor note`.

  RETIRED: `kind` and `bank`. An older entry may still carry `kind: generator | bank | single
  instance` or a `bank:` line; ignore both. When curation converts the entry, any substance in a
  `bank:` line (where the items live, how they are named, how to pick) moves into `generator`,
  and a bare path or a `kind:` line is simply deleted. What was a single authored instance is a
  bank with one scenario, and if that is all a check has, say so in `doesn't show`.
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
