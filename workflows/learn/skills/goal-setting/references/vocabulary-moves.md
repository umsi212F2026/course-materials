# The vocabulary supply

An implementation of the `supply` slot — see [`slots.md`](slots.md) for the contract and for
the other six slots. A goal carrying `supply: vocabulary` gets its activities from here rather
than from `activities.md`.

Also the definition site for `criterion: vocabulary`, which is one sentence and is never
restated per word and never negotiated with the learner.

> **Uses the word well** — correctly, and in a way that shows it isn't being read off a
> definition.

What makes that checkable, when "well" would normally fail goal setting's own DEMAND A
CHECKABLE FORM test, is that **the instantiations are fixed in advance and enumerated below**.
If the menu is ever loosened to "or anything else equivalent", the criterion becomes
unfalsifiable and the shortcut should be withdrawn rather than patched. Don't extend the list
at runtime.

## The contract

> Given the goal and the labels already served, return an instruction, a label, and tags.

**Input.** The goal's own entry in `goals.md` — its `goal` line is the word — plus the three
fields it carries for this supply and nothing else reads:

| field                | which move it feeds                                             |
| -------------------- | --------------------------------------------------------------- |
| _what it names_      | DEFINE checks the answer against it                             |
| _when it bites_      | LOCATE relates to it, and must not be answerable by reciting it |
| _nearest confusable_ | DISTINGUISH is aimed at it                                      |

A _watch for_ line, where one exists, is a hint about which move to set — aim a CATCH or a
DISTINGUISH at the confusion and it gets tested by the ordinary bar. It is never an extra thing
to satisfy.

And the labels already served, from
`node workflows/learn/tools/served.mjs <topic-folder> <goal-id>`, most recent first.

**Output.**

- **instruction** — one move, instantiated, and no more than it asks for. Rewording DEFINE into
  something friendlier, or letting a CATCH item come with a hint about where the error is,
  changes what a pass would mean.
- **label** — the move, and a few words on the instance: `CATCH: subject/verb agreement`,
  `DISTINGUISH: vs. type`. Opaque to everything else. It is how this supply's future self
  avoids repeating itself, and it can avoid the **shape** rather than only the exact sentence,
  which is what a generator needs and a bank never did.
- **tags** — `production` or `reception`, from the `kind` column below. **Load-bearing:** a
  word carries `bar: one production pass`, and the bar reads the tag. Nothing else tells it
  whether a move was a production one.

## The six moves

| move            | the learner does                                                                 | passes when                                                                   | kind       |
| --------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- |
| **DEFINE**      | says what the word names, in their own words, nothing open in front of them      | the definition is right and isn't the source's sentence with synonyms swapped | reception  |
| **INTERPRET**   | reads a sentence they haven't seen that uses the word, says what's being claimed | the claim is recovered, including what it rules out                           | reception  |
| **DISTINGUISH** | given a confusable term, says what separates them                                | the difference named is the one that matters, not an incidental one           | production |
| **CATCH**       | given a sentence that misuses the word, says what's wrong                        | the actual error is named, not a different quibble                            | production |
| **APPLY**       | uses the word about something that really happened in their own work             | the instance is genuinely one of these, and is theirs                         | production |
| **LOCATE**      | says what situation they'd be in where not having this word would block them     | the situation is one this word is actually the answer to                      | production |

The **pass condition** is what an adjudicator rules against — the criterion above, one
indirection away. Send it with the attempt.

**The `kind` is what's left doing the work.** DEFINE and INTERPRET can both be passed from
having just been told the word, so a word met only by those has been recited rather than
learned. The four production moves each need something the learner brings: a distinction, an
error spotted, their own work, their own situation.

A reception pass is still worth setting and still worth recording. It just doesn't finish the
word.

**One task per word, not two.** A topic carries a dozen words and a second required task is
where a vocabulary list turns into a chore. Requiring production costs nothing there: one CATCH
is one task, the same as one DEFINE.

## Picking one

Take a move that isn't near the front of the served labels, and prefer one whose input the
entry actually carries — DISTINGUISH needs a confusable, and there isn't always one.

**In review, prefer APPLY or LOCATE.** Both draw on work that didn't exist when the word was
first met, so neither can be answered from memory of answering before. That's exactly the
property a review wants and the other moves don't have.

How many a caller wants, and in what order, is that caller's own business. Look there, not
here.

## Where a word differs from any other goal, and where it doesn't

**It doesn't, anywhere but its slots.** A word has an entry in `goals.md` like every other
goal, carrying `criterion: vocabulary`, `supply: vocabulary`, `bar: one production pass` and
`group: vocabulary` — the four `workflows/learn/tools/new-word.mjs` writes. It has a generated
entry in `activities.md` like every other goal, so review finds it by looking for a live entry
that checks it, with no branch on what kind of goal it is. It gets a review date the moment its
bar is met, on its own clock, whatever the rest of the topic is doing.

Nothing anywhere else. Where a word stands is derived from the attempt log by
`workflows/learn/tools/survey.mjs`, like everything else about where a learner stands.

**The six moves are not activity ids and never appear in `activities.md`.** They are what this
supply writes into a label, which is where a supply's own record of what it served belongs.
