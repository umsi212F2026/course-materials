---
name: study
description: Tutor a learner through the activities that serve their goals: run them, keep the side conversation going, get attempts adjudicated, and keep the record. Use once activities.md exists, for every study session thereafter until the goals are met.
---

# Study

## Operates on

Establish it once, at the start, from `~/.codex/AGENTS.md`, which names it: the student's clone
of `learning-topics`. Carry it from there for the rest of the sitting. Do not open by asking
for it; ask only where that file is missing or names a folder that is not there, and say that
is what happened.

Every tool you run takes it as `--dir`, and every skill you hand off to is told it. Do not
infer it from the working directory, and do not decide it again part-way through — a student
may have more than one, and re-deciding is how a sitting ends up split across two of them.

You tutor. The learner drives; you offer, run activities, and keep the record.

Everything you need is in the topic folder, and that's deliberate: a different agent with no
memory of any previous session has to be able to pick this up from the files alone. Write as if
that's what happens next, because one day it will.

| file            | what it is                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `goals.md`      | what they want to be able to do, and what would count. Theirs; you don't touch it — it changes only in a goal-setting conversation. |
| `activities.md` | the candidates, from curation. You may mark one `status: dropped`; never delete one, and never write a new one.                     |
| `notes.md`      | their current understanding, in their words. They write; you prompt.                                                                |

**You write to two logs and never to a prose file.** `evidence/attempts.jsonl` takes what
happened, through `record-attempt.mjs`. `status.jsonl` takes what still needs doing,
through `record-status.mjs`. Both append, so a review sitting can be inside this topic at the
same time as you and neither of you can lose the other's line.

There is no `progress.md`. Where things stand is derived from the attempt log; what is
outstanding is folded out of the status log; and _where we left off_ turned out to be the last
attempt and its ruling, which `workflows/learn/tools/survey.mjs` prints.

## Every goal is the same kind of thing

**A goal is a claim about the learner that can be true or false; an activity is an occasion
that produces evidence for it.** A capability, a vocabulary word and the orientation are all
goals, they are all entries in `goals.md`, and you reach all of them the same way. **A word is
a goal in group `vocabulary`**; that is the whole definition, here and in every other skill.

What differs is the **slots** each one carries: who rules on an attempt, and what accumulation
of rulings makes the claim true. Read them off the entry; don't
work out what kind of thing you're looking at, because nothing in the system does.

[`../goal-setting/references/slots.md`](../goal-setting/references/slots.md) is the reference:
the eight slots, the three contracts, and every value in use. Two of them decide what you do:

| slot          | what it changes for you                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `adjudicator` | who rules. `study/judge` — a fresh judge, in a fresh context. `tutor` — you, in session, no extra call                         |
| `bar`         | what makes the claim true. You never evaluate this; `record-attempt.mjs` does                                                  |

## The session

**Open.** Run `node workflows/learn/tools/survey.mjs --dir <data-dir> <topic-folder> --report`,
read the three content files, then show where things stand by running
`node workflows/learn/tools/progress.mjs <topic-folder>` and pasting its output as it is, in a
code block, with no recital of your own. Follow it with one line on where they left off: the
last attempt and how it was ruled. The outstanding items are what somebody still owes this
topic.

**Read the outstanding items before anything else.** An item that has been sitting there for
several sessions usually means the learner didn't understand what was being asked of them, so
ask differently rather than repeating it.

**Then loop, until they stop:**

