---
name: curation
description: Run the curation phase: write the a-words entry if the topic has words and lacks one, generate candidates and check tasks for the other goals into activities.md, have them checked by a separate agent, and take one revision round; on a course topic run by the instructor, also draft each activity's question bank and have them review generators and banks. Use after goal setting has produced goals.md, and again when the tutor has dropped enough candidates that study is short of options.
---

# Curation

## Operates on

`<topic-dir>` — one topic folder, whose `activities.md` you are filling in.
On the course path its `tasks/` and `rubrics/` folders take the banks too.

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

## Every goal is served by an activity; words share one

**Every goal but the words** is what this phase is for. Its activities are real things a
learner does, found and characterized by `curation/generate`, and they are what the Goals and
Coverage tables are about.

**The words are served by one ordinary activity, `a-words`**, whose generator is fixed and
which names them through their group, so there is nothing here to curate per word: no artifact
to verify, no menu to choose among, no criterion to critique. A topic with any word in group
`vocabulary` and no `a-words` entry gets this one, exactly as written:

```
### `a-words`

- **serves:** group vocabulary
- **generator:** the five moves in `workflows/learn/skills/goal-setting/references/vocabulary-moves.md`, set for one word at a time from its `what it names`, `nearest confusable` and `synonyms`. Each question names that word's goal and carries its move.
- **learner does:** answers one short question about one word
- **tutor role:** examiner
- **tutor does:** sets the question as served, without rewording it or hinting; when the bank has nothing for the word, sets one move live, as vocabulary-moves.md describes
- **offer as:** not offered as a choice; a word's question is set when that word is studied or due
```

**Writing it is idempotent, so check every pass, first.** Because it serves the group, a word
added mid-topic is covered the moment it is in `goals.md`, with no edit here. A course topic's
word questions are banked in `tasks/a-words/`, one file per word; a word with none there has a
move set live by the tutor.

**Older files may hold stamped entries** carrying `origin: generated`, one placeholder per word
from before `a-words`. Leave them alone: study and review ignore them, survey skips them, and
`node workflows/learn/tools/migrate-words.mjs <topic-folder>` removes them when the topic is
migrated. Never write a new one.

## Who runs it decides the path

**The plain path is the default: the steps below, and no banks.** It is what runs in the
background, spawned by `learn`, and what runs on any topic whose origin is not `course`. Its
generators are run live by the tutor, a fresh question every time, so there is nothing to draft
and nobody to wait for.

**A plain-path run never edits the generator of an activity that has a bank** (both
`tasks/<activity-id>/` and `rubrics/<activity-id>/`). That bank was drafted from the generator
and reviewed against it, and changing one without the other leaves questions nobody chose. If a finding would revise
such a generator, leave it as it is, and say so in your report: which activity, and what the
finding was. The next course-path run takes it up.

**The course path adds banks, and two stops for the instructor.** It runs only when both hold:
the topic is a course topic, and the instructor invoked you in this session and is there to
review. You are told which by whatever invoked you.

A topic is a course topic when survey reports its `origin` as `course` (read from the
`**origin:** course` line under the title of `goals.md`), **or** when every goal in `goals.md`
carries `- **origin:** course`. The second is how existing course topics look: they predate the
header. On such a run, _Converting older files_ adds the header first, and you run survey again
before going on, so everything after reads the topic as survey now reports it.

**If nobody said this run is the instructor's, it isn't**: a background run on a course topic
in a student's clone that stopped to wait for review would wait forever, and one that drafted
banks unreviewed would ship questions nobody checked.

Course topics are banked because study, review and the quiz all draw on the same questions, and
the quiz needs ones a person has read. A student's own topic needs none of that.

## Sequence

The learner is not involved in this phase and should not be interrupted during it. On the
course path the instructor is, at the two stops, and nobody else.

0. **Words.** If the topic has words and no `a-words` entry, write it, as above. Words get no
   Goals row and no Coverage row.

1. **Generate.** Run `curation/generate`. It reads the file and fills whatever the Coverage
   table shows is missing — an empty skeleton just means everything is.

