# Tutor speed: rule in session, answer in one call

**Status:** design for review, 2026-11-03. Branch `tutor-speed`, local only until Paul says to
publish.

## Why

Testing study in Codex on 2026-11-03, answering one multiple-choice question took 37.3 seconds
from the learner's reply to the tutor's. Timed from the session logs
(`~/.codex/sessions/2026/11/03/rollout-2026-11-03T07-35-35-*.jsonl`, the tutor, and
`rollout-2026-11-03T08-18-18-*.jsonl`, the judge it spawned):

| step                        | time   | what happened                                                                   |
| --------------------------- | ------ | ------------------------------------------------------------------------------- |
| tutor model call 1          | 4.2 s  | a preamble line, then composing the spawn message                               |
| judge subagent              | 12.3 s | 1.3 s start, then four model round trips: read `AGENTS.md`, read its skill, run `judge-input.mjs`, rule |
| tutor model calls 2 and 3   | 6.4 s  | pick up the ruling, compose `record-attempt.mjs`                                |
| `record-attempt.mjs`        | 3.0 s  | under 0.2 s of script; 2.8 s was Codex's guardian reviewing an escalation       |
| tutor model call 4          | 3.1 s  | decide to call `next-item.mjs`                                                  |
| `next-item.mjs`             | 0.4 s  |                                                                                 |
| tutor model call 5          | 7.7 s  | feedback, progress, and the next question in full                               |

About 15 s is the judge. About 21 s is five tutor model calls in sequence. The scripts cost under
a second.

The escalation is not a student's problem. The test chat's project folder was
`~/Documents/Documents/si212` while the install it tutored was `~/Documents/si212-test`, so
`learning-topics` was outside the sandbox's writable root. A student's project folder is the
`si212` folder that setup clones all three repositories into (bootstrap-prompt.md, step 6), so
their writes are inside it. Nothing here designs around it.

The judge exists for independence: the tutor has been helping and wants the learner to have got
there. For a multiple-choice question that buys nothing. The criterion is a comparison with
`item.answer`, and the tutor already holds the key from `next-item.mjs --key`. Whether the
attempt was unaided is a judgement only the party who watched can make, and the tutor already
makes it alone whenever it knows it helped.

## Decided

- **A program rules multiple choice.** A plain mcq, and every mcq part of a compound question,
  is ruled against its key by a tool. No model rules it.
- **The tutor rules everything else, in study and in review.** Open-ended answers and
  short-answer parts are ruled in session against the key and criterion the tutor already has.
  This gives up the independent check on open-ended answers in study and review, review
  included, where a pass moves a goal along its intervals. That is a deliberate trade for
  speed, and the skills must not imply otherwise.
- **The tutor states `unaided` on every attempt**, mcq included. It is a required flag, never a
  default: a forgotten flag costs one retry, while a default of `yes` would silently record a
  helped attempt as an unaided pass.
- **A helped attempt is ruled and recorded with its real result** when ruling it is free (an mcq,
  or an open answer the tutor rules anyway): `unaided: no` with `criterion: met` or `not met`. No
  bar counts it as a pass. `criterion: unchecked` stays for an attempt that could not have settled
  anything, such as one cut short.
- **Multiple-choice feedback is fully programmatic.** The tool writes the verdict from the choice
  texts and the scenario key. The tutor relays it verbatim and adds nothing. A learner who wants
  to know why asks, and the side conversation takes it from there.
- **Quizzes are untouched.** Real and practice quizzes keep `quiz/grade`, run in a fresh context
  as a batch. The practice quiz's claim, "marked by the same grader as a real one", stands.
- **The `adjudicator` slot is retired**, the way `supply` was. Nothing reads it, and an old
  `goals.md` carrying it parses without complaint.
- **`study/judge` is deleted**, and `judge-input.mjs` with it. Its guidance does not move into a
  reference file. The few rules the tutor needs at the moment of ruling print beside the key.

## Design goals

1. An mcq turn costs the tutor two model calls: one tool call, then the reply.
2. Every word the learner reads about an mcq answer comes from the bank, through a program.
3. Nothing keyed on the log changes: `attempts.jsonl` lines keep their shape, bars and the
   schedule read them as before, and every existing `goals.md` still parses.
4. The record stays honest about who ruled: the axes are what the program or the tutor decided,
   never inferred.

## `answer.mjs`: rule, record, show, serve

One call per answered bank question, keyed by the label `next-item.mjs` printed.

