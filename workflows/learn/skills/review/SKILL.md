---
name: review
description: Run everything that has come due for review, across all topics: the learner re-attempts each goal's check cold, it gets adjudicated, and a program sets the next interval. Use when anything is due; it works out what that is itself rather than being told. Not the same as study, which works the other side of the line: goals not yet met.
---

# Review

## Operates on

Establish it once, at the start, from `~/.codex/AGENTS.md`, which names it: the student's clone
of `learning-topics`. Carry it from there for the rest of the sitting. Do not open by asking
for it; ask only where that file is missing or names a folder that is not there, and say that
is what happened.

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
| `adjudicator` | who rules on it — see step 3                                                                       |
| `served`      | the labels this goal has already been given, most recent first, exactly as the activity wrote them |
| `due`         | the date it came due                                                                               |

**ONE PATH, WHATEVER KIND OF GOAL IT IS.** There is no `is_word` in that record and nothing
here branches on one. A capability, a word and an orientation are all goals with entries in
`goals.md` and are served by entries in `activities.md`; what differs between them is their
slots, and one of those comes to you in the record above.

**`served` carries one instruction: don't serve what's near the front of it.** A label is
whatever the activity that wrote it chose to write: a bank question's path, an activity id, a
move and a note on the instance. You don't parse it; you hand it back to the activity, which is
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

   **First, find a live entry in `activities.md` that `checks` this goal.** A word needs none:
   `a-words` serves it through its group, and where nothing is banked for it, or the topic has
   no `a-words` entry yet, a move set live checks it. A legacy stamp carrying
   `origin: generated` is not live and counts for nothing.

   **If a goal other than a word has no live entry at all, there is nothing to check it
   with.** Usually the entry that it passed was dropped afterwards, by a tutor who found
   something wrong with it; occasionally the goal never had one, because it was met by the
   learner declaring it rather than by an adjudicated pass. Say so and go on to the next record.
   Don't improvise a replacement: an invented task gets judged against a criterion it wasn't
   written for.

   Nothing else in this sequence applies — there was no attempt, so there is nothing to
   adjudicate and nothing to record, and the date stays where it is so the goal is still due
   once there's something to check it with. Put it on the queue:

   ```
   node workflows/learn/tools/record-status.mjs <topic-folder> blocked <goal-id> --needs curation --why "no live entry checks this goal"
   ```

   That's what `learn` spawns curation on, and what curation clears when it has built one.

   **Then choose the task. For any goal, try the bank first.** Ask for a question that credits
   the goal that is due:

   ```
   node workflows/learn/tools/next-item.mjs <topic-folder> --goal <goal-id>
   ```

   Show the learner only what follows `--- learner sees ---`. It prefers a question they have
   never been served, then the one served longest ago, so you need not filter by `served`. Run
   it with `--key` to read the grading text, and keep that from them. A question may credit
   other goals as well; that is fine, and step 3 says how it is ruled.

   **Exit code 2 means no bank question names this goal**, and then the task comes from the
   goal's activity, run live:

   **An ordinary goal**: the task comes from the entry itself. Every activity with questions has
   a generator, and a bank only when its `tasks/<activity-id>/` folder exists; with no bank
   question naming this goal, run the generator live for a fresh question. A generator that
   picks from real items, such as a numbered range in a book, is fine if it has items whose
   labels aren't in `served`. An item already in `served` is the weakest form there is; if
   it's all there is, use it.

   **A word**: set one move live from
   [`../goal-setting/references/vocabulary-moves.md`](../goal-setting/references/vocabulary-moves.md),
   labelled `<MOVE>: <instance>`. Pick one whose label isn't near the front of `served`.
   **Prefer APPLY.** It draws on work that didn't exist when the word was first met, so it can't
   be answered from memory of answering before. That's exactly the property a review wants and
   the other moves don't have.

   Either way, **don't say what the criterion is.** Just give them the task.

