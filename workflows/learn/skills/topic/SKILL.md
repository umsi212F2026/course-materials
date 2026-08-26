---
name: topic
description: Run one learning topic — work out which phase it needs next, do the agent-only parts without the learner, and start goal setting or study when their attention is required. Invoked by the learn skill, or directly when someone names a topic they want to work on.
---

# Topic

**Status: draft.** Written 2026-08-17 during SI 212 workflow design. Not yet run.

## Operates on

`<topic-dir>` — one topic folder, named `<area>-<yyyy>-<mm>/`, inside the student's
learning-topics clone.

You are told this directory. Do not choose it, and do not guess it from the working directory —
whatever invoked you established it already.

One folder. You decide what it needs next and start it. You don't teach, judge, or curate — you
work out which of those should be happening.

**The folder exists.** `learn` offers two kinds of thing — work on a topic you have, or add a
new one — and the second goes to `add-topic`, which makes the folder. By the time you're called
there is always something to read.

If you are somehow invoked on a topic with no folder, that's a new topic rather than a broken
one. Hand it to `add-topic` and stop. Don't create anything yourself; a folder made silently
arrives with an empty template where it should have arrived with the learner's own word list.

## What the folder tells you

**A topic's phase is derived, never stored.** Nothing writes down "this one is in curation" —
the files say it. Don't work it out yourself; run

```
node workflows/learn/tools/survey.mjs <topic-folder>
```

and read the phase off it. `learn` and the progress report run the same program over the same
folders, which is what keeps three readings of one topic from drifting apart.

It hands you two things: **the phase**, and **what's outstanding**. These five rows are the
phases it derives. Where they disagree with the program, the program is right and this has gone
stale.

|                                              |                                                       |
| -------------------------------------------- | ----------------------------------------------------- |
| `goals.md` with no goal in the default group | nothing has started. Goal setting.                    |
| goals, no live activities                    | curation, then study.                                 |
| live activities, required goals unmet        | study.                                                |
| every required goal met                      | nothing pending. If they're here, offer goal setting. |
| `retired`                                    | nothing, unless they've just said to revive it.       |

**Required** is a slot on the goal, and it defaults to yes. An orientation carries
`is_required: no`, so a topic isn't held open by one nobody bothered with. **A retired goal
doesn't hold it open either** — see _One goal, the same way_ below — and that is a different
fact: `is_required: no` says the goal never blocked completion, not that the learner stopped
wanting it.

An outstanding item is not a phase, and doesn't replace one — a topic can be _studying_ and
carry one at the same time. Each says which goal, what it's waiting on, and why:

|                       |                                                                          |
| --------------------- | ------------------------------------------------------------------------ |
| `needs: curation`     | curation, then back to study. Yours to run; see below.                   |
| `needs: goal-setting` | their decision. Goal setting, with what the item's `why` says was wrong. |

**Curation clears its own items.** It writes `curated` for each goal it built or stamped an
entry for, and `blocked` for each one it can't — so a goal never sits on the queue after
curation has looked at it, and never gets re-invited into a phase that already gave up on it.
You don't clear anything on its behalf.

**Read `activities.md`'s Coverage table** if curation is what's next; it's what says which
goals have nothing live, and it isn't in the survey output.

**Review is in neither table, and that isn't an omission.** _In review_ is a property of a
goal, not of a topic: each one starts its own schedule the moment its bar is met, while the
rest of the topic is still being studied. So there is no transition for you to notice and
nothing for you to start. `review` works across every topic at once, finds what's due itself,
and is reached from `learn` rather than through you.

Which is why _every required goal met_ is not a phase. Nothing is pending; the goals keep
coming back on their own dates without you.

**But a finished topic is not a closed one, and this is the row to get right.** If they came
here deliberately and everything is met, don't tell them there's nothing to do — offer goal
setting. Adding capabilities or words to a topic they've finished is an ordinary thing to want,
and it costs nothing: the new ones are simply unmet, and the old ones keep their review dates.
Say it, because nothing else in the workflow will.

**`notes.md` is worth reading before you hand off**, though nothing above depends on it.
Pointing a learner at something they wrote themselves weeks ago is a better way back into a
topic than a summary of where they stand. Read it to find that; don't mine it, and don't quote
it back at them as evidence about anything.

## When the phase and an outstanding item disagree

Which is ordinary, not an edge case. The phase is derived from the files; an outstanding item
is somebody reporting that those files are wrong. A topic derives as _studying_ while the queue
says a goal needs revising — study is what the files support, and the item is the note saying
not to trust them.

**Work upstream.** A defect in `goals.md` makes everything derived from it suspect, and the
activities are what studying runs on:

1. **Goal setting**, if the goals need changing.
2. **Curation**, if the menu does.
3. **Studying.**

A guide, not a rule, and not something to explain. If the learner is here and wants a different
one, they get it; say once what you'd have suggested, and why.

## Agent-only work happens without them

**Curation is yours to run, whenever this topic needs it.** Nobody has to ask for it and the
learner shouldn't have to know it exists. That covers two occasions: goal setting has just
finished, and the queue carries a `needs: curation` item because a goal has run out of
candidates.