2. **Check.** Run `curation/verify` and `curation/critique`, each **in a fresh context, as a
   separate agent**, with `goals.md` and `activities.md` and nothing from step 1 — not its
   reasoning, not this conversation. The isolation is the point: the value of a check is that
   the checker doesn't know what the generator meant, and passing along context destroys it.

   **Tell `critique` this is the first round.** It writes no annotations on a file about to be
   revised.

   Run them concurrently. Neither writes, and neither needs the other's results. `verify`
   handles what has definite answers: artifacts real, ids resolving, fields present, the
   Coverage table matching, every case of a goal exercised. `critique` handles what doesn't:
   could a tutor run this, would passing this establish the criterion, is the menu sound.
   Splitting them also stops one agent doing twenty link resolutions and then judging the
   criteria tired.

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

5. **Place the second report. All three streams, and this time findings are acted on too.**

   _Markers_ — into the file, as in step 2.

   _Annotations_ — placed verbatim, against entries, against Coverage rows, and as the
   file-level block. These are the only ones you will ever have; a file covered in notes about
   problems the generator already fixed would teach the tutor to ignore all of them.

   _Findings, from the second report._ `critique`'s need no action — it writes the tutor-facing
   version of the same defects as annotations, and you've just placed them. For each of
   `verify`'s, write `status: dropped — <the finding>` on that entry. `status` is yours to set;
   entry substance stays the generator's. `verify`'s list of older entries with no `checks` is
   not findings: drop none of them, since _Converting older files_ takes them up on the course
   path, and a plain-path run leaves them as they are.

   **Regenerate the Coverage table if you dropped anything.** It's derived from the entries, so
   a drop leaves it claiming a check that no longer exists. A goal left with no live check is a
   gap, not a blocked row — it shows as an empty cell, and the tutor reporting it is what
   brings this phase back.

   **Never drop the `a-words` entry or a legacy stamp**, whatever a checker says about it.
   They are told to skip those; if one comes back with a finding, the finding is about the
   vocabulary moves and belongs in your reply rather than in the file.

   **On the course path, the banks come next**, before step 6: see _The course path_ below.
   The generators are settled now, which is what makes them worth drafting from. On the plain
   path, go straight on.

6. **Clear the queue, one line per goal.** This is the step that makes the phase terminate, and
   it is not optional.

   ```
   node workflows/learn/tools/record-status.mjs <topic-folder> curated <goal-id>
   node workflows/learn/tools/record-status.mjs <topic-folder> blocked <goal-id> --needs goal-setting --why "<what has to change>"
   ```

   **Every goal you were invited here for gets exactly one of those.** `curated` for one that
   now has live entries, including a word the `a-words` entry serves. `blocked` for one you
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

## The course path

Between steps 5 and 6, and only when _Who runs it decides the path_ says so. It starts when the
instructor invokes curation directly, names the topic folder and says the run is theirs. That
folder is what this run operates on, with its parent as the `<data-dir>` survey takes, and
neither is inferred from anywhere else.

**Drafts stay on a branch until stop 2 is done.** Commit them on a branch of the topic's
repository and push nothing until the instructor has finished with the banks. That repository is
public, and a question nobody has reviewed must not be published by accident.

The layout every step writes is in `workflows/learn/templates/activities.md` under BANKS: one
file per scenario in `tasks/<activity-id>/` and its twin in `rubrics/<activity-id>/`, each
question a `### <question-id>` section, labelled `<activity-id>/<scenario-id>/<question-id>`.

**Any question activity may get a bank**, except these, which stay live with no bank:

- an activity whose generator picks from real items, or from the learner's own work (their own
  app, their own agent, their own chats);
- an orientation rehearsal.

The reason is the same for both. A bank would replace the learner's own material with
material someone invented, and the picker serves a bank whenever one exists, so the live
generator would never run again.