```
node workflows/learn/tools/answer.mjs <topic> <label> --unaided yes|no|unclear
     [--choice <n> | --choice <letter>=<n>,<letter>=<n>]
     [--criterion met|"not met"|unclear]
     [--concern "<why no answer to this question could establish the criterion>"]
     [--next (--goal <id> | --activity <id>)]
     [--review <goal>[,<goal>]]
```

**It looks the item up in the bank** and takes from it the goals the question credits, its tags
and its cases. The tutor no longer copies `tags:` and `cases:` lines into a call.

**It rules:**

| item           | criterion axis                                                                                  | refused                                   |
| -------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------- |
| plain mcq      | `--choice <n>` against `item.answer`                                                            | `--criterion`; a missing `--choice`       |
| compound       | each mcq part by `--choice <letter>=<n>`; the open parts by `--criterion`; `met` only when every mcq part is right and `--criterion` is `met` | a missing choice for any mcq part; a missing `--criterion` when there is an open part |
| open-ended     | `--criterion`                                                                                   | `--choice`; a missing `--criterion`       |

A wrong mcq part makes a compound `not met` whatever `--criterion` says. `--unaided` is
required on every call. A question crediting several goals is ruled once and recorded once per
goal; a per-goal `--criterion` is out of scope until a bank needs one.

**It records** one attempt per goal, through the same code `record-attempt.mjs` uses, moved into
a shared lib so there is one writing path. Validation (unknown goal, goals.md problems, cases a
goal does not declare) is the existing code, unchanged. A bank question that names a goal with
cases but lists none for it is refused with the existing message; the tutor records that goal
through `record-attempt.mjs` as today.

**`--concern`** writes `record-status.mjs blocked <goal> --needs curation --why "<text>"` for
each goal the question credits, after the attempts. It replaces the judge's
`concern_attempted` field.

**It prints, in order:**

1. A tutor section: the axes recorded for each goal, one line per mcq part
   (`(a) answered 2, key 1, wrong`), and anything the call wrote to the status log.
2. `--- learner sees ---`, then everything the learner is to read this turn:
   - for an mcq or each mcq part, the verdict built from the bank:
     `Correct: **3**, "<choice text>".` or
     `Not this time. You chose **1**, "<choice text>". The answer is **3**, "<choice text>".`,
     followed by the scenario key where the item has one
   - the progress block, exactly as `record-attempt.mjs --progress` prints it today
   - after a `not met`, the three choices from study's step 3, or on a goal with cases the
     variant whose third choice counts this question and goes on
   - with `--next`, the next question's learner section, framing included where `next-item.mjs`
     would include it
3. With `--next`, the next question's header and key (`label:`, `goals:`, `tags:`, `cases:`,
   `repeat:`, `--- key ---`), the same lines `next-item.mjs --after <label> --key` prints, so
   the tutor has what it needs to rule the next answer.

The learner's section comes before the next key so the tutor can relay one contiguous block.
For a plain mcq the tutor's reply is that block and nothing else, and it ends the turn, as
skill-authoring.md asks. For a compound or open question the tutor writes its feedback on the
parts it ruled above the block.

**Exit codes.** 1 for misuse, as every tool here. With `--next`, 2 when nothing banked is left,
after the attempt is recorded and the learner section printed; the tutor then runs the
activity's generator live, as for `next-item.mjs` exit 2.

**Review** calls it with `--review <goal>[,<goal>]`, naming the goals that were due, and no
`--next`: its next question is the next due goal, perhaps in another topic. The tool applies
review's rule for which recorded attempts carry `source: review`, today written out in review's
step 4: a due goal always; a goal not due only when it was missed (`not met`, or `unaided: no`);
not a goal not due that passed or was ruled inconclusive. That rule moves from the skill into
the tool. With `--review` the tool prints no progress block and no three choices, since review
shows neither, and `--source` is not a flag; study is the default.

**What stays on `record-attempt.mjs`:** questions set live (vocabulary moves, generators),
`--outcome` calls (`declared`, `elsewhere`, `abandoned`), and `criterion: unchecked`.

## `next-item.mjs --key`: the criterion and the ruling rules

When `--key` is given, next-item also prints, after the key:

- `--- criterion ---`: each goal the question credits, its criterion resolved, and the texts of
  the cases this question exercises. This is the code in `judge-input.mjs` today, moved.
- `--- ruling ---`, only when the question has an open part: a fixed block of a few lines. Rule
  against the criterion as written. Half credit is `not met`. `unclear` is for a genuine tie, in
  either direction. Anything that changed what they did is help; clarifying which question was
  meant, or repeating it, is not. Rule on what they wrote, not on how the session went.

The learner's section is unchanged, and nothing from `--- key ---` on is for the learner.

