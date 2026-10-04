# Criteria with named cases, and every activity checkable

**Status:** design approved in conversation, 2026-10-04. Branch `learn-student-feedback`. Queue
items 11 and 9 (the generic half; each topic's recuration stays item 9's own step).

## Why

Under `bar: one unaided pass`, one full-credit unaided answer to any question naming a goal meets
it. Many criteria join several cases ("and", "including", or two-sided: decline the risky, allow
the safe), and a question usually exercises one. So the easiest case certifies the whole goal and
the hard case the criterion was written for never has to be shown. In deploy-config-2026-10, a
learner who answers "not a secret" to everything meets `c-spot-secret` on the first public
address; one who refuses everything meets `c-judge-secret-request` on the first risky request.

Splitting each case into its own goal under a `capability:` slug was rejected: it multiplies
goals, puts odd guard-side goals in the progress view, and multiplies review load.

Separately, since item 4 any question can be attempted with help (recorded `unaided: no`, which
never meets a goal), so a study-only activity before a check is redundant. Students spend hours on
activities that can never move a goal to met.

## Decisions

### Cases on a goal

An optional `cases` slot follows `criterion` in goals.md, one sub-bullet per case: a backticked
id, then one line saying what the case is.

```
- **cases:**
  - `declines-risky`: a request that would put a secret in the chat or a file
  - `allows-safe`: a request involving no secret
  - `allows-dashboard`: an instruction to put a secret into the host's settings themselves
```

- A case id is one to three lower-case words joined by hyphens (`^[a-z0-9]+(-[a-z0-9]+){0,2}$`),
  unique within its goal. Ids are permanent once attempts point at them, like goal ids.
- The criterion stays prose. The cases do not replace it; they say which parts must each be
  shown.
- A goal with no `cases` slot behaves exactly as today.
- Goal-setting gains a move: when a criterion joins cases with "and" or "including", or is
  two-sided, name its cases rather than splitting the goal. A `capability:` split remains for
  skills that are genuinely separate (each worth its own review clock).

### The bar

When a goal names cases, **its own bar must hold for each case**, computed over the attempts
that carry that case: `cases.every((c) => bar(attempts.filter((r) => r.cases?.includes(c))))`. No
new bar name. Each per-case test is an existence test, so a bar once true stays true. The
learner's own word (`declared`, `elsewhere`) still meets the whole goal, as today.

### Questions and rulings

- **Every banked question names at least one goal.** Warm-ups (a question naming no goal) are
  removed from the template and draft-bank; an easy lead-in becomes an ordinary question on an
  easy case.
- A rubric question on a goal with cases carries a `cases:` line. For a question naming one goal,
  `- **cases:** allows-dashboard`; naming several, per goal: `- **cases:** c-a: x, y; c-b: z`.
- **One ruling covers a question's cases.** The judge rules the goal on that question as now; a
  pass passes every case the question lists, a miss passes none. Where a learner could get one
  case right and another wrong, curation writes separate questions, and bank-check flags a
  question that bundles them.
- A live generator says which cases each question shape carries, so the tutor can record them.

### Recording

- `next-item.mjs` prints a question's cases per goal, beside its goals.
- `record-attempt.mjs --cases x,y` stores `cases: [...]` on the attempt line. It refuses a case
  the goal does not declare, and refuses `--cases` on a goal with none.
- **Older passes are grandfathered: an attempt with no `cases` field counts toward every case.**
  A goal met before its cases were written stays met, so a bar once true stays true even when
  goals.md changes. To keep that from becoming a loophole, `record-attempt.mjs` refuses a ruled
  attempt on a goal with cases unless `--cases` is given (own-word outcomes, `declared` and
  `elsewhere`, need none: they meet the whole goal). So an attempt without `cases` is always
  one recorded before the goal had cases.
- **An unchecked attempt needs no `--cases`.** A ruled attempt whose criterion is `unchecked`
  is accepted without it on a goal with cases and stored with `cases: []`, so it counts toward
  no case (and is not mistaken for a grandfathered one).
- **An older bank question**, one with no `cases:` line for a goal with cases, is credited only
  with the cases the tutor judges it actually exercises, from their texts in goals.md, passed to
  the judge and to `--cases`. If it exercises none, there is no judge call for that goal and the
  attempt is recorded `criterion: unchecked`. Study serves such a question once for that goal,
  so it never loops on it; survey reports the stale bank.
- The practice quiz passes each question's cases into the attempts it records. Quiz scoring,
  drawing and the private grader are unchanged: a quiz scores questions.

### Picking (`lib/pick.mjs`)

- **Study:** among a goal's candidate questions, prefer one exercising a case not yet passed.
- **Review:** prefer a question on the case passed longest ago, so successive reviews rotate
  through the cases. The goal keeps one review clock; any unaided pass lengthens the interval and
  a miss shortens it, as today.