1. **Stop 1, generators.** For each live activity that gets a bank, run `curation/draft-bank`
   in `sample` mode: one scenario, its questions and its rubric, into that activity's bank
   folders. Run them concurrently; each writes only its own activity's folders. Then present
   each generator's text beside its sample, by path, and let the instructor react in the
   session.

   **Revise a generator by handing their feedback to `curation/generate` as findings.** The
   substance of an entry is still the generator's, even when the instructor is the one asking.
   A revised generator gets a fresh sample, and the instructor sees it before you move on. Its
   old sample is cut from both folders unless the instructor says to keep it: it was made by
   text that no longer exists.

   **A kept sample is the bank's first scenario,** so nothing about it is thrown away. One the
   instructor cuts is deleted from both folders.

   `a-words` takes part only for a word with no file in `tasks/a-words/`. Its generator is
   fixed text, so feedback on it is about the vocabulary moves, and goes in your reply.

   **Skip `a-words` entirely, here and in step 2, until `migrate-words.mjs` has run on the
   topic.** You can tell it hasn't when a single-file bank, a `tasks/<name>.md` with its
   `rubrics/<name>.md`, has a rubric entry whose `goal:` names a word. Drafting would create
   `tasks/a-words/`, and the migration then refuses to run, for good, leaving those questions
   stranded where nothing serves them as words.

   Why a sample at all: a generator's text reads well long after it has stopped producing good
   questions, and one scenario is the cheapest way to see what it actually makes. A fault found
   here costs one sample; found at stop 2 it costs a bank.

2. **Draft the banks.** One `curation/draft-bank` per activity that gets a bank (the same ones
   as stop 1, never the live-only kinds above), in `full` mode, as separate agents running in
   parallel. Each fills its bank to about three questions per goal in the activity's `checks`
   (for `a-words`, per word), unless the entry says otherwise, with every case of those goals
   exercised by some question, and keeps every scenario already there: the kept sample, and
   anything converted from an older file.

3. **Check the banks.** First the mechanical floor:

   ```
   node workflows/learn/tools/survey.mjs --dir <data-dir> <topic-folder>
   ```

   Its `problems` cover a scenario with no rubric file, a question with no rubric entry or two,
   duplicate question ids, mcq answers that aren't a choice, a question naming no goal, a goal
   id that isn't in `goals.md`, a multi-goal question whose credit has no statement for one of
   its goals, a `cases:` line naming a case its goal doesn't define, a question on a goal with
   cases that lists none for it, and a bank folder with no activity entry. Each has one right
   answer, so hand an activity's problems back to its drafter (`full` mode again) rather than to
   the instructor, and re-run until there are none. Survey does not say whether every case is
   exercised; `bank-check` and `verify` do.

   Then run `curation/bank-check` **in a fresh context, as a separate agent**, told the topic
   folder and nothing else: not the drafters' reasoning, not this conversation. It checks what
   survey can't, question by question, and its isolation is the point for the same reason it is
   in the sequence's step 2.

4. **Stop 2, banks.** Present the bank check's findings to the instructor, grouped by activity,
   each with its label. They keep or cut scenarios and questions; you make the cuts, deleting a
   question's section from both its task file and its rubric file, or a scenario's two files.

   **A finding marked `generator` is about the generator, not the bank**, and so is one the
   instructor reads that way. That generator goes back to stop 1. Once it is settled, only its
   activity's scenarios are redrafted (`full` mode, after cutting the ones it got wrong), and
   only they are checked again before coming back here. The other banks wait where they are.

5. **Return to the sequence at its step 6,** _Clear the queue_, which runs as it always does:
   `curated` for each goal.

   **After stop 2, the instructor decides when the branch is merged and pushed**, not you. Any
   conversions this run made go on the same branch, so they are published with the banks.

## Converting older files

On a course topic's next course-path run, the older shapes are converted. Goal ids never change,
so every recorded attempt still points at its goal. Run survey after each, and expect no new
problems.

- **The origin header, first of all, before step 0.** If `goals.md` has no `**origin:** course`
  line under its title, add one, and remove each goal's `- **origin:** course` stamp, which the
  header makes redundant. Leave any `- **origin:** learner`: it marks a goal a student added, and
  it is what keeps that goal out of the quiz. Then run survey again and confirm it now reports
  the topic's `origin` as `course`.
- **Word questions, before step 0, once quiz pools use the new keys (see the queue).** Run
  `node workflows/learn/tools/migrate-words.mjs <topic-folder> --dry-run`, read its summary,
  then run it without `--dry-run`. It moves banked word questions into `tasks/a-words/`, writes
  the `a-words` entry, and removes the legacy stamps and `supply` lines. It refuses on CR line
  endings, duplicate ids or unpaired ids; fix what it names and run it again. Earlier than the
  new keys, moving the questions would change what existing quiz sessions draw.
