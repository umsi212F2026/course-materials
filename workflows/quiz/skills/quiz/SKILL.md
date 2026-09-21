---
name: quiz
description: Sit a practice quiz, drawn from the same pool and marked by the same grader as a real one, then go over what was missed. Use when a learner asks to practise for a quiz, or wants to know whether they would pass one. It records an attempt against each goal the quiz examined, so a practice run moves review dates. Not the same as review, which serves what is due; this serves what one session's quiz would.
---

# Quiz

## Operates on

Two clones, and **establish both from `~/.codex/AGENTS.md` before you say anything**. That file
names them, on every machine, and it exists so that nothing has to guess or ask:

- **`course-materials`** - the course's own clone, holding the pools and the tools below. Every
  command here is run from inside it.
- **`learning-topics`** - the learner's clone, holding the topics the quiz examines. This is
  where the attempts go. The tools derive it from the first as a sibling, so you pass it to
  `survey.mjs` and nowhere else.

**Do not open with a question about a directory.** A learner asking to practise for a quiz did
not choose those paths and cannot confirm them. Ask only where that file is missing or names a
folder that is not there, and say that is what happened: a broken install is worth telling them
about. If they answer something that is not a path, that is them saying the question made no
sense, so take the file's answer and get on with step 1 rather than asking twice.

**The question this session asks is the real one: would you pass Tuesday's quiz?** Not what do
you know about this topic, and not what would you like to go over. The whole value is that
nothing here is softened, so the answer means something.

## The one rule that everything else serves

**You do not help, at any point before the answers are submitted.** Not a hint, not a
definition, not a "think about what happens to the old commit". Not even confirming that an
answer sounds right.

The page is the only arrangement where a student answers with nobody holding the rubric, and it
stops being that the moment you talk about the material while it is open. **If they ask you
something while the quiz is up, say you cannot answer until they submit and that everything is
fair game afterwards.** That is not a rule you are enforcing on them; it is what makes their
score worth reading.

**Do not open the quiz page yourself, with a browser tool or anything else.** You will have a
browser available and the URL in front of you, and it is the one thing in reach that destroys
this outright: a page you have read is a page whose questions you know before they answer, and
a page you can type into is a quiz you can sit for them. The tool hands you their answers when
they submit, which is the only way you are meant to get them.

## The sequence

### 1. Find out what they can practise, and let them pick

```
node workflows/quiz/tools/quiz-practice.mjs --list
```

**This is the first thing you run, and running it is how the session opens.** One line per
published pool: a session number, the date of that quiz, how many questions, and the topic. A
pool appears when the instructor publishes it, so a session missing from the list is one nobody
can practise yet.

**Match what they already said against those dates before showing them anything.** Nobody says
"session 5"; they say _last Tuesday's_, _the one about commits_, _the most recent one_. Each of
those picks a line out of that list on its own, and where one does, you have your answer and
the list is not a question to put to them. Say which quiz you are drawing from, in a clause, so
a wrong match is visible and correctable.

**Only where it is genuinely ambiguous, show the list and let them choose.** Two quizzes in the
same week, or nothing said at all.

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

**Take whichever they pick, with no second attempt at persuading them.** Studying first is the
better order and saying so once is the whole of your part in it; a learner who wants to know
where they stand right now has a good reason, and "practise cold, then study the gaps" is a
real strategy rather than a mistake to be talked out of. If they choose to study, hand off to
`learn` for that topic and stop.

**The offer is the gate.** There is no readiness check that refuses to serve a quiz, and there
is not meant to be.

### 3. Launch the page, and stop talking

```
node workflows/quiz/tools/quiz-practice.mjs --session <n>
```

**It prints the URL in about a second and then does not exit until they submit.** Two things
follow, and getting either wrong costs several minutes of thrashing.

**Ask for escalated permission on this command the first time, without waiting to be refused.**
It opens a page on `127.0.0.1`, which a sandbox refuses by default. Nothing is served off the
machine and no request leaves it, which is what the justification should say.

**Do not background it with `&` or `nohup`.** The process does not survive the command
returning, and the log comes back empty with no error to explain it. Run it in the foreground
and let the command yield while it keeps running: the URL is printed long before any sensible
yield elapses, and the server is still there when you get your turn back.

Take the URL from what it printed, and send them this as **the last thing in the turn**, with
that URL rather than the one below, which is only the usual one:

> Your practice quiz is at **http://127.0.0.1:5300**. `<n>` questions, drawn the same way the
> real one was, from the same pool.
>
> Answer them cold, with nothing else open, and nothing from me: I cannot see what you write
> until you submit, and that is the point. **Come back here and tell me when you have pressed
> Submit.**

**If the command printed a `SHORT:` line, its sentence goes into that block, ahead of the
rest**, with what the `PROBLEMS` lines above it name as missing:

> **This draw is short: 4 questions, not the 5 this quiz asks for.** You have not got
> `assignments/ps1-data-analysis`, so nothing could be drawn from it. Running `update` and
> sitting this again would give you the whole quiz.

