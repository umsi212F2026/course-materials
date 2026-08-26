# Running one activity

Consulted once per activity, during a study session. The session itself — reading in, offering
candidates, recording, closing — is in `../SKILL.md`.

**Where the instruction comes from is the goal's `supply` slot**, and that is the only thing
that differs between one goal and another here. Everything below applies to all of them, except
where it says otherwise.

## Run it as written

**`supply: curated`** — the instruction is the `activities.md` entry the learner chose: its
`learner does`, `tutor role` and `tutor does`. Follow them rather than improvising a lesson you
like better. If it carries a `check note` from curation, that's there because something about
the activity isn't obvious from the entry.

**`supply: vocabulary`** — the entry is a stamp carrying `origin: generated`, and the real
instruction is a move from `../../goal-setting/references/vocabulary-moves.md`. **You pick the
move and instantiate it.** There are no candidates to offer and no choice to put to the
learner. Take one the word hasn't had recently — run

```
node workflows/learn/tools/served.mjs <topic-folder> <goal-id>
```

which returns the labels this goal has already been given, most recent first — and set exactly
what that move asks for and no more. Rewording DEFINE into something friendlier, or letting a
CATCH item come with a hint about where the error is, changes what the pass would mean, so
don't do that.

**Never quietly run something else.** If you think a different activity would serve them
better, say so and offer it — the entries are candidates and the learner may choose among them.
If you think this one is _faulty_, that's a drop; see _Abandoning one_ for what counts. What
isn't allowed is improvising a substitute nobody recorded, which is invisible to every later
pass.

## During `orient` and `deepen`: the side conversation

This is what makes studying an artifact something other than reading. It runs continuously, not
as a step at the end.

- **They flag what they want to check.** You reply with a discriminating near-miss — "you said
  X; does it still count if…" — not with a verdict. A near-miss separates a real grasp from a
  fluent paraphrase; "yes, that's right" doesn't.
- **You flag too**, aimed at what gets read past: a term the artifact used before defining it,
  an unexplained step in a worked example, a distinction it assumes they already make. Those
  are the unknown unknowns, and they're precisely the ones the learner can't raise.
- **Prefer having them state their understanding first.** Reversed, this becomes you explaining
  and them agreeing, which feels the same from inside and teaches nothing.

  But they will sometimes ask you to explain first, and that's legitimate — nobody can
  articulate a view on something they've just met. When it happens, **don't let it end with
  them reading your explanation.** Ask for it back: a paraphrase, or an implication they'd draw
  from it, or a case they think it does and doesn't cover. Going second is fine; going second
  and stopping is where the illusion lives.

**Stop when they can attempt the real thing with the artifact still beside them** — not when
they feel they understand it, which is unfalsifiable and expands to fill the time available.

## During `attempt`: help when asked, and notice

Give what's asked for. You aren't withholding anything, and refusing help to protect a future
pass would be putting the record ahead of the learner.

But keep track of what you gave, because whether the attempt was unaided is about to matter. A
rough line: **anything that changed what they did is help.** Clarifying which diagram you meant
isn't. Pointing at where to look is. Answering "is this right so far?" is.

Don't volunteer. Every hint offered unasked is a pass they can't have.

**A move the learner sets themselves is still an attempt.** Someone who says "let me try
defining this" or offers an example from their own work has attempted that move as surely as if
you'd set it — run it and record it the same way, labelled and tagged the same way.
Self-direction is the point; don't make it worth less than compliance.

**Incidental use is not.** A word turning up correctly while they were doing something else,
with nobody attempting anything, isn't yours to credit — that would be ruling on your own
conversation, and you have been helping for an hour and want them to have got there.

**But don't just let it pass, either.** A daily scan that credits unprompted use is designed
and not built, so nothing is picking these up behind you. If the use looked real, **say so and
offer the move**: _"you just used that about your own project — want to make it count?"_ Then
it's a set attempt, judged like any other, and it takes one production pass to finish a word.

That's the honest version of the rule: don't credit it silently, do notice it out loud.

If the activity uses a bank, take an item they haven't had. The same call says which are used
up — `served.mjs` returns whatever the supply wrote as a label, and the curated supply writes
`<entry-id>/<item>`. You don't track it separately, and there's nowhere to write it down:
putting the item in the label you pass to `record-attempt.mjs` _is_ recording it.

