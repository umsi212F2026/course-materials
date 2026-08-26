---
name: review
description: Run everything that has come due for review, across all topics — the learner re-attempts each goal's check cold, it gets adjudicated, and a program sets the next interval. Use when anything is due; it works out what that is itself rather than being told. Not the same as study, which works the other side of the line — goals not yet met.
---

# Review

## Operates on

Establish it once, at the start, by asking: the student's clone of `learning-topics`. Carry it
from there for the rest of the sitting.

Every tool you run takes it as `--dir`, and every skill you hand off to is told it. Do not
infer it from the working directory, and do not decide it again part-way through — a student
may have more than one, and re-deciding is how a sitting ends up split across two of them.

A goal was met, days or weeks ago. This session asks one question: **is it still there?**

You are not teaching. You set up the check, stay out of the way while they attempt it, get the
attempt adjudicated, and let a program set the next date. That is the whole job, and most of it
is restraint.

## What you're given

Nothing. Work out what's due yourself, across every topic:

```
node workflows/learn/tools/review-due.mjs
```

It folds every goal's next date out of its topic's attempt log and returns one record per goal
whose date has passed:

| field         | what you do with it                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `topic`       | the folder. Every file the sequence names is in this one, and it changes as you work down the list |
| `goal`        | the id, to look up in that topic's `goals.md`                                                      |
| `supply`      | where the task comes from — see step 1                                                             |
| `adjudicator` | who rules on it — see step 3                                                                       |
| `served`      | the labels this goal has already been given, most recent first, exactly as the supply wrote them   |
| `due`         | the date it came due                                                                               |

**ONE PATH, WHATEVER KIND OF GOAL IT IS.** There is no `is_word` in that record and nothing
here branches on one. A capability, a word and an orientation are all goals with entries in
`goals.md` and entries in `activities.md`; what differs between them is their slots, and two of
those come to you in the record above.

**`served` carries one instruction: don't serve what's near the front of it.** A label is
whatever the supply that wrote it chose to write — an activity id, a bank item after a slash, a
move and a note on the instance. You don't parse it; you hand it back to the supply, which is
the only thing that reads it.

**A review session is not per topic.** What's due is whatever the dates say is due, and the
dates don't respect topic boundaries — three words from _Data_ and one capability from _Where
things live_ is a perfectly ordinary list. Take the topic from each record rather than assuming
the last one still applies.

**Work through it one goal at a time**, all the way to the end of the sequence before starting
the next. The verdict has to reach the learner beside the attempt it was about, which is what
rules out setting several up together and judging them in one batch.

## If they say a goal isn't worth it

**This is the likeliest place in the whole workflow for it to come up**, and it holds at every
point in the sequence below — before they have properly seen the task, mid-attempt, during the
post-mortem, or about a goal this sitting hasn't reached yet. Nothing gates it. Expect it most
often at step 5, where a lapse is exactly what makes someone conclude a word isn't worth the
interval, but that is where to expect it, not a step it belongs to.

**Same posture as retiring a topic: don't argue, and don't ask them to justify it.** One
clarifying question at most — this goal, or the whole topic? — and then take them at their
word.

**One question decides what happens: has an attempt already been recorded for this goal?**

- **No** — **don't log one**, because none happened. Write the retirement, then move to the
  next record. That is the same shape as step 1's _no live entry_ branch.
- **Yes** — **the attempt stays in the log**; it happened. Write the retirement after it.

The retirement is always written. What varies is only whether an attempt sits in front of it.

```
node workflows/learn/tools/record-status.mjs <topic-folder> retired <goal-id> --reason "<their words>"
```

**The reason is required, and this is where it is most available.** _"I don't need this any
more"_ is their own sentence — record it as theirs, not paraphrased.

**Neither case needs anything undone.** A next review date may have been computed moments
earlier, at step 4; it is simply never consulted, because retirement filters before the
schedule is folded. There is no stale entry anywhere to reconcile, and nothing to clean up.

Recording an attempt against a goal that is already retired is fine too — `record-attempt.mjs`
takes it and says the goal was retired. It does not un-retire it; reviving is something they
have to say.