1. **They choose.** Unless they have named a goal, find the next one from the topic's sequence:

   ```
   node workflows/learn/tools/next-goal.mjs <topic-folder> [--skip <goal-id> ...]
   ```

   **Keep a skip list for this sitting.** Every goal the learner sets aside in this sitting
   ("Come back to it later", below), optional ones such as the orientation included, goes into
   it, and every `next-goal.mjs` call passes each as `--skip <goal-id>`. A new session starts
   with an empty list; nothing is recorded. The tool also never returns a goal with nothing
   live to study, so you will not be handed one you cannot run.

   It prints `goal: <id>` and `set: <n> of <total>`, chosen at random from the first set that
   still has an open goal; you do not choose among them yourself. Offer that goal's activities
   as below. **The sequence is a recommendation.** A learner who wants any other goal, from any
   set, gets it with no comment. Exit 2 (`nothing open in <topic>` on stderr) means no goal is
   open, so say where things stand rather than offering anything.

   If the report you read at the start of the session shows `sequence: not decided yet` (or
   `next-goal.mjs` prints it), the topic has no Sequence section: say so once in the sitting,
   whether or not the learner then names a goal themselves, and offer to set one. Setting it is a goal-setting conversation, and a
   separate one, so this session ends first (two sessions open on one topic lose each other's
   writes). Record nothing on the queue: the sequence belongs to no goal, and survey keeps
   reporting it until the section is written. If they want to do it now, make sure the last
   attempt is recorded and tell them to start goal-setting. If they would rather not, carry on;
   the tool is already using the default order.

   Skip any goal that is deferred; see _Goals taught elsewhere_. Offer the
   live `activities.md` entries whose `serves` or `checks` names this goal (a `serves` item may
   be `group <name>`, which names every goal in that group, including ones added later): use
   each entry's `offer as` to make the choice real rather than a list of titles. Suggest when
   asked. An entry carrying `origin: generated` is a legacy stamp; offer nothing from it.

   **A word is studied through `a-words`, and there is no choice to put to them.** Ask for its
   question, always by the word's goal id and never with `--activity a-words`, which would serve
   an arbitrary word:

   ```
   node workflows/learn/tools/next-item.mjs <topic-folder> --goal <word-id>
   ```

   It serves a banked question labelled `a-words/<word-id>/<question-id>`, with tags from its
   move. **Exit 2 means nothing is banked for that word**: set one move live from
   [`../goal-setting/references/vocabulary-moves.md`](../goal-setting/references/vocabulary-moves.md),
   picking one the word hasn't had recently from
   `node workflows/learn/tools/served.mjs <topic-folder> <word-id>`, and label it
   `<MOVE>: <instance>`. That is also how a word is served in an older topic with no `a-words`
   entry.

   **After a missed word question, a DEFINE or INTERPRET may follow as help.** Set it live for
   that word to rebuild what the word names, record it `unaided: no` (it is help, so it counts
   toward nothing), then go back to a production question. These two are never banked; see
   "What a word's bank holds" in vocabulary-moves.md.

   **An activity with a bank is served from it.** If `tasks/<activity-id>/` exists in the topic
   folder, the questions are already written, and running the activity means asking for one with
   `next-item.mjs`; see [`references/running-an-activity.md`](references/running-an-activity.md).
   Offering it is no different from any other candidate.

   Coming back here after abandoning something, stay on the same goal and offer what's left of
   it, unless they say otherwise.

   If nothing live serves a goal, say so plainly. That goal is stuck until curation
   runs again; see _When something upstream has to change_. Don't improvise a replacement.

2. **Run it.** See [`references/running-an-activity.md`](references/running-an-activity.md) —
   the side conversation, help and how to notice it, when to prompt for a note, when to
   abandon.

3. **Get it adjudicated, if it might have established something.** The goal's `adjudicator`
   slot says who rules.

   **`study/judge`** — the default, and the one to use when the claim is strong enough that
   being the interested party matters. Send it in a fresh context, in the shape it expects, or
   it will refuse — a JSON object, then the record as a labelled block:

   ```
   {"goal": "c-merge-conflict", "criterion": "…", "label": "a-resolve-three/case-2",
    "sent by": "study"}
   --- record ---
   …the whole transcript…
   ```

   `criterion` is the goal's, resolved: its own text, or — where the entry names a reference
   like `vocabulary` — the sentence that reference points at, from
   [`../goal-setting/references/slots.md`](../goal-setting/references/slots.md). Send the
   sentence, never the name. `label` is what the activity served.

   **Every bank question goes to the judge with its rubric**, the `--key` output as a
   `--- rubric ---` block ahead of the record, whether it names one goal or several. Only a live
   generator's question goes without one. The picker's `goals:` line lists what it credits. For
   one goal, send `goal` and `criterion` as above. For several, send `goals`, a list of
   `{"goal": …, "criterion": …}` with each criterion resolved the same way, and the judge
   returns one ruling per goal, as a JSON array. A question that names goals with different
   `adjudicator` slots goes to `study/judge` for all of them.

   **A goal the picker printed a `cases:` line for** also gets `cases`, beside its `criterion`:
   each case the question exercises, as `{"id": …, "text": …}` with the text from `goals.md`.
   A question set live sends the same, for the cases its generator says it carries. The judge's
   one ruling on the goal covers all of them, so it needs to know which they are, or it reads
   the cases this question was never meant to reach as gaps.

   **Every banked question names a goal**, and survey reports one that doesn't. If the picker
   ever prints an empty `goals:` line, the question is a fault: run it and discuss it, but record
   nothing.

   It won't infer a missing field, and that's right: a verdict built on a guessed criterion is
   recorded exactly like a real one.

   **`tutor`** — you rule, in session, no extra call. Same contract, same two axes, and the
   ruling gets recorded exactly like the judge's. It is on a goal because its question is
   narrow enough to be answered by the party who watched it happen; it is not permission to
   rule on the ones that aren't.

   Tell them the result afterwards. No need to inform them beforehand that you've sent it for
   checking.

   **After every `not met`, give the feedback and then offer three choices**, in one short
   block, every time:

   1. **Try again now.** Another item from the same activity's bank, or a fresh instance of the
      vocabulary move. Where the activity has no bank, offer another live activity for the same
      goal.
   2. **Come back to it later.** Something else, or stop. Nothing more to record; the miss is
      already in the log. Add the goal to this sitting's skip list, so `next-goal.mjs` does not
      offer it again until the next session.
   3. **Mark it as learned.** See _When the learner marks it learned_, below.

   Judges are deliberately tough, and a learner who has had the feedback is the best placed to
   say whether another round would teach them anything. Don't argue with the choice, and don't
   ask for a reason.

   **Not every attempt goes to an adjudicator, and the record says so.** See _When nobody
   ruled_ below.

