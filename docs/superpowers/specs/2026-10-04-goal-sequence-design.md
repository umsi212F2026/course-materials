# Sequenced sets of goals

**Status:** approved design, 2026-10-04. Branch `learn-student-feedback`.

## Why

Nothing decides which goal a study session works on next, so a learner can start on an
integrating capability before the words it uses. Goal-setting should also decide an order: a
sequence of sets, worked through in order, with no preferred order inside a set. The same
sequence is what the progress view (queue item 6) will draw as columns.

## The decision is explicit, in goals.md

Every topic's `goals.md` carries a `## Sequence` section after `## Goals`: a numbered list, one
line per set, earliest first. Each item on a line is one of:

- a **group** name (`orientation`, `vocabulary`, `capabilities`, or any other group a goal uses);
- a **capability slug** (`weigh-hosting-plans`), naming all of that capability's parts;
- a **goal id** (`c-weigh-sleep`).

For example:

```markdown
## Sequence

1. orientation
2. vocabulary, c-weigh-sleep
3. capabilities
4. w-lock-in
```

**Each goal's set is its most specific mention:** its goal id if listed, else its capability
slug, else its group. So `c-weigh-sleep` is in set 2 with the words although it is a capability,
and `w-lock-in` comes last although it is a word. A word added mid-topic lands wherever its
group is listed, with no edit.

**Every goal must land in a set.** There is no catch-all. A goal named nowhere is a problem.

## Topics without the section

A topic made before this change has no Sequence section. That is a decision not yet made, not a
defect:

- survey reports `sequence: not decided yet` (not in PROBLEMS);
- the order used meanwhile is orientation, vocabulary, capabilities, then any other group in
  order of first appearance;
- the tutor offers once to set the sequence, and goal-setting adds it the next time it runs.

New topics get the section from the goals template (orientation, vocabulary, capabilities), and
goal-setting always reviews it. **Existing course topics get theirs during migration**, with the
origin header and `migrate-words.mjs` (a queue action on the learning-topics repository).

## Survey

- **Problems:** a Sequence item that matches no group, capability slug or goal id; a goal id
  listed in two sets; a goal that lands in no set.
- **JSON** gains `sequence`: `{ decided: boolean, sets: [{ goals: [{ id, state }] }], current }`,
  where `state` is `met`, `deferred`, `retired` or `open`, and `current` is the index of the first
  set with an open goal (null when none is open). The default order fills `sets` when `decided`
  is false.
- `--report` prints `sequence: not decided yet` when undecided; the per-set view is item 6's.

## Choosing the next goal

`node workflows/learn/tools/next-goal.mjs <topic-folder>` prints one open goal from the current
set, chosen at random (the tool chooses, because an agent asked to pick at random does not), and
exits 2 when no goal is open. Met, deferred and retired goals are never chosen.

## Study

Unless the learner names a goal, the tutor runs `next-goal.mjs` and offers that goal's
activities. **The sequence is a recommendation:** a learner who wants any other goal, from any
set, gets it with no comment. When the topic's sequence is not decided yet, the tutor says so
once and offers to set it (a goal-setting conversation), and otherwise carries on with the
default order.

## Goal-setting

A new move, **ORDER THE SETS**, scaled to what the topic already has:

- **No Sequence section yet:** once the goals are settled, propose a sequence (vocabulary before
  the capabilities that use those words; parts that build on each other in order) and write the
  section, confirmed with the learner (the instructor, for a course topic). This runs in any
  goal-setting conversation on such a topic, including one that only adds goals.
- **A section exists and the conversation added goals:** check only where the new goals land. A
  new word falls into its group's set with no edit; raise a placement only if it looks wrong (a
  basic capability others build on, say).
- **A section exists and nothing new needs placing:** skip the move, unless the learner asks to
  reorder.

## Not changed

Review serves whatever is due, regardless of the sequence. The quiz is unaffected.

## Tests

Set resolution (goal id over slug over group; a word added later lands with its group); each
survey problem; `decided` false and the default order; `current`; `next-goal` choosing only from
the current set, skipping met, deferred and retired goals, reaching every open goal in that set
over repeated runs, and exiting 2 when nothing is open.