**A short draw is served rather than refused, and saying so is the whole of your part in it.**
Practising the rest is worth doing and they are the one who decides. But nobody can count the
questions they were never shown: unsaid, a student reads a score out of four as a score out of
four, and concludes they are ready on material the quiz never reached.

**Do not paraphrase the questions into the chat, and do not read them yourself first.** You
will see every one of them in a moment, and reading them now is how a conversation about the
material starts by accident.

**When they come back, read what the command printed.** Its last lines name the directory
holding `queue.json`. If it has not named a directory yet, the submission has not arrived: say
so and ask them to press Submit, rather than grading an empty queue.

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
goal examined only by multiple choice never reaches step 5, so this is the only place anybody
asks the question about it, and picking the right option out of four is not evidence that
somebody can commit and restore.

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
stands, and `row.tags` where the row has one.

**`row.topic` is an absolute path and goes in exactly as it is**, with nothing to strip, join
or rebuild: a folder name reassembled into `../learning-topics/<name>` works from one directory
and fails silently from any other. **Everything this tool takes is on that row, so there is no
reason to open it.**

The label is the one thing you build:

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

> **3 out of 4** on the session 5 practice quiz.
>
> ---
>
> **1. Full credit.**
>
> _Your editor keeps an undo history, and a git repository has a history. What is the difference
> between them?_
>
> You wrote: "The editor's history is of changes to a file before it is saved. The git repo
> history shows all commits, which are snapshots of the state of all files as of the commit."
>
> ---
>
> **2. Half credit.**
>
> _A classmate says: "The diff between Thursday's commit and my latest commit doesn't mention
> notes.md anywhere, so notes.md must have been deleted." What is wrong with what they said?_
>
> You wrote: "It probably just didn't change."
>
> You have the right idea, but not stated as the reason their conclusion is wrong: a file
> missing from a diff has not changed between those two commits, and a deletion would have
> appeared in the diff as every line removed.
>
> The answer that earns full credit: a diff shows only what differs between the two commits, so
> a file it does not mention is the same in both. If notes.md had been deleted, the diff would
> show it.
>
> ---
>
> **3. Full credit.** ...
>
> **If you think I marked something wrong, say so and tell me why.** I will take your word for
> it: you can see your own answer and I only have what the rubric says. Otherwise, tell me
> which one you want to go over.

**Every item gets its question and what they wrote, whatever the mark.** The page is closed by
the time they read this, so a bare "2. No credit" leaves them unable to tell which question it
was or what they said. Both are on the row as `prompt` and `answer`, and an mcq's `answer` is
already the choice they picked rather than an index.

**An mcq entry lists every choice, numbered, between the question and their answer.** They are
on the row as `choices`, in the order the student saw them. The page is closed, so naming a
right answer without the list it came from tells them nothing about what they rejected, and the
distractor they fell for is the whole of what there is to learn from a wrong mcq. `expected` is
the text of the correct choice, never its number:

> **2. No credit.**
>
> _You are twenty messages into a chat in Codex, working on your app, and you send one more
> message. Which of these is counted in that turn's input tokens?_
>
> 1. Your new message, the twenty messages before it, the system prompt, and the contents of
>    any file the agent has read into the chat.
> 2. Only your new message.
> 3. Your new message and the agent's reply to it.
> 4. Every chat you have had with Codex this week.
>
> You wrote: "Your new message and the agent's reply to it."
>
> The answer that earns full credit: "Your new message, the twenty messages before it, the
> system prompt, and the contents of any file the agent has read into the chat."

**On less than full credit, add the row's `missed` and then its `expected`, in that order.**
Quote `missed` rather than summarising it: the same grader wrote it that marked the real quiz,
and a friendlier version is a different mark's worth of feedback. `expected` is the model
answer, introduced as what earns full credit. On full credit neither applies, and the question
and their answer are the whole entry.

**Say the correction sentence every time, including on a perfect score.** A learner who does
not know they can argue will not argue, and a student overruling the grader is the one place in
this course where they are the human in the loop rather than the subject of it.

**Where you flagged an item because the rubric itself looked wrong, say so, in that item's
entry.** [`quiz/grade`](workflows/quiz/skills/quiz/grade/SKILL.md) has you rule by the credit
line anyway and leaves the practice quiz to put it in front of the student. This is that:
unsaid, the flag goes to a file in `tmp/` that is deleted, and the one person who could act on
it never hears.

> I marked this against the rubric, which is what I am meant to do, but I think the rubric is
> wrong here: `<what is wrong with it, in a clause>`. If you agree, say so and I will take your
> mark instead of mine.

**A capability flag is not this, and is not said to the student.** Every capability item is
flagged by construction, because the mark and the evidence come apart on all of them. There is
nothing there for anybody to act on and nothing worth interrupting a report for.

### 9. Go over what they missed

No fixed order. The learner replying to step 8 starts it, and they steer.

**This is the most valuable part of the session and the report is only the way into it.** Aim
at what went wrong underneath rather than at the wording: a miss is usually one distinction
that was not there.

**Offer the harder thing.** A word missed here comes back in review in three days and they get
another go at it, so what is worth the next ten minutes is whichever misconception produced the
answer, not a corrected sentence to remember.

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