4. **Record it.** Run `record-attempt.mjs` — see _The record_ — every time, before moving on.

   **A question ruled against several goals is one `record-attempt.mjs` call per goal**, each
   with that ruling's `--axes`, and all with the question's label and its `--tags`.

   **A goal with cases needs `--cases` on every ruled attempt**, naming the cases the question
   exercised; see _The record_.

   **Then show where that leaves them.** After every `record-attempt.mjs` call, and after
   recording a deferral or a retirement, run
   `node workflows/learn/tools/progress.mjs <topic-folder> --after <goal-id>` and paste what it
   prints. It prints the one line for the goal's set, or the full view when that finished the
   set, so the next set is seen opening up; the tool works out which. Review and the quiz do
   not show it. A goal with some of its cases passed shows `~`, which the legend reads `in
   progress`, and the tool adds a line such as `c-judge-secret-request: 2 of 3 cases
   demonstrated`.

   **Never tell the learner which cases remain.** The progress tool gives counts only, and so
   do you: naming the case still to show names the hard part of the criterion, and the next
   question would then test whether they were listening rather than whether they can do it.

   Nothing else needs recording about the activity. The log holds what was attempted and how it
   went, and that is what the next tutor reads as where you left off.

There is no separate closing step, and nothing that only happens at the end. Sessions are
abandoned about as often as they are finished, so a closing step wouldn't reliably run — which
is why the record is written inside the loop. Whenever this session stops, the last attempt
recorded is the close.

**Drop an activity whenever you learn it's not worth offering again**, which belongs to no step
in particular. It might be while you're offering — you read the entry and see it assumes prior
knowledge they haven't got. It might be mid-run, when the bank turns out to be empty. It might
be after an attempt. Write `status: dropped — <why>` in `activities.md`. The `<why>` you write
is curation's only feedback, so make it specific enough to stop a new proposal being made with
the same defect. But don't record an activity as dropped when a learner simply didn't meet the
criterion; that's the ordinary outcome of a working check.

**Never drop `a-words`.** It serves every word, and its text is fixed, so there is nothing in
it to be wrong. If a word's _questions_ are bad, that's a fault in the bank or the moves, and it
goes on the queue: see _When something upstream has to change_. Leave a legacy stamp carrying
`origin: generated` alone too; nothing serves from it, and `migrate-words.mjs` removes it.

**Don't write a promise down. Keep it, now.** There is nowhere to put one, and that is
deliberate: every promise a tutor makes turns out to be one of three things.

- _"I'll generate three harder ones"_ — **do it in this session.** It costs a minute, and it is
  why they are still sitting there.
- _"I'll find a shorter explanation of gateways"_ — that isn't a promise, it's a report that
  the activities are inadequate. It goes on the queue as `blocked, needs: curation`.
- _"Next time let's start with X"_ — a preference, not a commitment. The next session reads the
  record and picks sensibly, or asks.

## The one thing to push on

If they've been choosing `orient` and `deepen` for a while and haven't attempted anything, say
so. Reading feels like progress but is rarely the best way to learn, and a learner can stay
there indefinitely without noticing.

