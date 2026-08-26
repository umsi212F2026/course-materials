---
name: add-topic
description: Work out whether something a learner named is a new topic, a word for a topic they already have, or a topic they already have — and record it, without starting anything. Use when someone names something they want to learn later, or hits a word they didn't have and wants it kept.
---

# Add topic

**Status: draft.** Written 2026-08-21. Not yet run.

## Operates on

`<data-dir>` — the student's clone of `learning-topics`, holding one folder per topic. You
create a new folder inside it.

You are told this directory. Do not choose it, and do not guess it from the working directory —
whatever invoked you established it already.

Something got named. Work out what it is and write it down. Nothing here starts anything.

**Stay cheap.** This is the gesture you most want a learner making freely — noticing a gap and
recording it — and if it costs them a conversation they'll stop noticing.

## The one rule

**This is not goal setting.** Don't ask why they want it, what they'll use it for, how deep
they want to go, or what would count as having got there. Those need their full attention, and
asking here means asking twice.

**Don't teach the words either.** Explain one now and their later goals take your framing.

## Work out which of three things this is

Read the goals in every `<data-dir>/*/goals.md` before you ask them anything — the word entries
especially, which are the ones carrying `supply: vocabulary`. Usually a new topic isn't what
they need.

**It already exists** — as a topic, or as a word in one. Nothing to write either way. Say
which, and check they agree it's what they meant: you have just fuzzy-matched across dozens of
entries and may have landed on a near neighbour. Then hand that topic to `topic`. This is a
topic being picked, not added.

**A new word for an existing topic.** Say which topic and why, then let them decide.

```
node workflows/learn/tools/new-word.mjs --dir <data-dir> <area-slug> <word> <id>
node workflows/learn/tools/new-word.mjs --dir <data-dir> where-things-live "local vs. remote" w-local-remote
```

Quote the word — most are phrases. **You choose the id**; see _Naming a word_ below. The script
prints the entry it added; read it back.

The script is what makes it a word: it writes the four slots — `criterion: vocabulary`,
`supply: vocabulary`, `bar: one production pass`, `group: vocabulary` — and it is the only
writer for that shape. There is no type called _word_ anywhere in the system, which is why
there is nothing to keep in step with it.

Appending a word entry is not a revision of that topic's goals — a few lines, no folder, no
commitment.

**A genuinely new topic.** A word names one concept; a topic is a territory with several. Ask
two questions and no more:

- **What's it called?** A short slug — `merge-conflicts`, not
  `understanding-how-git-handles-conflicts`.
- **Which words does it start with?** "Just this one" and "no idea" are both complete answers,
  and a blank list is fine.

**The folder first, then one call per word.**

```
node workflows/learn/tools/new-topic.mjs --dir <data-dir> <area-slug>
node workflows/learn/tools/new-topic.mjs --dir <data-dir> regular-expressions

node workflows/learn/tools/new-word.mjs --dir <data-dir> regular-expressions "character class" w-character-class
node workflows/learn/tools/new-word.mjs --dir <data-dir> regular-expressions "greedy vs. lazy" w-greedy-lazy
```

`new-topic.mjs` takes no word list. One word per call is more typing and it's worth it: a
variadic list is the shape where `"greedy vs. lazy"` unquoted becomes three one-word entries
and nothing complains. Here a mistake can only be one entry wide.

Each script prints what it made — read it back before the next call.

**Write nothing yourself.** The script makes the folder and the word entries; you don't touch
`goals.md`. No capabilities, no criteria, no depth, no use. A folder they asked for and one the
course shipped are the same thing on the day they're made — both at _not started_, both with no
goal in the default group — because realising you'll need something isn't starting it.

(A fresh folder does carry one entry: the orientation goal, which the template ships filled in.
It's in its own group and doesn't count as goal setting having happened.)

## Naming a word

Every word entry carries an id, and **you choose it** — the script won't guess. It keys every
attempt that word ever produces, in `evidence/attempts.jsonl` and `evidence/status.jsonl`, for
as long as the topic lives.

Name it the way you'd name a variable:

- **`w-`, then two to four words**, lower case, hyphens between.
- **Aim at what the word is, not at how the entry is phrased.** `token, and what it costs`
  becomes `w-token-cost`, not `w-token-and-what-it-costs`. `state and persistence` becomes
  `w-persistence`. Stopwords carry nothing and you'll be reading these in a log.
- **Unique within the topic** — across every goal and every activity in it. The script checks
  and refuses a collision.

**When the script refuses, it wrote nothing.** Bad format, wrong prefix, or an id already in
use — it says which, and it does not repair the id for you. Pick another and run it again.

**But a collision usually means the word is already there.** `w-schema` being taken almost
certainly means `schema` is already an entry, and the answer is to stop, not to rename around
it. Naming it `w-schema-2` gives one word two entries, and every later attempt lands against
whichever one that session happened to pick. Look at the goals before you rename; if the word
is already there, this was the _it already exists_ case and you say so.

**Never route around a refusal by opening `goals.md`.** A refused call is the script working.
If a second attempt is also refused, stop and say what happened — two refusals mean you've
misread something, and a third name won't fix it.

**It is permanent.** Reword the entry later and the id stays, because the log already points at
it. If it turns into a genuinely different word, that's a new entry with a new id, not a
rename.

**Don't ask the learner.** This is bookkeeping, not a goal, and a question about it would make
adding a word feel like a decision when the whole point is that it isn't one.

Choosing the id isn't writing the entry. You're still not opening `goals.md`.

---

**Suggest, don't decide.** Say which of the three you think it is and why, in a sentence. If
they want their own folder for one word anyway, they get it.

**If you're on a third question, this has become goal setting. Stop.**

## Handing off

**Leave it on the list** — say it's there and stop. It'll show up next time they run `learn`.

**Start now** — hand to `topic` in a fresh session, carrying none of this conversation. It'll
find a `goals.md` with nothing in the default group and start goal setting, whose opener asks
for the provenance properly.

## Depends on

- [`learn`](workflows/learn/skills/learn/SKILL.md) — skill
- [`topic`](workflows/learn/skills/topic/SKILL.md) — skill
- [`new-topic.mjs`](workflows/learn/tools/new-topic.mjs) — tool
- [`new-word.mjs`](workflows/learn/tools/new-word.mjs) — tool