## At the end of an attempt

Say, to yourself, whether it might have been unaided — that's what the session loop needs from
you, and it's the last thing this file is for. **When unsure, say it might have been.** The
loop sends it to be adjudicated; that costs one call and a missed pass costs a day.

For a goal whose `adjudicator` is `study/judge` — nearly all of them — **you aren't ruling on
it.** A fresh judge decides whether it was really unaided _and_ whether it met the criterion,
because you're the wrong party for both: you've been helping for an hour and want them to have
got there.

**When you know you gave help, don't send it anywhere.** Record
`{"unaided":"no","criterion":"unchecked"}` — nobody ruled, and that is the honest thing to
write. Same when the activity carried no `checks` and so couldn't have settled anything:
`{"unaided":"yes","criterion":"unchecked"}`.

## Prompting for a note

When something was hard — a check that took several turns to resolve, a failed attempt, a
correction that landed. Not continuously, or `notes.md` becomes a transcript nobody rereads.

**They write it.** You may transcribe what they said, and you may say a note is worth having,
but the words are theirs. A note in your voice is one they won't recognize in six weeks, which
is the only moment it exists for.

The template's sections are bare prompts; the reasons behind them are yours to hold, and worth
knowing when deciding what to prompt for:

- **Terms in their words** are worth more when written _before_ you say whether they're right.
  That's what makes it visible later that one was subtly wrong. So prompt for the gloss during
  the side conversation, not after you've corrected it.
- **What clicked** decays fastest, because in hindsight it feels like it was never difficult.
  Prompt at the moment it lands, not at the end of the session.
- **What they got wrong** is the section nobody can reconstruct — once something stops
  confusing you, it's very hard to remember that it did. If you only prompt once a session,
  prompt for this.
- **One example**, not two. Two is a textbook, and the point is a single case they could
  rebuild from scratch.
- **Deliberately skipped** comes from triage during the side conversation — a term they decided
  didn't matter. Catch those as they happen; nobody remembers them later.

## Abandoning one

**Stopping is theirs, for any reason.** Too hard, too boring, out of time, no reason offered.
Don't talk them out of it and don't require them to justify it, but it's worth asking whether
they can say what's wrong with the activity. Record the attempt as `abandoned`, with their
reason if they gave one and without if they didn't.

**Don't offer the exit early, though.** A learner offered a way out will often take it, and
struggling with the material is the activity working. Raise abandoning when you think the
activity is at fault — not when it's merely hard. If you do raise it and they'd rather stay
with it, they stay with it.

**Dropping the entry is a different call, and it's yours.** `status: dropped` says nobody
should be offered this again, so it needs a fault in the activity itself:

- the source doesn't explain what it was picked to explain, or assumes background they haven't
  got
- the task turns out to exercise something other than its criterion
- it's much longer or much shorter than its entry claimed
- they've bounced off it twice with no sign of the difficulty being the subject rather than the
  presentation

Someone abandoning because they were bored or tired is a bad sign, but you need stronger
analysis than that to drop the activity.

**What to write:**

1. **Record the attempt**, with `--outcome abandoned`. No bar counts it and no date moves — it
   establishes nothing, which is what happened. Always, whoever decided and whatever the
   reason.
2. **Only if the activity is at fault, write `status: dropped — <why, and who decided>`** on
   its entry in `activities.md`. Never on an entry carrying `origin: generated`: it is that
   goal's only entry and there is nothing in it to be wrong. A bad _instance_ is a fault in the
   supply, and goes on the queue:
   `record-status.mjs <topic-folder> blocked <goal-id> --needs curation --why "<what the instances get wrong>"`.
3. Return to the session loop, which offers what's left.

The two aren't the same fact. `dropped` says don't offer this again; the logged attempt says
this was tried and didn't finish. Only the second accumulates — three activities abandoned on
one goal says something about the criterion or the depth that no single entry's status can
show, and a word abandoned on LOCATE three times usually means nobody's been blocked by it yet,
or its confusable is badly chosen. The next tutor sees that in the log, and in what
`served.mjs` hands back.

When you do drop one, make the reason specific enough to be useful. "Didn't work" tells
curation nothing and it will produce something similar next time; "assumed you already knew
what a gateway was" tells it what to avoid. That reason is the only feedback curation ever
receives.