## What else changes

**Skills.** Each edited skill gets the three checks from `course-private/notes/skill-authoring.md`
before it is done, and reads as though there had never been a judge, with no provenance in the
text.

- `study/SKILL.md`
  - step 3 says the tutor rules, and when to call `answer.mjs` or `record-attempt.mjs`
  - step 4 records through `answer.mjs` for bank questions
  - for a question set live, two or three lines point at the pass conditions in
    `vocabulary-moves.md` or the generator
  - the slot table, "the eight slots" and the "Ruling on a goal whose adjudicator isn't you"
    failure mode go; the judge's rounding-up and two-axes failure modes take its place
  - the compound paragraph and the multi-goal recording paragraph shrink to what `answer.mjs`
    does not do for the tutor
- `study/references/running-an-activity.md`: the compound section and "At the end of an attempt".
- `review/SKILL.md`: step 3 and its "Ruling it yourself" failure mode, and recording bank
  questions through `answer.mjs --review <due goals>`, which takes over the per-goal source rule
  from step 4.
- `quiz/SKILL.md`: step 5 says "in a fresh context" directly instead of "the way `study/judge` is
  run".
- `study/judge/SKILL.md`: deleted.
- `goal-setting/references/slots.md`: `adjudicator` gets a retired section beside `supply`'s; the
  slot count and every table lose its row; the `adjudicator` contract section goes, and who rules
  is described once, as the tutor or a program for multiple choice.
- `quiz/skills/quiz/grade/SKILL.md`, `goal-setting/references/vocabulary-moves.md`,
  `diagram/.../conventions.md`, and the `goals.md` and `activities.md` templates: any mention of
  the slot or of `study/judge` is removed. "Adjudicate" as a plain word for ruling may stay.

**Tools.**

- new `answer.mjs` and its tests
- `record-attempt.mjs`: the writing code moves to a lib both tools use; behaviour unchanged
- `next-item.mjs`: the two sections above
- `judge-input.mjs` and `test/judge-input.test.mjs`: removed
- `lib/slots.mjs`: `adjudicator` leaves `SLOTS` and `ADJUDICATORS` goes; `applySlots` drops an
  `adjudicator:` line the way it drops `supply:`
- `review-due.mjs`: stops emitting `adjudicator`; `test/supply.test.mjs` updated to match
- `test/compound.test.mjs`, `lib/item.mjs`, `new-word.mjs`: comments and assertions that name
  the judge or the slot

**Diagram.** In `learn.bpmn`, `S_judge` and `R_judge` become tasks in which the tutor rules, and a
program for multiple choice. Made with the workflow-diagram skill, and both validators pass.

**Not touched:** the specs and plans under `docs/superpowers/`, which are history; the quiz
grader; learning-topics content.

## Testing

**Tool tests, written first:**

- a plain mcq answered right, and answered wrong: axes recorded, learner verdict text exact
- a plain mcq given `--criterion`: refused
- an open item without `--criterion`: refused
- any call without `--unaided`: refused
- a compound with every mcq part right and `--criterion met`: `met`
- a compound with one mcq part wrong and `--criterion met`: `not met`, with that part's line
- a compound missing a choice for one mcq part: refused
- a question crediting two goals: two attempts, same label and tags
- tags and cases taken from the bank, not from flags
- a bank question for a goal with cases and none listed: refused with the existing message
- `--unaided no` with a right choice: recorded `unaided: no, criterion: met`, and the bar not met
- the three choices printed exactly on `not met`, the cases variant on a goal with cases, and
  none with `--review`
- no progress block with `--review`
- `--review` on a two-goal question, one goal due: the due goal carries `source: review` pass or
  miss; the other carries it only when missed, and not when passed or inconclusive
- `--review` naming a goal the question does not credit: refused
- `--next` printing the same header, learner section and key as `next-item.mjs --after <label>
  --key`, framing rules included; exit 2 passed through after recording
- `--concern` writing one blocked line per goal
- next-item `--key`: the criterion section, and the ruling block present exactly when the
  question has an open part
- `slots.mjs`: a `goals.md` carrying `adjudicator: study/judge` or `adjudicator: tutor` parses,
  and the field lands nowhere

The existing suite stays green.

**Codex rerun.** The same topic and the same `setup-top` questions, in a project whose folder
holds the install, so the sandbox matches a student's. Each turn timed from the session log with
the same script. Expected, not promised: about 10 to 12 s for an mcq turn. Report what it
measures. Also time one open-ended question, which the tutor now rules in session, and read its
ruling against the rubric by hand.
