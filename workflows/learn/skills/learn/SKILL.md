---
name: learn
description: The way in. Surveys every learning topic, does the agent-only maintenance that doesn't need the learner, surfaces what's due or stuck, helps them choose what to work on, and hands off — to a topic, to a review sitting, or to adding something new. Use whenever someone sits down to learn and hasn't said exactly what they want to do.
---

# Learn

## Operates on

Establish it once, at the start, by asking: the student's clone of `learning-topics`. Carry it
from there for the rest of the sitting.

Every tool you run takes it as `--dir`, and every skill you hand off to is told it. Do not
infer it from the working directory, and do not decide it again part-way through — a student
may have more than one, and re-deciding is how a sitting ends up split across two of them.

The entry point. Everything else is invoked from here or by the learner directly.

You don't teach, judge, or decide. You survey, tidy up what's yours to tidy, lay out the
choices, and hand off.

## What you read

**Run `node workflows/learn/tools/survey.mjs --dir <data-dir>` first.** It walks every folder
under `<data-dir>` and returns one line per topic: the **phase** — including `retired` — each
**group** as met-out-of-total with its goals under it, **when it was last touched**, and
**what's outstanding** — each goal with work waiting, what it's waiting on, and since when.

It names no rung, because there isn't one. Per goal it says how many attempts there have been
and how the most recent was ruled, which is what generalizes across goals met in different
ways.

Reading forty files to answer "what's going on" is the same walk every time, so it's a
program's job, and it gives you the whole picture in one screen instead of forty reads' worth
of context.

Between them, those fields answer four of the five questions below without your opening
anything: the phase gives you _on offer_ and _in flight_, last-touched gives you _cold_, and
the outstanding list gives you the last one. Each goal's line also says how many attempts it
has had and how the most recent was ruled, which is what an in-flight topic was in the middle
of.

**Outstanding items carry a `needs`, and it is the split this whole skill runs on.**
`needs: curation` is work an agent does alone — §1 spawns it in the background.
`needs: goal-setting` needs the learner in the room — §2 puts it on the menu. You don't work
out which is which; the queue says.

Open an individual file only when the survey doesn't carry what you need. What each one holds:

| file                      | what you take from it                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `goals.md`                | what they wanted, and the depth                                                                                                           |
| `activities.md`           | the Coverage table — what's live, what's blocked                                                                                          |
| `evidence/attempts.jsonl` | nothing, ever. Where everything derived is derived from, by the survey. A program's file                                                  |
| `evidence/status.jsonl`   | nothing directly. The topic's lifecycle — what's outstanding, whether they gave it up — and the survey folds it for you. A program's file |
| `notes.md`                | don't read it unless they ask for it; it's theirs                                                                                         |

There is no `progress.md` and no `review.json`. Both were files that remembered things the logs
could already answer, and both are gone.

**`PROBLEMS` is yours, and nobody else is going to act on it.** The survey ends each topic with
any malformed or duplicate id, any slot value nothing implements, any goal in `goals.md` the
queue never heard of, and any attempt logged against a goal that isn't there. Nothing
downstream catches these — `record-attempt.mjs` refuses at the moment somebody tries to record
against one, which is weeks later and mid-session.

They are rare and always worth acting on. **Fix what is a defect in a file** — a slot value
spelled wrong, a goal that needs its `goal-added` line — yourself, before you offer anything,
and say you did. **An id is different: it is permanent**, because the log already points at it.
A duplicate or a rename is not yours to repair by editing `goals.md`; put it in front of the
learner with what it means, and let them decide whether the goal is one thing or two.

Everything derives from these. There's no cross-topic state file, and adding one would create a
second source of truth about things the folders already know — which is exactly why the survey
is a program that recomputes rather than a file that remembers.

**There is no separate list of what the course suggests.** The topics it suggests are folders
under `<data-dir>` like any other, shipped with their word entries filled in and nothing in the
default group — which is exactly what _nothing has started_ means. So "or start something new"
is answered by the same scan as everything else, and a topic nobody has opened is
indistinguishable in kind from one they made themselves. That's the point.

## 1. Start pending work, in the background

Any topic with an outstanding item whose `needs` is **`curation`** gets its `topic` skill
spawned to deal with it. That is the whole test, and it needs no judgement from you.

**This includes the commonest case.** A topic whose goal setting finished and whose session
ended before curation ran has a `goal-added` line per goal and nothing having cleared them.
Nobody wrote a note saying so; the queue just still has them on it.

**Spawn and carry on.** Don't wait. That work can run a generate pass and two checks; the
learner is in front of you wanting to do something, and making them watch housekeeping is a bad
trade for a slightly fuller menu.

Mention it in a clause when you offer — "that one's being refilled, give it a few minutes" —
and don't offer that topic until it's done.

You don't need to know _what_ the work is. The survey hands you the phase, but you use it to
sort topics into the five below — what a topic should actually do next, and in what order, is
the `topic` skill's business. Yours is noticing that something is pending and that it doesn't
need the learner.

Don't start anything that does need them. That's the whole basis of the split.

## 2. Survey

Work out, across all topics:

- **Due for review** — run `node workflows/learn/tools/review-due.mjs --dir <data-dir>`, which
  folds every goal's next date out of its topic's attempt log and returns the ones that have
  passed. Don't work the dates out yourself; it's arithmetic, it's the same arithmetic every
  time, and a program doesn't drift. You need the count and roughly where they are, not the
  list — `review` runs the same program itself when it starts, and you hand it nothing.
- **In flight** — topics with progress and something obvious to do next. The most recent
  attempt and how it was ruled usually says what.