The one that matters most: **goal setting has just finished.** There are goals and no
activities, and the learner is sitting there ready to work. Start curation now.

**Start it in the background and say you have.** A generate pass and two checks take minutes,
and a learner watching a progress-free wait will read it as the thing having hung. Tell them
it's running, roughly how long, and that they can wait or go and do something else — that
choice is the reason to say it at all, and they can only make it if they know.

Nothing else in this topic is available until it finishes; there are no activities yet. If they
don't want to wait, hand them back to `learn`, which has every other topic in front of it.

If you were invoked in the background with nobody present, just run it.

## Their attention is a different matter

Two things need the learner and can't be done for them:

- **Goal setting**, including a revision. `goals.md` is theirs, and it changes only here —
  never as a side effect of another phase.
- **Study.** Obviously.

Start these as a **separate session** rather than continuing in yours. You're holding a survey
of this topic's state; a tutor doesn't need it and shouldn't inherit it.

**If it's evident a session is already open on this topic, point at it** rather than starting a
second. You can't check — nothing records which sessions are running, so you'll only ever know
because the learner said so. When you do know, it's worth acting on: two tutors on one topic
duplicate each other's work and give the learner two accounts of where they stand. Nothing can
be lost — every write in the system appends — but the waste and the confusion are reason
enough.

**A review session running at the same time is fine**, and you couldn't prevent it anyway:
`review` sweeps every topic and may be part-way through a goal in this one. It isn't a
collision — it works on goals whose bar is already met, and study works on the ones whose
isn't.

## When you can't proceed

If an outstanding item needs a decision only the learner can make — `needs: goal-setting` — and
they aren't here, don't guess and don't start something else instead. Leave it on the queue;
`learn` raises it next time they appear.

If they _are_ here, put it to them plainly: what the session that blocked it said was wrong,
what you'd change, and that it's their call.

## Retiring and reviving

**Retiring is giving a topic up for good.** Not having finished it, and not being done for
today — "I think I'm done" at the end of a session is somebody stopping, which needs no marker
and certainly not this one. If which they mean isn't obvious, ask. It's one question, and the
two answers have nothing in common.

When they do mean it, run

```
node workflows/learn/tools/record-status.mjs <topic-folder> retired --reason "<their words>"
```

Don't ask for a reason — write down what they said when they said it. And **don't record how
far they got**: survey derives that from the attempt log and it stays derivable after
retirement, which is the whole reason there is nothing to write down.

**What that does:** `learn` stops offering the topic, you stop routing it anywhere, and
`review-due.mjs` stops returning its goals — someone who has given up on _Data_ shouldn't keep
being handed its words. Nothing else changes; the attempt log is untouched.

**Reviving is a second event, not a deletion.**
`node workflows/learn/tools/record-status.mjs <topic-folder> revived`, and carry on from
wherever the record says they'd got to. Nothing was rolled back, so what was met is met again —
and the record still shows they gave it up once and came back, which is a true thing about them
that an erased line would have destroyed.

The review dates come back with it, and some will have passed while the topic was retired — so
the first session after a revival is likely to be a review rather than study. That's correct,
and worth warning them about before it happens.

Never infer either one. A topic untouched for months is untouched; only the learner can make it
retired.

### One goal, the same way

**A learner can give up one goal without giving up the topic**, and it is the commonest version
of this — usually a word. _"I don't think this one matters"_ is the whole of what they have to
say. Same two commands, with the goal id added:

```
node workflows/learn/tools/record-status.mjs <topic-folder> retired <goal-id> --reason "<their words>"
node workflows/learn/tools/record-status.mjs <topic-folder> revived <goal-id>
```

**What it does, and what it doesn't.** The goal stops coming back in review and leaves both
halves of its group's fraction — `vocabulary 7/12` becomes `7/11`, because a goal they
abandoned is not a goal they failed. Its attempts stay in the log exactly where they are;
nothing is deleted, and nothing has to be cleaned up afterwards. It shows in the report,
marked, with their reason, below the met ones.

**Deleting the entry is not the alternative.** Ids are permanent — the attempt log points at
them — so removing a goal that has attempts orphans those lines, and `survey` reports it as a
problem. Retirement is the mechanism at both scopes.

**Ask which they mean, once,** if it isn't obvious: this goal, or the whole topic? Then take
them at their word. Don't argue and don't ask them to justify it — same posture as retiring a
topic.

**Reviving the topic doesn't revive them.** A word they dropped on its own stays dropped, which
is right: nobody said otherwise, and guessing would hand them back something they'd already
decided about.

## Depends on

- [`add-topic`](workflows/learn/skills/add-topic/SKILL.md) — skill
- [`learn`](workflows/learn/skills/learn/SKILL.md) — skill
- [`review`](workflows/learn/skills/review/SKILL.md) — skill
- [`record-status.mjs`](workflows/learn/tools/record-status.mjs) — tool
- [`survey.mjs`](workflows/learn/tools/survey.mjs) — tool
