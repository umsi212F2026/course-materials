---
name: quiz
description: Sit a practice quiz, drawn from the same pool and marked by the same grader as a real one, then go over what was missed. Use when a learner asks to practise for a quiz, or wants to know whether they would pass one. It records an attempt against each goal the quiz examined, so a practice run moves review dates. Not the same as review, which serves what is due; this serves what one session's quiz would.
---

# Quiz

## Operates on

Two clones, and establish both at the start by asking:

- **`course-materials`** - the course's own clone, holding the pools and the tools below. Every
  command here is run from inside it.
- **`learning-topics`** - the learner's clone, holding the topics the quiz examines. This is
  where the attempts go.

The tools find the second from the first, assuming the sibling layout the workspace has. If a
tool says a topic is not there, that assumption is what broke, and asking is how you find out
rather than guessing at a path.

**The question this session asks is the real one: would you pass Tuesday's quiz?** Not what do
you know about this topic, and not what would you like to go over. The whole value is that
nothing here is softened, so the answer means something.

## The one rule that everything else serves

**You do not help, at any point before the answers are submitted.** Not a hint, not a
definition, not a "think about what happens to the old commit". Not even confirming that an
answer sounds right.

This is why the questions are served on a page and not by you. The page is the only arrangement
where a student can answer with nobody holding the rubric, and it stops being that the moment
you start talking about the material while it is open.

**If they ask you something while the quiz is up, say you cannot answer until they submit, and
that everything is fair game afterwards.** That is not a rule you are enforcing on them. It is
what makes their score worth reading.

## The sequence

### 1. Find out what they can practise, and let them pick

```
node workflows/quiz/tools/quiz-practice.mjs --list
```

One line per published pool: a session number, the date of that quiz, how many questions, and
the topic. **Show them the list and let them choose.** A pool appears when the instructor
publishes it, so a session missing from the list is one nobody can practise yet.

**If they named a session already, skip to step 2.**

### 2. Say where they stand on that topic, and offer to study first

```
node workflows/learn/tools/survey.mjs --dir ../learning-topics ../learning-topics/<topic>
```

The topic is on the pool's line from step 1. Read `groups`, and count the goals with
`"met": false`.

**If everything required is met, say so in one line and go to step 3.** Nothing to offer.

**If four or fewer are pending, name them and make the offer**, then stop and wait:

> You have not met these yet: **repository**, **history**. A quiz can draw on either, so you
> would be answering questions about things you have not studied. Studying first usually makes
> the practice worth more.
>
> Do you want to study those first, or sit the quiz now?

**If more are pending, give the count and the shape of it instead**, which is the whole of a
topic nobody has started yet:

> You have not started this topic: **8 of its 9 goals are unmet**, and the quiz draws on all of
> them. Sitting it now tells you where you stand and very little else, because there is nothing
> yet for it to find.
>
> Do you want to study first, or sit it anyway to see the questions?

**Listing nine goal ids is not the offer, it is a wall to scroll past.** A learner who has not
started a topic already knows they have not started it; what they need is the number and a
straight answer about what a quiz would be worth today.

**Take whichever they pick, with no second attempt at persuading them.** Studying first is the
better order and saying so once is the whole of your part in it; a learner who wants to know
where they stand right now has a good reason, and "practise cold, then study the gaps" is a
real strategy rather than a mistake to be talked out of. If they choose to study, hand off to
`learn` for that topic and stop.

**The offer is the gate.** There is no readiness check that refuses to serve a quiz, and there
is not meant to be.

### 3. Launch the page, and stop talking

**Run it in the background, with its output going to a file you can read later.**

```
node workflows/quiz/tools/quiz-practice.mjs --session <n> > /tmp/practice.log 2>&1 &
```

**It does not exit until they submit**, which is why it cannot be run in the foreground: a
blocked command means you never get a turn in which to send them the URL, and they sit looking
at nothing. If it exits at once, read the log: the likeliest reason is that a port is in use
and it has told you which flag fixes it.

Then read the log for the URL it printed, and send them this as **the last thing in the turn**,
with the URL from the log rather than the one below, which is only the usual one:

> Your practice quiz is at **http://127.0.0.1:5300**. `<n>` questions, drawn the same way the
> real one was, from the same pool.
>
> Answer them cold, with nothing else open, and nothing from me: I cannot see what you write
> until you submit, and that is the point. **Come back here and tell me when you have pressed
> Submit.**

**Do not paraphrase the questions into the chat, and do not read them yourself first.** You
will see every one of them in a moment, and reading them now is how a conversation about the
material starts by accident.

