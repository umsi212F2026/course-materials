# Contract: the quiz libraries and the private tools

The instructor's private quiz tools import two libraries from this clone: `lib/bank.mjs`
(reading banks and applying a pool) and `lib/grade.mjs` (building the grading queue and merging
verdicts). The practice quiz uses the same two, which is what lets a student practise against
the real draw and the real grader. This file says what those libraries give, what they expect
back, and what each private tool has to do about it.

## What has not changed

- **Every pool written against single-file banks draws exactly what it drew.** For each pool in
  `quiz-bank/`, `applyPool(readPoolSources(pool, root), pool)` gives the same strata, in the same
  order, with the same items and the same problems. A re-bake of an existing session draws the
  same questions.
- **A single-file question keeps its exact shape**, including its bare `id`.
- **A verdict without `per_goal` merges byte-identically.** `mergeGrades` returns the same object,
  key order included, for every verdict and correction that does not use the new fields.

Two additions sit beside that. Each stratum now carries `bank`, the bank its items come from.
Each `buildQueue` item now carries `goals`, an array that is always present.

## Question ids and labels

**A folder question's `id` is qualified:** `<source>/<activity>/<scenario>/<question>`, for
example `learning-topics/git-basics/a-history/s1/q2`. Its bare id (`q2`) repeats across
scenarios and across topics, and every map keyed on `id` (form fields, `item_id`, the queue,
the seed's duplicate check) needs it unique across a quiz. The qualification happens in
`readBank`, so it applies on the quiz path only; the study tools see bare ids.

**`readBank(dir)` with no label gives topic-local folder ids**: `a-history/s1/q2`, the same as
the `label`. That is a third form, and only `readPoolSources`, which passes each source as the
label, gives the qualified one a draw file carries.

**`label` is topic-local:** `a-history/s1/q2`. It is what study records the same question under.

**`recordLabel(item)` gives the label to record an attempt under**: `label` for a folder
question, `<move>: <id>` for a single-file question with a move, and `id` otherwise. Anything
that writes to a topic's attempt log uses it.

A folder question also carries `goals` (always an array), `goal` (only when it names exactly
one), `activity`, `scenario`, `tags`, `setup`, `key`, and on a free question `credit`, which is
the rubric's raw credit text and nothing to do with a verdict's credit.

## Pool keys

A key in `draw` is resolved against the longest prefix of its `/`-separated segments that names
a folder holding `tasks/`. That prefix is the source; what is left says what to draw:

| Key                                                | Draws from                                     |
| -------------------------------------------------- | ---------------------------------------------- |
| `learning-topics/git-basics`                       | the whole topic, spread across its banks       |
| `learning-topics/git-basics/words`                 | one single-file bank, or one folder activity   |
| `learning-topics/git-basics/a-history/s1`          | one scenario of a folder activity              |

**A topic-level count is spread evenly and deterministically.** The topic's banks (single-file
banks and folder activities together) are taken in name order. Each gets `floor(n/k)` and the
first `n % k` get one more. A bank too small for its share passes the shortfall to the next, and
whatever is still owed at the end wraps to earlier banks with room. Only what nobody can supply
is a problem.

**A topic-level key comes back as one stratum per bank**, each named by the key and carrying its
`bank`. A tool that draws per stratum follows the spread without knowing about it.

**A topic must not contain a folder with its own `tasks/`.** The longest-prefix rule would read
that folder as a source of its own, and keys under it would mean something different from what
the pool's author intended.

The rest:

- `exclude` takes qualified folder ids or bare single-file ids.
- A scenario key on a single-file bank, or naming a scenario the activity does not have, is a
  problem, not a crash.
- A pool in the topic form (`"topic": "<folder>"`) checks that it mentions every bank against
  single-file banks only. A folder activity it does not mention is not reported.
- A pool should be moved to the new keys when its topic is migrated to folder banks.

## Course goals only

**`courseOnly(items)`**, exported from `quiz-draw.mjs`, drops every question that names a goal
whose origin is not `course`. A goal id missing from the topic's `goals.md` counts as not
course. It returns `{ items, problems }`, one problem per dropped question:

```
<id> (<bank>) dropped: <goal> is not a course goal
```

A question naming no goal is kept, and so is one with no `topic`. It reads `item.topic`, the
absolute path to the topic folder, which `topicDir(pool, item, root)` from the same file gives.
The practice quiz applies it before drawing. **The bake should too**, or the real quiz can
examine a goal the practice quiz never would.

## Grading per goal

**`buildQueue(rows)`** gives every queue item `goals: string[]`: the question's `goals`, or
`[goal]`, or `[]`. A multi-goal question has `goal: null`, and `goals` is the only place its
goals appear.

**A verdict may carry `per_goal`**, which must name exactly the question's goals:

```
{ "item": "...", "uniqname": "...", "missed": "...", "axes": { "unaided": "yes" },
  "per_goal": { "w-commit":  { "credit": "full", "missed": "", "axes": { ... } },
                "w-restore": { "credit": "half", "missed": "...", "axes": { ... } } },
  "flag": false, "flag_reason": "" }
```

A goal missing from `per_goal`, or one the question does not name, is a problem, and the answer
is left unscored like an answer with no verdict. A top-level `credit` on such a verdict is not
read; the grade skill leaves it out.

**What `mergeGrades` gives back for that answer:**

- `credit`: the shared credit when every goal has the same one, otherwise `partial`.
- `value`: the mean of the per-goal credits (full 1, half 0.5, none 0). Present only on a
  per-goal item.
- `per_goal`: `{ <goal>: { credit, missed, axes } }`, each goal's axes settled the way a whole
  question's are (half credit on a goal is `not met` for it).
- The student's `score` sums `value ?? CREDIT_VALUE[credit]`.

**`partial` has no entry in `CREDIT_VALUE`.** Anything that turns a credit into points must read
`value` first.

**A correction is one mark on the whole question.** On a per-goal item, `corrected: true` means
the correction's single `credit` is the outcome, `value` is dropped, and `per_goal` stays beside
it as the grader's record, as `grader_credit` does.

## The private tools

**quiz-bake.** Must call `courseOnly`. Give each item its `topic` with `topicDir(pool, item,
SOURCES_ROOT)` for the check only, then filter each stratum by object identity, not by id
(single-file ids can repeat across topics), so the baked items keep their shape. Print the
dropped-question problems with the pool's other problems, and report a stratum that
`courseOnly` left short of its `take`. Otherwise unchanged: it draws per stratum, so topic-level
keys work as they are. Two cosmetic points. The plan line prints `s.name`, which repeats for a
topic-level key, and `s.bank ?? s.name` reads better. Strata from one topic key share a name and
so share a per-stratum seed; that is harmless, since their items differ, and changing the seed
string would reshuffle re-bakes of existing sessions.

**quiz-seed.** No change. It keeps `id`, `type`, `prompt`, `rubric`, `choices` and `answer`,
which a folder question has in the same form, and its duplicate-id check is satisfied by
qualified ids. The quiz app itself must treat an item id as an opaque string: qualified ids
contain `/`.

**quiz-grade --queue.** No change. Every queue item now carries `goals`: `[goal]` on a
single-goal item and `[]` on one with no goal. Whatever sends them to the grade skill passes
them through as they are. The skill rules per goal and returns `per_goal` only when `goals`
names more than one goal. With one goal or none it returns today's shape, a top-level `credit`
and no `per_goal`, so those verdicts merge byte-identically.

**quiz-grade --merge.** No change. `mergeGrades` handles `per_goal`, and the summary line reads
`score`, which already includes `value`.

**quiz-comments.** Must change. `buildComment` turns a credit into points with
`{ full: 1, half: 0.5, none: 0 }[graded.credit]` and into words with `SCORE_WORD`, and neither
has `partial`. Use `graded.value ?? CREDIT_VALUE[graded.credit]` for the points, add a word for
`partial`, and consider listing each `per_goal` entry's `missed` below the item's own. Its
`expectedById` lookup needs nothing: `readPoolSources` gives the same qualified ids the draw
carries.

**quiz-export.** No change. `item_id` is stored and exported as text.

**quiz-scores.** No change. It reads each student's `score` and `out_of`.

**quiz-bank-check.** Must change. It calls `readBank` with no label, so its folder ids are
topic-local (see above), which is fine for a check of one topic. But its undeclared-goal check
reads only `i.goal`, so a typo in a multi-goal question's `goals` passes silently, and
`tally("goal")` counts every multi-goal question as `(none)`. Both should read `goals`.

**quiz-regrade.** Must change, in two places, for a multi-goal question. The verdict shape its
prompt mandates is credit-only, and the same prompt tells the agent to follow the grade skill,
so the prompt needs a `per_goal` variant of that shape. Without it the agent either collapses
the per-goal rulings into one mark, which merges as if the question had one goal, or writes
`per_goal` with no top-level `credit`. Its coverage check rejects any fresh verdict whose
`credit` is not `full`, `half` or `none`, so that second case rolls the regrade back; the check
should accept a verdict carrying `per_goal` instead.

**quiz-review.** No change needed. It shows the merged `credit`, so a `partial` item has no
credit button pressed; a correction from it is a single credit and merges as described above.

## Practice draws

The practice quiz puts questions the student has never attempted first, then the least recently
attempted, by the student's own attempt log under `recordLabel`. The real quiz has no attempt
logs to read, and the bake draws each stratum by its seeded shuffle, as it always has.