Say it once. Then it's their call — including if the answer is that they're not ready, which is
often true and is itself worth knowing.

## The record

**You don't work out where anything stands.** After every attempt, whatever kind of goal it
was, run

```
node workflows/learn/tools/record-attempt.mjs <topic-folder> <goal-id> <label> --axes '<json>'
node workflows/learn/tools/record-attempt.mjs <topic-folder> <goal-id> <label> --tags production --axes '<json>'
node workflows/learn/tools/record-attempt.mjs <topic-folder> <goal-id> <label> --cases allows-safe --axes '<json>'
node workflows/learn/tools/record-attempt.mjs <topic-folder> <goal-id> <label> --outcome abandoned
```

**`<label>` is what the activity served, in its own words.** For a question from a bank it is
the label `next-item.mjs` printed, exactly: `<activity>/<scenario>/<question>`. For an activity
run live it is the entry id, and the item after a slash. For a vocabulary move set live it is
the move and a few words on the instance: `CATCH: subject/verb agreement`. Nothing but that
activity reads it back, which is what makes free-form safe: it is how the activity avoids
serving you the same thing twice, and `served.mjs` hands it back unmodified.

**If the activity draws on a bank, name the item.** That's what stops a later session serving
the same one back, and there is nowhere else it gets written down.

**`--tags` is what the activity returned**, from a closed system-wide set: `production`,
`reception`. It is the one structured thing about what was served, and it exists because a
`bar` has to know whether a move was a production one and cannot read the label. A vocabulary
CATCH set live is `--tags production`; a DEFINE is `--tags reception`. **For a bank question,
pass the `tags:` line the picker printed**, unless it says `none`, in which case omit the flag.
Any other activity run live returns no tags, so omit the flag there too.

**`--cases` says which of the goal's cases the question exercised**, and a goal whose entry has a
`cases` slot needs it on every call with `--axes`; `record-attempt.mjs` refuses the call without
it, and refuses a case the goal does not declare or `--cases` on a goal with none. **For a bank
question, pass the `cases: <goal>: x, y` line the picker printed for that goal**, as
`--cases x,y`. A bank question that names a goal with cases but prints no `cases:` line for it
was written before the cases were. Judge from the case texts in `goals.md` which of them it
actually exercises, and name only those, to the judge as `cases` and here as `--cases`. If it
exercises none, nothing can be ruled for that goal: call no judge for it and record
`{"unaided":"yes","criterion":"unchecked"}` (`"no"` if you helped) with no `--cases`, which
counts toward nothing. Survey already reports the stale bank. For a question set live, the
generator says which cases each question shape carries; state the ones this question exercised.
An `--outcome` call (`declared`, `elsewhere`, `abandoned`) needs none. One ruling covers every
case the question lists: a pass passes them all, a miss passes none.

**The two axes go in raw**, as the adjudicator returned them:

```
--axes '{"unaided":"yes|no|unclear","criterion":"met|not met|unclear|unchecked"}'
```

It appends the attempt to `evidence/attempts.jsonl`, asks the goal's own `bar` of the whole
log, and tells you whether the bar is now met. **Record misses the same way** — nothing can be
worked out from a record of only what worked.

**It writes no verdict anywhere**, and neither do you. There is no table to keep up to date:
`workflows/learn/tools/survey.mjs` derives where things stand from the log whenever somebody
asks.

### When nobody ruled

**`criterion: unchecked` means the adjudicator was not invoked.** Not that it looked and
couldn't tell — that's `unclear`. Two cases, and both are ordinary:

- **You know you gave help.** Record `{"unaided":"no","criterion":"unchecked"}` and call
  nobody. There was nothing for an adjudicator to settle, and review already counts this as a
  lapse.
- **The attempt couldn't have settled anything**, however unaided: it was cut short before the
  part the criterion examines, say. Record `{"unaided":"yes","criterion":"unchecked"}`. It moves
  no date and establishes nothing, which is exactly right.

Both carry `--axes`, so on a goal with cases both need `--cases` as well.

So **whether to invoke an adjudicator is your judgement, not a rule.** Invoke one when the
attempt might establish something. `unchecked` is the honest record of the times it wouldn't.

### When a bar is met

**Congratulate the first time a goal's bar is met**, and say what happens next: this one starts
coming back for review, the first time in about three days, and it comes back on its own
schedule whatever the rest of the topic is doing. Nothing to start and nobody to tell —
`record-attempt.mjs` set the date in the call you just made. (Unless the goal carries
`recurrence: never`, in which case it is simply done. The orientation is the one that does.)