**When they come back, read `/tmp/practice.log`.** Its last lines name the directory holding
`queue.json`. If the log does not name a directory yet, the submission has not arrived: say so
and ask them to press Submit, rather than grading an empty queue.

**Multiple choice is settled in code and is not in the queue.** The log says how many, and
scoring settles them again from the draw. There is nothing for you to do about them and
nothing to write: a verdict of yours on one would be a second copy of a decision nothing
reads.

### 4. Say which goals are capabilities, once

`queue.json` has a `goals` array before its items: every goal this quiz examined, with the
goal's own criterion. **Write `kinds.json` beside it, one entry per goal in that array:**

```
{"c-commit-recovery-point":"capability","w-repository":"written","w-merge":"written"}
```

- **`capability`** when the criterion describes something to do that a written answer could not
  show. _"Can ask the agent to commit saved work. Can ask the agent to recover all files to
  where they were at any commit."_ is met by doing it, and a correct account of how to do it is
  not the same act.
- **`written`** otherwise, including for a criterion that is itself about writing something:
  _"Given a problem in a running app, writes the request they would send the agent"_ is met on
  the page, in writing, by the answer in front of you.

**Never read this off the goal id.** The `c-` prefix is on both examples above.

**Every goal in the array gets an entry, including ones with no written answer to rule on.** A
goal examined only by multiple choice never reaches step 5, so this file is the only place
anybody asks the question about it, and picking the right option out of four is not evidence
that somebody can commit and restore.

The scorer reads this file and applies it. Nothing downstream asks you again.

### 5. Rule every answer in the queue

**Read `queue.json`'s items and follow
[`quiz/grade`](workflows/quiz/skills/quiz/grade/SKILL.md) on each one**, in a fresh context,
the way `study/judge` is run. That skill is the same one that marked the real quiz, which is
the whole claim this workflow makes, and running your own judgement instead of it quietly makes
the claim false.

Each entry carries `prompt`, `rubric` and the answer, which is what the grade skill takes. Send
`goal` through as it stands, and `kind` as step 4 decided it for that goal.

Append one verdict per answer to `verdicts.jsonl` in that same directory, as JSON lines, adding
`"uniqname": "me"` and the current time as `"at"`:

```
{"item":"q-history-vs-undo","uniqname":"me","credit":"half","missed":"...","axes":{"unaided":"yes","criterion":"not met"},"flag":false,"flag_reason":"","at":"<now, ISO 8601>"}
```

**`unaided` is `yes` unless you know otherwise.** They answered on a page with you not
watching, which is as unaided as anything in this course gets. Send `no` only where the
transcript shows this particular answer was discussed or looked up before it was submitted.

### 6. Score it

```
node workflows/quiz/tools/quiz-practice.mjs --score <the directory>
```

It refuses and says why if an answer has no verdict, which means step 5 missed one. Fix it and
run again rather than reporting a score that is short.

It returns the score and one row per item, and **every argument step 7 needs is on that row**,
with `kinds.json` already folded into the axes.

### 7. Record every item, before you report anything

One call per item whose row has both a `row.goal` and a `row.topic`:

```
node workflows/learn/tools/record-attempt.mjs <topic> <goal> "<label>" --tags <tags> --axes '<axes>' --source quiz
```

Take all five straight off the row from step 6: `row.topic`, `row.goal`, `row.axes` as it
stands, and `row.tags` where the row has one. The label is the one thing you build:

- **`<move>: <item>`** where the row has a `move`, which is the vocabulary supply's own label
  format. `served.mjs` hands it back the next time this word is studied, so study does not
  repeat the same shape. `DISTINGUISH: q-history-vs-undo`.
- **`<item>`** alone where there is no move.

**Leave `--tags` off entirely where `row.tags` is null.** An invented tag is worse than none:
`production` is what a word's bar reads, and one applied by guesswork would finish a goal that
was not finished.

**A row with a null `row.topic` is recorded nowhere, and that is correct.** Follow-up questions
from a problem set have no goals, because nobody set goals for a problem set.

**Before the report, and not after, because step 8 is where the session runs long.** The
verdicts are already in hand, every call is mechanical, and everything after this point is a
conversation that can be abandoned partway without costing anything. A sitting that ends when
the learner closes the laptop still leaves the record.

### 8. Report, and end the turn on it

**Do all the recording first.** The app delivers only the last message of a turn, so anything
you say before this collapses into `Worked for 31s` and the learner never sees it.

One message, and nothing after it in the same turn. The score, then the items in the order they
were asked, then the last two sentences exactly as they stand here:

> **4 out of 5** on the session 5 practice quiz.
>
> **1. Full credit.**
>
> **2. Full credit.**
>
> **3. Half credit.** You said where each history lives, which is right, but not what follows
> from it: git's history is kept in the repository and survives the editor closing or an agent
> rewriting the file, and undo history does not.
>
> **4. Half credit.** You got what the agent is telling you. The question also asks what not
> having it in the commit rules out, and you did not say: no earlier version of that file can
> come back from the history.
>
> **5. Full credit.**
>
> **If you think I marked something wrong, say so and tell me why.** I will take your word for
> it: you can see your own answer and I only have what the rubric says. Otherwise, tell me
> which one you want to go over.

**The text after each mark is the row's `missed`, quoted and not summarised.** It was written
to this learner by the same grader that wrote the real quiz's feedback, and a friendlier
version of it is a different mark's worth of feedback. On full credit there is no `missed` and
the line is just the mark, as items 1, 2 and 5 are above.

**Say the correction sentence every time, including on a perfect score.** A learner who does
not know they can argue will not argue, and a student overruling the grader is the one place in
this course where they are the human in the loop rather than the subject of it.

### 9. Go over what they missed

No fixed order. The learner replying to step 8 starts it, and they steer.

**This is the most valuable part of the session and the report is only the way into it.** Aim
at what went wrong underneath rather than at the wording: a miss is usually one distinction
that was not there, and the `expected` field on the row is the answer that would have earned
full credit, which is what to work from when they ask what they should have said.

**Offer the harder thing.** A word missed here comes back in review in three days, and they
will get another go at it; what is worth the next ten minutes is whichever misconception
produced the answer, not a corrected sentence to remember.

## When they say the mark is wrong

**Take their word for it.** They can see their own answer and what they meant by it, and you
have a rubric line written before either of you saw it. One clarifying question at most, and
then believe them.

**Record a second attempt, which is what makes it count:**

```
node workflows/learn/tools/record-attempt.mjs <topic> <goal> "<label>, on review" --tags <tags> --axes '{"unaided":"yes","criterion":"met"}' --source quiz
```

**The first verdict stays in the log beside it.** Nothing is rewritten and nothing is deleted;
the log is what happened, and what happened is that it was marked one way and then corrected.

**Two passes in one sitting cannot lengthen an interval**, so there is no way for this to be
gamed into a longer gap: only `--source review` moves a goal along the intervals, and this is
`--source quiz`. It re-dates the goal from today at the step it is already on, which is the
honest consequence of having been met today.

**Then queue the bank item as a defect**, because a rubric that marked a right answer wrong
will do it again to somebody else:

```
node workflows/learn/tools/record-status.mjs <topic> blocked <goal> --needs curation --why "<item id>: <what the rubric gets wrong, in one sentence>"
```

**And tell them what to send, as the last thing in the turn:**

> I have recorded your pass, and logged the question as one that needs fixing. That log is in
> your own clone, though, so nobody else sees it.
>
> **Send Paul the question id (`<item id>`) and what you have just told me.** It is his bank
> and only he can change it, and the same question is going to catch somebody else on Tuesday.

**The channel is a person, and that is honest at this size.** Nobody can push a fix to the
course's banks but the instructor, and a queue that quietly filled up in forty-eight separate
clones would be a queue nobody reads.

## What not to do

**Do not re-serve a question they have just seen.** The draw is random per run, so a second
practice quiz on the same session will overlap, and that is fine: what is not fine is answering
"can I try that one again" by handing back the same item. Offer another run, or the review
workflow, which serves a different instance of the same goal.

**Do not write anything into `learning-topics` except through the two tools above.** The
attempt log and the status log are append-only, and a hand edit is how a fold starts producing
a wrong date rather than an error.

**Do not treat a low score as a reason to soften the next one.** The grader is the same one the
real quiz uses. That equality is the entire product.

## Depends on

- [`quiz/grade`](workflows/quiz/skills/quiz/grade/SKILL.md) - skill
- [`learn`](workflows/learn/skills/learn/SKILL.md) - skill
- [`quiz-practice.mjs`](workflows/quiz/tools/quiz-practice.mjs) - tool
- [`quiz-draw.mjs`](workflows/quiz/tools/quiz-draw.mjs) - tool
- [`survey.mjs`](workflows/learn/tools/survey.mjs) - tool
- [`record-attempt.mjs`](workflows/learn/tools/record-attempt.mjs) - tool
- [`record-status.mjs`](workflows/learn/tools/record-status.mjs) - tool
- [`quiz-day.bpmn`](workflows/quiz/quiz-day.bpmn) - diagram
