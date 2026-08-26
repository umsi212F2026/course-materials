# Goal slots — the seven questions, and the three contracts

This file carries the rules and the contracts, and no argument — the reasoning behind them is
recorded outside this repository.

A **goal** is a claim about the learner that can be true or false. An **activity** is an
occasion that produces evidence for such a claim. Everything in `goals.md` is a goal — an
ordinary capability, a vocabulary word, an orientation — and the slots below are what the
system asks of any of them.

**Every slot defaults.** An ordinary capability carries no slot values at all. A word carries
the four that differ from the default; an orientation carries five. There are no named types:
nothing in the system says "this is a word", only that this goal's `supply` is `vocabulary`.

## The seven slots

| slot          | question                                           | consumer                                         | default                  |
| ------------- | -------------------------------------------------- | ------------------------------------------------ | ------------------------ |
| `criterion`   | where does the statement of _met_ come from?       | the adjudicator                                  | _(the entry's own text)_ |
| `supply`      | where do activities for this come from?            | the tutor, picking what to run                   | `curated`                |
| `adjudicator` | who rules on one attempt?                          | the tutor, after an attempt                      | `study/judge`            |
| `bar`         | what accumulation of rulings makes the claim true? | `met()`, in `workflows/learn/tools/lib/bars.mjs` | `one unaided pass`       |
| `recurrence`  | does it come back once met?                        | the scheduler                                    | `spaced`                 |
| `is_required` | must this be met for the topic to be finished?     | _nothing pending_, in `derivePhase`              | `yes`                    |
| `group`       | what is it reported alongside?                     | the report                                       | `capabilities`           |

Offering is not a slot — it falls out of `supply`. If activities come from a shared generator,
offering them individually is already wrong.

The three shapes in use:

|               | ordinary capability  | vocabulary word       | orientation   |
| ------------- | -------------------- | --------------------- | ------------- |
| `criterion`   | _(learner-authored)_ | `vocabulary`          | `orientation` |
| `supply`      | `curated`            | `vocabulary`          | `curated`     |
| `adjudicator` | `study/judge`        | `study/judge`         | `tutor`       |
| `bar`         | `one unaided pass`   | `one production pass` | `did it once` |
| `recurrence`  | `spaced`             | `spaced`              | `never`       |
| `is_required` | `yes`                | `yes`                 | `no`          |
| `group`       | _(default)_          | `vocabulary`          | `orientation` |

They override different subsets, and share only "not the default criterion." Don't reach for
the pattern; read the row.

## Three kinds of slot

| kind                  | slots                          | what a value is                                                                                                  |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **data or reference** | `criterion`, `group`           | literal text, or a pointer to shared text. Nothing invokes it; something reads it and hands it to an adjudicator |
| **strategy**          | `supply`, `adjudicator`, `bar` | always an implementation, always invoked                                                                         |
| **flag**              | `recurrence`, `is_required`    | read as data by one consumer                                                                                     |

`recurrence` is a flag rather than a strategy because it only says whether the scheduler runs.
The intervals are system-wide, in `workflows/learn/tools/lib/schedule.mjs`, not per goal.

**Flag and keyword sets are closed, and `workflows/learn/tools/lib/slots.mjs` refuses what
isn't in them, by name.** An open-ended slot is where an agent invents `recurrence: sometimes`.

## The three strategy contracts

Written before the implementations, and binding on every implementation that follows. A
contract written after the first implementation is a description of that implementation.

### `supply`

> **Given the goal and the labels already served, return an instruction, a label, and tags.**

|                 | for                      | shape                                    |
| --------------- | ------------------------ | ---------------------------------------- |
| **instruction** | the tutor                | free-form. What to set the learner       |
| **label**       | supply's own future self | free-form, **opaque to everything else** |
| **tags**        | `bar`, and the report    | structured, from the closed set below    |

The label is recorded in the log and handed back to this supply next time as the record of what
has already been served. **It is a private channel between a supply and its future self.**
Nothing else parses it, which is what makes free-form safe: the worst case is "repeats
sometimes", never a wrong claim about learning. `workflows/learn/tools/served.mjs` returns the
labels, unmodified.

**Tags exist because of one collision.** `bar` has to know whether a move was a production one
and cannot read an opaque label. So the one slot that needs structure gets exactly as much as
it needs, and no more.

A supply may read whatever the entry carries beyond its slots — a word's _what it names_, _when
it bites_ and _nearest confusable_ are inputs to the vocabulary supply, meaningful only to it.
That is the mirror of the label: data flowing _into_ an implementation rather than out of one.

A supply returns a **list** of candidates where it has several. One is a legitimate list.

**One supply per goal**, and that is the label contract making itself felt: a label is safe as
free-form only because the supply that wrote it is the only thing that reads it back. Two
supplies on one goal means each is handed labels it did not write and cannot parse. A goal that
needs something its supply doesn't offer changes this one value and keeps its criterion, its
bar and its group — and if it needs a genuinely new source, the extension point is writing a
supply implementation.

### `adjudicator`

> **Given the goal, its criterion, and the record of one attempt, return a ruling on each
> question separately** — was this unaided, and does it meet the criterion.

Two axes, returned raw and never collapsed:

- `unaided` — `yes` | `no` | `unclear`
- `criterion` — `met` | `not met` | `unclear`

**No keyword values, only implementations.** What looks like the trivial case isn't: "the
learner judged it done" means something reading the record and deciding whether they indicated
it, not a prompt with a yes/no in it.

**An adjudicator is invoked when an attempt might establish something, not always.** When
nobody ruled, the tutor records `criterion: unchecked` — see below. Whether to invoke is the
tutor's judgement, not a rule.

### `bar`

> **Given the goal's whole attempt history, return a boolean.**

Five things consume "has this been met", and every one of them uses it as a binary, so a bar
returns one. No bar declares a scale and nothing compares across scales.

**A bar is always a program, never a skill.** It cannot need judgement, because judgement
already happened upstream — in the adjudicator, which ruled, or in the supply, which tagged.
**It reads only structured fields**: timestamps, the two axes, `tags`, `outcome`, `source`.
Never the criterion text, never the instruction, never the opaque label.

**A bar, once true, stays true.** That is the invariant that replaced "the level only ever
rises", and it is checkable: every bar is an existence test over the history.

**The program/skill seam falls exactly between `adjudicator` and `bar`.** Everything upstream
may require judgement; the bar and everything after it is arithmetic.

## Every value in use today

### `criterion` — data or reference

| value            | means                                                                                          | defined where                                |
| ---------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------- |
| _(literal text)_ | the learner's own criterion                                                                    | the entry itself                             |
| `vocabulary`     | "uses the word well — correctly, and in a way that shows it isn't being read off a definition" | [`vocabulary-moves.md`](vocabulary-moves.md) |
| `orientation`    | "can attempt the real thing with the artifact still beside them"                               | this file, below                             |

A value that exactly matches a reference name is a reference; anything else is the learner's
own text. The reference names are closed — `workflows/learn/tools/lib/slots.mjs` carries them
and where each is defined, so an adjudicator can be handed the text rather than the name.

**`orientation`, in full:** _the learner has indicated they could now attempt the real thing
with the artifact still beside them._ Weak evidence deliberately. It is adjudicated and
recorded like anything else rather than assumed, which is the whole difference between this and
the self-certifying rung it replaced.

### `supply` — strategy

| value                 | means                                                                       | defined where                                |
| --------------------- | --------------------------------------------------------------------------- | -------------------------------------------- |
| `curated` _(default)_ | offer among the live `activities.md` entries whose `checks` names this goal | this file, below                             |
| `vocabulary`          | instantiate one of the six moves                                            | [`vocabulary-moves.md`](vocabulary-moves.md) |

**`curated`, in full.** Read the live entries in `activities.md` — present, and not carrying
`status: dropped`. Those whose `checks` names this goal can finish it; those whose `serves`
names it, or names `all`, can be run against it but cannot finish it. Offer among them using
each entry's `offer as`, and let the learner choose; that is the whole of the judgement here.

- **instruction** — the chosen entry's `learner does`, `tutor role` and `tutor does`, run as
  written. If it draws on a bank, an item not already in the served list.
- **label** — the entry id, or `<entry-id>/<item>` when it drew on a bank. That is a private
  channel like any other label; it happens to be readable, which is convenient and not relied
  on.
- **tags** — none. A tag every curated check carried would say nothing, and nothing reads one
  here: this supply's goals use `bar: one unaided pass`, which reads the axes. Tags exist for
  the one collision that needs them, and adding more would make them decoration.

If nothing live remains, this supply returns nothing, and that is a real answer: the goal is
stuck until curation runs again. Don't improvise a replacement — an invented task gets judged
against a criterion it wasn't written for.

### `adjudicator` — strategy

| value                     | means                                              | defined where                                              |
| ------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `study/judge` _(default)_ | a fresh judge, two axes, in a fresh context        | [`../../study/judge/SKILL.md`](../../study/judge/SKILL.md) |
| `tutor`                   | the running agent rules, in session, no extra call | this file, below                                           |

The two differ in cost and in independence, not in contract. `study/judge` is worth its call
when a claim needs a party who wasn't there; `tutor` is right when the question is what the
tutor watched happen.

**`tutor`, in full.** You were there. Rule on the two axes from what you saw, and record it in
the same call as any other attempt.

- `unaided` — was any of what they did changed by you? Anything that changed what they did is
  help.
- `criterion` — against the criterion as written. For `criterion: orientation`, the question is
  narrow and answerable: _did they indicate they could now attempt the real thing with the
  artifact still beside them?_ Not whether you think they could.

Rule `unclear` where it genuinely is. You are a cheap adjudicator, not a lenient one — and
where the claim is strong enough that being the interested party matters, the goal will carry
`adjudicator: study/judge` and this doesn't apply.

### `bar` — strategy

| value                          | means                                                      |
| ------------------------------ | ---------------------------------------------------------- |
| `one unaided pass` _(default)_ | any attempt with `unaided: yes` and `criterion: met`       |
| `one production pass`          | as above, and the attempt carried `production` in its tags |
| `did it once`                  | any attempt with `criterion: met`, however aided           |

All three live in `workflows/learn/tools/lib/bars.mjs`, beside the log reader.

A bar reads the whole history, `at` timestamps included, so an accumulation like _n passes
across separate sittings_ is an ordinary fourth value here and needs nothing new — it is a
different fold over the same structured fields, not a bar that knows about time.

**A learner's own declaration satisfies any bar**, and is recorded as `outcome: declared`
rather than as a judged pass — visibly weaker, and it counts. It is the escape for a goal that
won't land, and `met()` applies it above the bar dispatch rather than inside any one of them.

### `recurrence` — flag

`spaced` _(default)_ or `never`. Intervals are system-wide in
`workflows/learn/tools/lib/schedule.mjs`; the flag only says whether the scheduler runs at all.

### `is_required` — flag

`yes` _(default)_ or `no`. Read only by _nothing pending_: a topic is finished when every
**required** goal is met. An optional stretch capability, and an orientation, both live here.

### `group` — data

A bare string. `capabilities` _(default)_, `vocabulary`, `orientation` today. **A group exists
because goals name it**; there is no declaration table, no properties, no report strategy. The
report is always count-then-list, default group first, then others in order of first
appearance.

**Grouping is reporting only.** Scheduling stays per goal, so review brings back one word on
its own clock.

Two vocabulary groups in one topic — core terms, and BPMN element names — work, and cost
nothing, because a group is just a name two goals happen to share.

## Tags

**A system-wide closed set**, not per-supply, because `bar` reads them:

| tag          | means                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `production` | the learner brought something — a distinction, an error spotted, their own work, their own situation, the real artifact |
| `reception`  | the learner recognised or recalled something they were given                                                            |

Adding a tag means adding it here, in `workflows/learn/tools/lib/slots.mjs`, and in whatever
reads it. A private vocabulary between one supply and one bar is exactly the pairing this
design refuses.

## Not overridable, whatever the slots say

- every attempt is logged, misses included
- a bar, once true, stays true
- the log is the sole source of truth; nothing caches a derived answer
- an id is permanent once evidence points at it

## Two tests this design was put through

Both were run before anything was built, and both would have shown the slots too narrow.

**A bar of "n passes across separate sittings."** Passes. A bar is a fold over the whole
history and `at` is one of the structured fields it may read, so this is a fourth value in
`workflows/learn/tools/lib/bars.mjs` and no change to the contract.

**A goal served by both a shared generator and one bespoke curated activity.** Read as failing
during the build and fixed by making `supply` a list; **reverted the same day**. The union
breaks the label contract, above, and the cliff the test was written against belonged to named
types: with flat slots such a goal changes one value and keeps everything else, which is an
edit. More often the pressure means the word has stopped being a word — _use schema correctly
in a real design doc_ is a capability with its own criterion, and making it a separate goal
costs nothing.

## Shorthand

**Scripts supply the shorthand, not type names.** `workflows/learn/tools/new-word.mjs` fills
the four word slots; the same pattern gives orientation a script if it ever earns one. A custom
shape is written by filling slots directly and needs no name.

**One writer per shape.** Goal setting calls the script rather than typing the rows itself. A
convention living in two places has two implementations that can diverge.