- **Capability questions left in `tasks/items.md`, before stop 1, behind the same gate.** Place
  each in the activity whose generator would produce it, as a scenario named for its content
  (or in that activity's `main-bank`, if it stands alone), moving the question and its rubric
  entry verbatim and keeping its id as the question id. Delete what moved from both items files,
  and the files once empty. A question no generator would produce is a gap in the generators:
  raise it at stop 1. Converting before the stops means the instructor sees these beside the
  samples, `full` mode counts them toward the target, and the bank check reads them like any
  other.
- **Key-file study banks, before stop 1.** A `tasks/X.md` with a `tasks/X-key.md` becomes the
  bank of the activity that pointed at it: the task file's shared material becomes the setup at
  the top of a scenario's task file and its cases become `### <question-id>` sections; the key's
  shared lists become that scenario's key, at the top of its rubric file, and the key's cases
  become per-question rubric entries, each with a `goal:` line (and a `cases:` line where its
  goal has cases): every banked question names a goal. Then delete the old pair. An activity
  that pointed at a study bank usually has no `checks`; it is converted as the next item says,
  and gains `checks` naming every goal its new rubrics name.
- **Activities with no `checks`, before stop 1.** Every activity but the orientation is now a
  source of questions, and every question names a goal. Hand each older entry without `checks`
  to `curation/generate` as a finding, to come back as one of these, and show the instructor
  each one at stop 1:
  - orientation material is kept as the orientation, one activity per topic;
  - a reading, video or narrated walkthrough is folded into a question activity's
    `worked example`, which may cite it, or dropped; the instructor decides, one at a time;
  - an exercise with a right answer (sort, judge, critique) becomes a question activity with
    `checks`, a scenario with one question per item, sampled and banked like any other;
  - one built on the learner's own work becomes a live question activity with `checks`.

  A plain-path run converts none of these; they wait for the instructor.
- **Retired fields.** Both `kind:` and `bank:` are ignored, but a `bank:` line can carry
  substance: where the items live, how they are named, how to pick among them. Move any such
  text into the entry's `generator`, worded as part of it, and then delete the line. Delete a
  `kind:` line, or a `bank:` line that is only a path, outright: a stale path misleads anyone
  reading.

## When to run this phase again

Not on a schedule, and not on your own reading of the folder. **Run it when the queue says so**
— `workflows/learn/tools/survey.mjs` lists a goal outstanding with `needs: curation`, and
`learn` spawns this in the background. Three things put a goal there:

- **A goal was added** — by goal setting, or by `new-word.mjs`. Those arrive `goal-added`.
- **A tutor ran out of candidates** — enough entries picked up `status: dropped` that a goal
  has no live check activity.
- **A review sitting found a goal with no live entry to check it with.**

The middle one is why the drop reasons have to be specific: they are the only feedback this
phase ever gets, and the queue entry says a goal is short, not what was wrong with what it had.

Adding a word is the cheap case: `a-words` already serves it, or step 0 writes that entry,
steps 1 to 5 find nothing to do, and step 6 clears it.

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
- [`bank-check`](workflows/learn/skills/curation/bank-check/SKILL.md) - skill
- [`critique`](workflows/learn/skills/curation/critique/SKILL.md) — skill
- [`draft-bank`](workflows/learn/skills/curation/draft-bank/SKILL.md) - skill
- [`generate`](workflows/learn/skills/curation/generate/SKILL.md) — skill
- [`verify`](workflows/learn/skills/curation/verify/SKILL.md) — skill
- [`learn`](workflows/learn/skills/learn/SKILL.md) — skill
- [`migrate-words.mjs`](workflows/learn/tools/migrate-words.mjs) - tool
- [`record-status.mjs`](workflows/learn/tools/record-status.mjs) — tool
- [`survey.mjs`](workflows/learn/tools/survey.mjs) — tool
- [`vocabulary-moves.md`](workflows/learn/skills/goal-setting/references/vocabulary-moves.md) —
  reference
- [`activities.md`](workflows/learn/templates/activities.md) - template