- **Scenario order in study:** within a scenario, serve in file order, skipping any question no
  longer needed. A question is no longer needed when each goal it names is met, or has every
  case the question lists for it already passed. Study never serves a skipped question, so a
  later question may give away a skipped one's answer. A question still needed (for instance one
  carrying another goal's undemonstrated case) is never skipped, so its answer is never given
  away before it is served. Scenarios are written in study order.
- The sort that put goal-less questions last is removed.

### Survey problems

- a malformed or duplicate case id;
- a rubric `cases:` naming a case its goal does not define, or a goal the question does not
  name;
- a question on a goal with cases that lists no case for it;
- a banked question naming no goal.

Survey does not report coverage: it runs in students' sessions too, where a gap is noise. That
is curation's.

### Case coverage in curation

Every case of every goal must be exercised by some live activity, and curation's checkers notice
when one is not:

- **verify** checks, per goal with cases, that each case is exercised by some live activity. A
  banked activity's coverage comes only from its bank's `cases:` lines, since study serves the
  bank; a generator's stated case counts only for an activity with no bank. A question with no
  `cases:` line covers none. A case nothing covers is a finding, the same as an empty `checks`
  cell.
- **bank-check** reports, per bank, which cases of its goals it exercises and which it never
  does, so a drafted bank that skips the hard case is seen before verify.
- **critique** checks that a generator's stated cases are ones its question shapes really carry.
- **generate** and **draft-bank** aim at the same bar: every case gets questions.

### The progress view

- One mark per goal and the count of goals met are unchanged. A goal with cases is `#` only when
  every case has passed; with some passed, it is `~`.
- **The legend's `~` reads `in progress`** (was `tried`), and the next-set line marks such a goal
  `(in progress)` (was `(tried)`), so the two match.
- On the next-set line a partly demonstrated goal carries its fraction in brackets:
  `c-judge-secret-request (2/3 cases)`. The word distinguishes it from a split capability's
  `weigh-hosting-plans 1/3`. A capability whose parts have cases still shows once, as its slug
  with a parts fraction.
- `--after <goal>` on a goal with cases not yet met adds a line under the set line:
  `  c-judge-secret-request: 2 of 3 cases demonstrated`. Counts only: the progress tool never
  names the cases still to show, since that names the hard part of the criterion.
- `--json` gives each goal `cases: { passed, total }` (absent for a goal with none).

### Every activity checkable (item 9's generic half)

- An activity is the orientation, or a source of questions, banked or set live. Every question
  has a rubric (a live one's is its generator's criterion) and names at least one goal.
- `curation/generate`'s "Done when" drops "every goal has at least one activity that isn't a
  check". The activities template's Coverage table loses its `study` column and the line calling
  an empty `study` cell a gap; `curation/verify` follows.
- Any question activity may be banked; the template's BANKS paragraph and `curation/SKILL.md`
  stop limiting banks to activities with `checks`. The contradiction in `curation/SKILL.md`
  ("Converting older files" banks a key-file study bank; "The course path" leaves an activity
  without `checks` live) is reconciled.
- An activity's `checks` field stays. For a banked activity it must include every goal its
  rubrics name, and verify compares them; a live activity has no rubrics to derive it from.
- Readings, videos and worked examples stop being activities. An activity's `worked example`
  field is the first level of help and may cite a reading. `curation/references/activity-types.md`
  and `curation/critique` follow.
- One scenario may carry questions across goals and capabilities when the method is the same.
- `bank-check`'s fourth check and draft-bank's "Nothing gives its answer away" change to: a
  question may give away an earlier one in its scenario, never a later one.
- `study/SKILL.md` (around line 299): "an activity carrying no `checks`" goes; the
  `criterion: unchecked` recording stays for an attempt that could not settle anything.
  `study/references/running-an-activity.md` and `learn.bpmn` follow.

### Learner text

`next-item.mjs` preserves line structure in the learner's text, so a multi-line blockquote does
not run together.

## Compatibility

A goal with no `cases`, a rubric with no `cases:` line, and an attempt with no `cases` behave
exactly as today. The six released topics need no change for the release; their study-only
activities stay until each topic's recuration (item 9's worklist).

## Tests

Bar: a goal with cases unmet until every case passes; a pass with no `cases` counts toward every
case (grandfathered); record-attempt refuses a ruled attempt without `--cases` on such a goal;
own word meets it; the per-case test under `one production pass`; a goal without cases unchanged.
Cases slot: parsing, id rule, duplicates. Rubric `cases:` both forms, and each survey problem
above; survey reports no coverage gap. `record-attempt` accepts declared cases and refuses others. Picker: unpassed case
preferred in study, oldest-passed case in review, scenario order with questions no longer
needed skipped (including one that spans goals), no goal-less sort. Progress:
`~` with some cases passed, legend text and `(in progress)` on the next-set line, the bracketed
fraction, the `--after` line and its
absence once met, `--json` `cases`. `next-item` keeps blockquote lines. The six real topics
survey clean and draw as before.