2. **They attempt it, cold unless they ask.** Set the task, then stop talking.

   **Volunteer nothing until it has been ruled on.** A review attempt is worth what it would be
   worth cold, and unasked help spoils that for no benefit. As a heuristic, _anything that
   changed what they did is help._

   **But help whenever they ask, at once and in full.** Don't tell them it is meant to be cold,
   don't ask them to try first, and don't make them ask twice: refusing a learner who wants to
   talk is the record coming before the learner. The first time they ask in a sitting, add one
   short sentence as you help: this attempt will count as helped. That is the whole
   consequence. The judge reads the transcript and rules it `unaided: no`, and a helped review
   counts as a lapse, so the goal comes back sooner, which is right: needing help on a review
   is the evidence that it is fading.

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

   **Every bank question goes with its rubric**, the `--key` output as a `--- rubric ---` block
   ahead of the record, whether it names one goal or several. Only a live generator's question
   goes without one. One goal goes as `goal` and `criterion`; several go as `goals`, a list of
   `{"goal": …, "criterion": …}` with each criterion resolved. A question that names goals with
   different `adjudicator` slots goes to `study/judge` for all of them. Every goal the judge
   rules on is an attempt and step 4 records each. A goal that was due is recorded as a review.
   Another named goal is recorded as a review only if it was missed; one that passed counts as
   evidence without moving it along its intervals, and so does one the judge could not decide.

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

   Same call the study phase makes, with `--source review` added. `<label>` is what the
   activity served, in its own words: for a bank question the `<activity>/<scenario>/<question>`
   label the picker printed, otherwise the entry id or the move and a note on the instance.
   That's what keeps it from being served back in three months, and there's nowhere else it gets
   recorded. `--tags` is what the activity returned: the picker's `tags:` line unless it says
   `none`, or `production` or `reception` for a vocabulary move set live, and nothing otherwise.

   **A question ruled against several goals is one call per goal**, each with its own `--axes`
   and all with the same label and `--tags`. Which of them carry `--source review`:

   - **A goal that was due:** `--source review`, pass or miss.
   - **Any other named goal that was missed** (criterion `not met`, or `unaided: no`): also
     `--source review`.
   - **Any other named goal that passed:** omit `--source`.
   - **An inconclusive ruling on a goal that was not due** (criterion `unclear`, or
     `unaided: unclear`): omit `--source`.

   `--source review` is what moves a goal along its intervals, so the asymmetry is deliberate.
   A miss on a goal that was not due is as trustworthy as any, because the attempt was cold,
   and recording it as a review moves the goal one step shorter so it comes back sooner. A
   pass on one is not worth the same: recorded as a review it would promote the goal a step
   it was not yet due to earn, whereas a pass without the flag only re-dates it from today at
   the step it is already on. An inconclusive ruling is no evidence either way, so it leaves
   that goal's schedule where it was.

   A review attempt is an attempt, and the log is what the interval rule is read from. It
   cannot unmake what was shown — nothing can — but a lapse belongs in the record of what
   happened.

   **That one call is also what sets the next date**, and there is nothing to forget, because
   there is no second write. The schedule is a fold over this log: `--source review` is what
   makes this attempt one the fold moves along the intervals, out on a pass, in on a lapse, and
   a full interval along on anything inconclusive. A pass from anywhere else, practice or a
   quiz, re-dates the goal from the day it happened but leaves it on the interval it was
   already on, so a goal that keeps being met keeps an honest clock without ever earning a
   longer gap for it. There is no file to edit, and no path where a recorded attempt leaves a
   goal due forever.

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

   **If they want to work through it again, do it here.** For a lapsed word, go over what went
   wrong and offer another move, set live or from the bank, rather than orient or deepen
   candidates. For any other goal, offer the live `orient` and `deepen`
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

- **Volunteering help.** Unasked, it spoils a cold attempt and buys nothing.
- **Making them ask twice**, or explaining why they shouldn't ask. They asked; help.
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
- [`next-item.mjs`](workflows/learn/tools/next-item.mjs) - tool
- [`record-attempt.mjs`](workflows/learn/tools/record-attempt.mjs) — tool
- [`record-status.mjs`](workflows/learn/tools/record-status.mjs) — tool
- [`review-due.mjs`](workflows/learn/tools/review-due.mjs) — tool