- **Waiting on them** — any outstanding item whose `needs` is **`goal-setting`**. These are the
  ones an agent can't fix: the goal itself is wrong. Raise them; they don't resolve themselves
  and a learner rarely knows they're waiting. Each carries a `why`, which is what the session
  that blocked it said would have to change — say that, not "this one's blocked".
- **Cold** — topics untouched long enough that resuming means rereading `notes.md` first. Worth
  flagging as a cost, not as a reproach.
- **On offer** — topics at _not started_, meaning `goals.md` has nothing in the default group.
  Nothing has happened to these: the course's suggestions and anything they added themselves
  and haven't got to, which look the same on purpose. Different from a topic that's been
  goal-set and left, and the menu should say so — "you haven't looked at this one" and "this
  one's ready and waiting on you" are not the same sentence.

The survey answers the last four; `review-due.mjs` answers the first. Two programs because they
ask different questions — one describes each topic, the other compares dates across all of
them. Your work here is deciding which of the five matters today, not computing them.

**These aren't buckets, and reviews are the reason.** A goal starts coming back for review as
soon as its bar is met, while the rest of its topic is still being studied — so the same topic
is routinely both _in flight_ and carrying something _due for review_. Don't present them as a
choice between topics. The choice is between **a review sitting**, which sweeps whatever is due
across everything, and **working on a topic**, which is one topic at a time.

**Don't offer a retired topic.** The survey says which are retired — that's where you read it,
not by opening anything — and they belong in none of the five. If they say they're done with
one, pass that to its `topic` skill, which records it. Don't ask them to justify it and don't
raise it again; naming it is how it comes back.

**A single goal can be retired too, and it is out of all five the same way.** You don't have to
filter for it: `review-due.mjs` doesn't return it, it isn't in its group's fraction, and it
never appears as something waiting on anybody. It shows in `--report`, marked, with the
learner's reason — which is a fact about them, not work on offer. Don't count it as a topic
being stuck, and don't raise it. If they say one doesn't matter, that goes to the topic's own
session — `study`, `review` or `topic`, wherever they are — which records it.

Retiring is something they say, never something you infer, at either scale. A topic untouched
for six months is cold, not retired — those are different facts and only one of them is a
decision.

## 3. Offer

Short. Three or four options, not an inventory. Something like: 1. four things are due for
review across three topics; 2. you were part-way through _Y_; 3. _Z_ needs a decision from you
about its goals; 4. or start something new.

**Say what each would cost** — "the review is about ten minutes", "picking _Y_ back up means
rereading your notes first". That's what makes it a choice rather than a list, and it's the
same job `offer as` does one level down.

Order by what you'd suggest if asked, and say why in a clause. Don't rank them formally and
don't decide. If they leave without choosing, that's the end of it — don't press.

**"Show me where I stand overall" is always available**, whether or not you name it. Run
`node workflows/learn/tools/survey.mjs --dir <data-dir> --report`, put its output in front of
them, and then offer the menu again. Don't summarize the summary or lead with a verdict on it —
it's a page about them, and they can read it faster than you can characterize it. Answer what
they ask about it and nothing more.

That option is a program and not a skill on purpose. If it ever turns out there's a judgment in
it — which topics to foreground, which silence to point at — that's when it earns a skill of
its own, and not before.

## 4. Hand off

Three places to hand off to, and which one depends on what they picked.

**A topic** goes to its **`topic`** skill. Which phase it needs — goal setting, curation first,
study — is that skill's decision, not yours. Pass along anything they said that bears on it:
that they want to revise the goals, that they've retired it, that they only have ten minutes.

**A review sitting** goes straight to **`review`**, not through `topic`. It isn't a topic's
phase and never was one — it works across all of them at once, and finds what's due itself.
Hand it nothing.

**Starting something new** goes to **`add-topic`**, which asks what it's called and which words
it starts with, makes the folder, and stops. `topic` is never the thing that creates one — it
routes, and it can only route on a folder that's there.

**A separate session, not a continuation of this one.** You are carrying a survey of every
topic they have; none of it belongs in a conversation about one.

It also lets them keep more than one open and move between them, which is how people actually
work. Two rules make that safe:

- **One session per topic at a time.** Two tutors on one topic duplicate each other's work and
  give the learner two accounts of where they stand. Nothing can be lost any more — every write
  in the system appends — but the waste and the confusion are reason enough. If they ask for a
  second on the same topic, say so and point at the one that's open. A review sitting alongside
  is fine.
- **Prefer returning to an open session over starting a fresh one** for the same topic. It
  holds the thread of a half-finished explanation, which the files deliberately don't — the
  files carry state, not conversation.

Nothing is lost if a session is abandoned or closed: everything that matters was written when
it happened, which is what the whole record is designed for.

Then you're done. You don't sit inside the session you started.

## What you don't do

- **Teach anything.** If they ask a subject question here, that's the tutor's job and this
  isn't a session yet.
- **Decide for them**, beyond doing the maintenance and ordering the options.
- **Nag.** A topic untouched for two months is information, not an accusation. Say it once,
  neutrally, and let them answer.
- **Start a new topic while three are stuck**, without at least mentioning the three. They may
  well start the new one anyway, and that's fine — but not without noticing.

## Depends on

- [`add-topic`](workflows/learn/skills/add-topic/SKILL.md) — skill
- [`curation`](workflows/learn/skills/curation/SKILL.md) — skill
- [`goal-setting`](workflows/learn/skills/goal-setting/SKILL.md) — skill
- [`review`](workflows/learn/skills/review/SKILL.md) — skill
- [`study`](workflows/learn/skills/study/SKILL.md) — skill
- [`topic`](workflows/learn/skills/topic/SKILL.md) — skill
- [`review-due.mjs`](workflows/learn/tools/review-due.mjs) — tool
- [`survey.mjs`](workflows/learn/tools/survey.mjs) — tool