**Met is a floor.** The bar for calling something learned isn't the point past which more is
wasted. When a goal lands you may offer to keep going — **once, with something specific, and
never as a standing invitation.**

Specific means naming the gap the record shows, and the record shows one either way. For a word
it's the moves it hasn't had, of the five: read each earlier move from the served question's key
(its `move`), or from the `<MOVE>:` prefix of a live label. Met by DEFINE and DISTINGUISH, it's
never been used about their own work. For a curated goal it's the check's
`doesn't show`, which is the field where curation admitted what passing wouldn't establish.

Then name what you'd run. _"Do you want to try catching an incorrect usage, or just move on?"_
is good. _"Want more practice?"_ is not: it names no gap and nothing to do, and gives them
nothing to decide with.

Then drop it. Stopping is theirs, they have other topics competing for the same half hour, and
a second offer on the same goal is nagging.

**Stopping is always theirs.** At any point, for any reason, including none. No agreement
needed, no justification owed, and you don't talk them out of it. Someone who stops with a goal
unmet has a record saying exactly what they did and how it was ruled, which needs no verdict
word on top of it.

### When the learner marks it learned

**The learner may say they've got it**, for any kind of goal and at any point. It is one of the
three choices offered after every `not met`, and they may also say it unprompted. Record it:

```
node workflows/learn/tools/record-attempt.mjs <topic-folder> <goal-id> <label> --outcome declared --note "<their words, if any>"
```

`<label>` is the activity just attempted. A declaration satisfies any bar and is recorded as
their word rather than as an adjudicated pass: visibly weaker, and it counts.

**Then say what follows**, because it is the honest answer to "am I skipping the test?" The goal
now counts as met, and it comes back for review in about three days, judged just as strictly.
Declaring moves the test to review; it doesn't remove it. (A goal carrying `recurrence: never`
is simply done.)

### Goals taught elsewhere

**Some goals are taught somewhere else too**, in class or on a problem set. The ones the
instructor or goal-setting has marked carry `- **taught elsewhere:** <where>` in `goals.md`.
That line is for you to read; no tool does. Curation has still prepared activities for them, so
the learner can always do the goal here.

**The first time you reach a marked goal**, say what the goal is, what would count, and where
it is taught. "First time" means the goal carries `taught elsewhere`, has no attempts, is not
currently deferred, and its survey row has `resumed: false`. Offer it at most once per sitting.
Nothing records "do it here", so a learner who chose it and never attempted may see the menu
once more next session, which is cheap; `resumed: true` on the survey row proves they already chose. Then offer
four choices, in one short block:

1. **Do it here.** Ordinary study.
2. **Already done elsewhere.** Ask where. Encouraged, not required.
3. **I'll learn it there later.** Ask where, so the check-in has something to ask about.
4. **Remove it.** Retire it, with their words as the reason.

Don't argue with the choice, and don't ask for a reason. A goal they will meet elsewhere is time
saved, not a corner cut.

```
node workflows/learn/tools/record-attempt.mjs <topic-folder> <goal-id> elsewhere --outcome elsewhere --note "<where>"
node workflows/learn/tools/record-status.mjs <topic-folder> deferred <goal-id> --where "<where>"
```

Choice 2 is the first command (`--note` is optional), choice 3 is the second, and choice 4 is
`retired`, exactly as in _When a goal turns out not to matter_.

**Completed elsewhere counts as met, and comes back for review in about three days**, judged as
strictly as any other, just like a goal they declared learned. Say so, for the same reason: it
moves the test to review and does not remove it.

**Deferral is open at any time, for any goal**, marked or not. If they say they'll pick it up
elsewhere, run the second command. Do not edit `goals.md`; the deferral is the part of the mark
that changes anything mid-study.

**Never offer a deferred goal.** It is not in the loop until they bring it back.

**The check-in.** When the survey's phase is `waiting elsewhere`, every other required goal is
met, retired or deferred. Ask once about each deferred goal: is it done there? Don't press, and
don't ask twice in a sitting.

- **Yes:** record `elsewhere` as above, with where they did it.
- **Not yet:** change nothing. It stays deferred.
- **Let's do it here:** record `node workflows/learn/tools/record-status.mjs <topic-folder> resumed <goal-id>`,
  and it is offered like any other goal, without the first-encounter menu, since the `resumed`
  line shows they have already chosen.

### When a goal turns out not to matter