## The sequence

Every file named below is in the record's own `topic` folder, and so is every `<topic-folder>`
argument.

1. **Set up the check.** Read the goal's entry in `goals.md` — its criterion, and its slots.

   **First, find a live entry in `activities.md` that `checks` this goal.** Every goal has one;
   for a goal whose supply produces its own activities, curation stamps a generated entry
   carrying `origin: generated`.

   **If there is no live entry at all, there is nothing to check this goal with.** Usually the
   entry that it passed was dropped afterwards, by a tutor who found something wrong with it;
   occasionally the goal never had one, because it was met by the learner declaring it rather
   than by an adjudicated pass. Say so and go on to the next record. Don't improvise a
   replacement: an invented task gets judged against a criterion it wasn't written for.

   Nothing else in this sequence applies — there was no attempt, so there is nothing to
   adjudicate and nothing to record, and the date stays where it is so the goal is still due
   once there's something to check it with. Put it on the queue:

   ```
   node workflows/learn/tools/record-status.mjs <topic-folder> blocked <goal-id> --needs curation --why "no live entry checks this goal"
   ```

   That's what `learn` spawns curation on, and what curation clears when it has built one.

   **Then ask the goal's `supply` for the task.**

   `supply: curated` — the task is the entry itself. Prefer `kind: generator`, which produces a
   fresh instance. A `bank` is fine if it has items whose labels aren't in `served`. A
   `single instance` already in `served` is the weakest form there is — if it's all there is,
   use it.

   `supply: vocabulary` — the entry is a stamp, and the task is a move from
   [`../goal-setting/references/vocabulary-moves.md`](../goal-setting/references/vocabulary-moves.md).
   Pick one whose label isn't near the front of `served`. **Prefer APPLY or LOCATE.** Both draw
   on work that didn't exist when the word was first met, so neither can be answered from
   memory of answering before. That's exactly the property a review wants and the other moves
   don't have.

   Either way, **don't say what the criterion is.** Just give them the task.

2. **They attempt it cold.** Set the task, then stop talking.

   **Offer no help, and volunteer nothing, until it has been ruled on.** A review attempt is
   worth exactly what it would be worth cold, and help of any kind makes it impossible to
   assess whether they could still do this without you. As a heuristic, _anything that changed
   what they did is help._

   If they ask for help, say plainly that this one is meant to be cold, that you'll go through
   it with them straight after, but they should try to do it on their own. Say it once. If they
   insist, give what's asked and record it as a failed attempt, which will cause it to come
   back sooner.

   The constraint is on this goal only. It has nothing to say about the one you just finished
   or the one after it — those are separate attempts with their own verdicts.

3. **Get it adjudicated.** The goal's `adjudicator` slot says who rules, and it is the same
   adjudicator the first pass used.

   **`study/judge`** — the default. Hand it the whole transcript in a fresh context, in the
   shape it expects, or it will refuse — a JSON object, then the record as a labelled block:

   ```
   {"goal": "w-schema", "criterion": "…", "label": "APPLY: their deploy script",
    "sent by": "review"}
   --- record ---
   …the whole transcript…
   ```

   `criterion` is the goal's, resolved: its own text, or — where the entry names a reference
   like `vocabulary` — the sentence that reference points at, from
   [`../goal-setting/references/slots.md`](../goal-setting/references/slots.md). Send the
   sentence, never the name. It won't infer a missing field, and that's right: a verdict built
   on a guessed criterion is recorded exactly like a real one.

   Both questions still matter here. _Unaided_ looks near-certain because you offered nothing,
   but they may have looked something up, and the judge is the party to decide that rather than
   you.

   **`adjudicator: tutor`** — you rule, same two axes, no extra call. Rare in review: a goal
   whose adjudicator is you usually carries `recurrence: never` and never comes back at all.

   Tell them the verdict when it comes.

   **The constraint lifts the moment the verdict is in**, whichever way it went. This attempt
   is over and nothing you say can contaminate it, so this is where the teaching happens if any
   is wanted.