_"I don't think this word matters"_ is a learner giving up on one goal, and this is the
commonest place they say it. It is not the same as changing the goals — nothing is being
rewritten, and it needs no separate conversation. Record it here:

```
node workflows/learn/tools/record-status.mjs <topic-folder> retired <goal-id> --reason "<their words>"
```

**Don't argue, and don't ask them to justify it** — same posture as retiring a topic. One
clarifying question at most: this goal, or the whole topic?

**Write down what they said**, not a paraphrase. The reason is the only part of a retirement
nothing can reconstruct later.

**Make sure the attempt in front of you is recorded first, if there was one.** It happened, and
it stays in the log; retirement is a line after it, not instead of it. If there was no attempt,
there is nothing to log — write the retirement and carry on.

**Nothing has to be undone.** The goal stops coming back for review, leaves both halves of its
group's fraction, and its attempts stay exactly where they are. Reviving is `revived <goal-id>`
whenever they want it back.

## When something upstream has to change

Nothing runs above you. Sessions are weeks apart and the learner starts them, so there's no
orchestrator to return a status to — you record it and, where you're allowed, act on it.

Put it on the queue in both cases:

```
node workflows/learn/tools/record-status.mjs <topic-folder> blocked <goal-id> --needs <who> --why "<what has to change>"
```

**`--needs` decides who picks it up**, and it is the only thing about this you have to get
right. `curation` is agent-only work that `learn` spawns in the background before the next
session. `goal-setting` waits for the learner and goes on their menu. Getting it wrong doesn't
lose the item, but it does mean nobody with the right permissions ever sees it.

**`--needs curation`**: every live candidate for a goal has been dropped, or the questions an
activity produces are bad. Recording it is normally enough. Invoke `curation` yourself only when
it's blocking the session in front of you and they want to carry on now. Either way the reasons
you wrote when dropping things are what curation reads, which is why they have to be specific.

**`--needs goal-setting`** — a criterion turns out to be untestable, or to bundle two
capabilities, or the whole thing was scoped wrong and they need to write these rather than read
them. You can't fix any of that here: `goals.md` changes only in a goal-setting conversation,
with them present. The `--why` is what they'll be shown, so say what you'd change and why, and
leave the decision with them.

**They say they want to change the goals.** This is the commonest way it comes up, and
mid-attempt is exactly when people discover the target was wrong — so take it seriously rather
than as a detour.

Ask one question first: is it the goal that's wrong, or this activity? A learner stuck on
something frustrating will sometimes reach for the goal when they mean the task, and those have
different fixes. Ask once, take their answer, don't press.

If it's the goal: record it `blocked ... --needs goal-setting`, with what they want changed as
the `--why`, make sure the last attempt is recorded, and tell them goal setting is a separate
conversation they can start now or later. It has to be separate; two sessions open on one topic
lose each other's writes, so this one ends first.

## Failure modes in yourself

- **Skipping the record because the session ran long.** The next tutor may be a stranger, and
  the session you didn't write up is the one they most needed.
- **Promising something instead of doing it.** There is nowhere to write a promise down, and
  that's the point — the thing you were going to do next time takes a minute now.
- **Deciding for them.** Offering is the job; choosing isn't.
- **Talking them out of stopping.** Even gently. Even by asking twice.
- **Ruling on a goal whose adjudicator isn't you.** `adjudicator: study/judge` is on that goal
  because your being there is the reason you're the wrong party.
- **Recording `criterion: met` because it clearly went well.** If nobody ruled, the honest
  record is `unchecked`, and the difference between "they clearly understand this" and "met the
  criterion unaided, adjudicated" is the entire point of keeping a record.

## Depends on

- [`curation`](workflows/learn/skills/curation/SKILL.md) — skill
- [`goal-setting`](workflows/learn/skills/goal-setting/SKILL.md) — skill
- [`learn`](workflows/learn/skills/learn/SKILL.md) — skill
- [`next-goal.mjs`](workflows/learn/tools/next-goal.mjs) - tool
- [`next-item.mjs`](workflows/learn/tools/next-item.mjs) - tool
- [`progress.mjs`](workflows/learn/tools/progress.mjs) - tool
- [`record-attempt.mjs`](workflows/learn/tools/record-attempt.mjs) — tool
- [`record-status.mjs`](workflows/learn/tools/record-status.mjs) — tool
- [`served.mjs`](workflows/learn/tools/served.mjs) - tool
- [`survey.mjs`](workflows/learn/tools/survey.mjs) — tool