4. **Record the attempt, before anything else.** Run

   ```
   node workflows/learn/tools/record-attempt.mjs <topic-folder> <goal-id> <label> --tags <tags> --axes '<json>' --source review
   ```

   Same call the study phase makes, with `--source review` added. `<label>` is what the supply
   served, in its own words — the entry id, with the bank item after a slash, or the move and a
   note on the instance. That's what keeps it from being served back in three months, and
   there's nowhere else it gets recorded. `--tags` is what the supply returned — `production`
   or `reception` from the vocabulary supply, nothing at all from the curated one.

   A review attempt is an attempt, and the log is what the interval rule is read from. It
   cannot unmake what was shown — nothing can — but a lapse belongs in the record of what
   happened.

   **That one call is also what sets the next date**, and there is nothing to forget, because
   there is no second write. The schedule is a fold over this log: `--source review` is what
   makes this attempt one the fold acts on, and the fold moves the date out on a pass, in on a
   lapse, and a full interval along on anything inconclusive. There is no file to edit, and no
   path where a recorded attempt leaves a goal due forever.

   **Before anything else** because step 5 is where the session runs long. It's one call, the
   verdict is already in hand, and everything after this point is conversation that can be
   abandoned partway without costing anything.

5. **On a lapse, offer to go over what happened.** This is the most valuable few minutes. Try
   to engage the student in a conversation about what went wrong, identify any misconceptions,
   and help them plan for how they might get it right next time.

   **A note is theirs to want.** Don't prompt for one by default, and don't write one for them.
   Most post-mortems should leave no trace; the conversation was the point. If the student
   wants to, they can edit the `notes.md` file for the topic; you can help them with the
   mechanics of opening the file.

   **If they want to work through it again, do it here.** Offer the live `orient` and `deepen`
   candidates for that goal from `activities.md` and run one, following
   [`../study/references/running-an-activity.md`](../study/references/running-an-activity.md)
   the way the study phase does. Don't send them off to a study session — this is the session
   they are in, and they have just been told they failed something.

   Nothing about it gets recorded. Nothing moved and nothing can, the next scheduled review is
   the evidence, and a refresher that writes nothing isn't a gap in the record — it's the
   record declining to treat re-reading as progress.

## Why a lapse never unmakes what was shown

The log records **what happened**, and when to come back is a fold over it. A lapse is one more
line in that log, and there is nowhere else for it to do damage — nothing is stored that it
could overwrite.

**What has been shown isn't stored anywhere — it's read off the log by the goal's own bar, and
every bar is an existence test.** A bar, once true, stays true. An unaided pass happened and
was adjudicated; a later lapse doesn't unmake that, it's a second fact about a different day. A
goal that lapses comes back sooner in review. It does not become un-learned.

Say this out loud if they seem deflated. People read a failed review as losing something they
had earned, and the record deliberately doesn't work that way.

## Failure modes in yourself

- **Helping.** The whole phase is one restraint, and it will feel unkind every time.
- **Reassuring during the attempt.** "That looks right so far" is help. So is a tone.
- **Skipping the record**, because a post-mortem ran long or the session ended abruptly. It's
  the one thing here that can't be recovered afterwards: the date doesn't move, the goal stays
  due, and the next session has no idea this one happened.
- **Skipping the post-mortem** because the verdict was bad and the moment feels awkward. That's
  the moment.
- **Ruling it yourself** when the goal's adjudicator is `study/judge`. You watched it, which is
  the reason you're the wrong party.
- **Treating a lapse as a demotion.** Nothing in the record moves down. If you say otherwise
  you've told them something false about their own progress.

## Depends on

- [`learn`](workflows/learn/skills/learn/SKILL.md) — skill
- [`topic`](workflows/learn/skills/topic/SKILL.md) — skill
- [`record-attempt.mjs`](workflows/learn/tools/record-attempt.mjs) — tool
- [`record-status.mjs`](workflows/learn/tools/record-status.mjs) — tool
- [`review-due.mjs`](workflows/learn/tools/review-due.mjs) — tool
