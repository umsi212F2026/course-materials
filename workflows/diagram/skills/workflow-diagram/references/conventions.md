# Conventions and BPMN specifics

Two kinds of rule here: Bruce Silver's, from _BPMN Method and Style_, which is the standard
reference; and this repo's own, marked **(ours)** — those aren't standard, and a BPMN-literate
reader won't expect them.

---

## The file has two halves, with different owners

Everything under `<bpmn:process>` is semantics and is yours. Everything under
`<bpmndi:BPMNDiagram>` is layout — every `dc:Bounds`, every `di:waypoint`, every `BPMNLabel`
position — and most of it was placed by hand in the GUI: elements dragged into alignment,
labels nudged off the lines they were sitting on, corridors routed to avoid a crossing. None of
that intent is recorded anywhere. **Treat the layout half as read-only unless the edit is
specifically about position.**

- **Add** new shapes and edges. Don't rewrite existing ones.
- **Change the one number that has to change.** Never replace a whole `<bpmndi:BPMNShape>` or
  `<bpmndi:BPMNEdge>` block in order to move a single endpoint — the rest of that block is
  someone's work, and overwriting it looks identical to leaving it alone.
- **A plane-wide coordinate shift re-bases everything.** Announce it before running it, so the
  file can be saved and closed first.
- **Say what you touched** afterwards — added, renamed, moved. Nothing else will surface a
  tweak that got flattened.

Re-read the file immediately before writing, never from a read taken earlier in the session.
The GUI may have saved in between, and a stale coordinate written back is indistinguishable
from a deliberate move.

## The palette grows with the readers

Silver splits BPMN into three tiers. **Descriptive (Level 1)** is the subset a business reader
can be taught in an hour. **Analytic (Level 2)** adds the typed events and the exotic gateways.
**Common Executable (Level 3)** is for engines.

**What a reader can follow is the whole constraint, and it is not fixed.** The same forty-eight
people read these diagrams all term, so what was unreadable in week one is ordinary by week
six. The palette is staged to match. An element joins it when it makes a diagram less busy
without hiding a path.

**The starter set**, which is all the first two weeks use:

> pools and lanes · plain start and end events · tasks (user, service, script, manual) ·
> subprocesses, collapsed and expanded · call activities · exclusive and parallel gateways ·
> sequence and message flows · data objects and data associations · text annotations

**Added after week two**, each because it replaces something busier:

> **the multi-instance markers**, three bars on an activity, where a step runs once per item in
> a known collection. Horizontal bars are sequential, vertical are parallel. They replace a
> drawn loop and say what the drawn loop could not: what the collection is.
>
> **participant multiplicity**, three bars on a pool, where one pool stands for many
> independent runs, one per student. It states a cardinality that a pool's name only implies.

**Still costly, all for one reason**: each makes a path a reader cannot trace by following
lines.

> error, escalation, signal and conditional events · boundary events of any type · event
> subprocesses · event-based, inclusive and complex gateways · terminate end events ·
> transactions

**That distinction is the test for anything not listed.** A marker a reader ignores leaves them
less informed. A path they cannot trace leaves them wrong, and only the second disqualifies.
Name what a new element buys before spending it.

**Prefer the drawn version wherever it is not the busier one.** An explicit back-arrow beats a
loop marker whenever the loop carries a choice, because no marker can carry a branch: the
listener loop in `learn.bpmn` is a gateway and an arrow for exactly that reason.

**`adHocSubProcess` is in use** for conversations with no fixed order. It costs a reader two
things: the `~` marker, and the fact that a completion condition stands in for an end event.

## Naming

Silver's rules. None are in the OMG spec, and no tool enforces them — `bpmnlint` has
`label-required` but nothing about naming style.

| element                  | name it                                     | example                            |
| ------------------------ | ------------------------------------------- | ---------------------------------- |
| activity                 | **verb + object**, for what it accomplishes | `Curate activities`                |
| gateway                  | **a question**                              | `what does this topic need?`       |
| gateway's outgoing flows | **the answers**                             | `goals` / `activities` / `nothing` |
| end event                | **the end state** — what is now true        | `menu ready`, `choice made`        |
| start event              | **the trigger**, as something that happened | `sits down to learn`               |

The commonest error is an end event named for the event rather than the state. `session ends`
says only what the shape already says; ask instead what is true when the run arrives there.

A diamond carrying a question is a decision. A diamond with no name is a join. That is the only
visual difference between them, so **never let one gateway do both** — `no-gateway-join-fork`
is an error in the recommended ruleset, and a diamond with arrows on all four sides can't be
read.

## Binding a step to its implementation **(ours)**

Every step is run by a skill file or a program. Two places carry that:

- **`bpmn:documentation`** — always, and always the **full path from the repo root**. Standard,
  machine-readable, survives round trips, and invisible without a properties panel, which the
  VS Code editor doesn't have. Nothing here costs canvas space, so spend it freely.
- **the visible label**, second line — _only on leaves_, and only the **short name**.

**A second line means it's a leaf you can go read. No second line means there's a level
below.** That tells a reader where to click, which is worth more than it looks.

**Short name means the shortest thing that identifies it**, not the path:

| the implementation                                | the label says    |
| ------------------------------------------------- | ----------------- |
| `skills/brainstorming/SKILL.md`                   | `brainstorming`   |
| `workflows/learn/skills/curation/verify/SKILL.md` | `curation/verify` |
| `workflows/learn/tools/review-due.mjs`            | `review-due.mjs`  |

A `SKILL.md` is named by its directory — the filename is the same for every skill and
identifies nothing. Everything else is named by its filename. Keep enough leading directories
to disambiguate and no more.

Full paths on labels were the earlier rule and they cost too much: a two-line box grew a
40-character third line, paths wrapped mid-token, and the label crowded out the verb phrase
that actually says what the step does. The path still exists, in `bpmn:documentation`, where
`check-di` reads it.

Mark what doesn't exist yet in the label itself — `review-due.mjs — NOT WRITTEN YET` — rather
than leaving a name that silently fails to resolve.

Never put anything a reader needs somewhere only one renderer shows it.

## Stating what determines correctness **(ours)**

**A check is a step.** Draw it as a box in the lane of whoever adjudicates. That encodes what
determines correctness with no new notation, and where nothing adjudicates there is simply no
box — an absence a reader can see, rather than a claim they have to take on trust.

Don't restate it in a text annotation. Two related lines have proper homes:

- **done when** → a named **end event**, or `completionCondition` on an ad-hoc subprocess.
- **governed by** → a named **start event** carrying the skill path, plus `bpmn:documentation`.

The one thing geometry cannot do is **assert a negative**. Where a step has no adjudicator at
all and that matters, a text annotation is the only place to say so, because nothing will draw
an absence.

## Files as data objects

A file drawn twice is **two `dataObjectReference`s pointing at one `dataObject`**. A modeler
will hand you two separate objects that merely share a label, and nothing on the canvas
distinguishes that from a real repeat: same icon, same name, same colour, a different file as
far as the model is concerned. `check-di` catches it.

**Repeat rather than draw a line across the diagram.** Reuse one icon when its users sit close
together; add a second reference when they don't.

Colour-code per file **(ours)**, so a repeat reads as the same file — which only works if the
repeats really are one object.

## Signalling an outcome to the caller

**A subprocess's outgoing flow carries no outcome.** However many end events are inside, it
completes once and the run continues along every outgoing flow; the parent can't tell from the
flow which end fired. True of plain and ad-hoc subprocesses alike.

The outcome can still reach the caller, two ways, and they aren't the same mechanism:

- **As the subprocess's output** — formally a `dataOutput` that a following gateway tests. At
  Descriptive level it stays prose in the branch labels. This is a return value with the
  declaration left out, and **nothing on the canvas shows where the value came from.**
- **Through a file** — the phase writes, a later step reads. Fully drawn, as data associations.

Prefer the second wherever the information genuinely persists. Reach for the first only where
it doesn't, and count it against the budget above: it is a place where "follow the arrows"
fails a reader.

The formal alternatives are an `ioSpecification` with declared outputs, or an error or
escalation end event caught by a boundary event. The first is invisible and needs item
definitions on every subprocess; the second is Analytic, and expresses its link by _matching
symbols rather than a line_.

## What the notation cannot do

**No evaluation order between conditioned branches.** BPMN doesn't say which condition is tried
first, so first-match-wins isn't expressible. Either make the conditions mutually exclusive, or
record the priority in the skill file — not in an annotation, which goes stale.

**A default flow requires conditions on its siblings.** Adding `default="..."` makes
`conditional-flows` demand a `conditionExpression` on every other branch. That's correct: a
default means nothing without conditions to fall through.

**Ad-hoc subprocesses forbid start and end events** — a spec rule, enforced as an error. They
may contain sequence flows, which express _partial_ order: unordered except where an arrow says
otherwise. How many arrows a plane holds becomes a readable measure of how determined that
phase is.

**There is no null in the graph layer.** Removing an arrow asserts _no path_. Removing a
gateway from a task with two outgoing flows asserts _both branches fire_. Removing the end
event asserts _never terminates_. Simplify by abstraction — collapse detail behind a subprocess
— which hides without asserting.

## Tooling facts

- **The VS Code bpmn.io editor resizes pools and lanes only.** Tasks, subprocesses, gateways,
  events and data objects have no handles; bpmn-js sizes them. Edit `dc:Bounds` to resize
  those.
- **Align, distribute and grid snapping are available.** Multi-select by rubber-band or
  shift-click.
- **Drill-down works for collapsed subprocesses, not call activities.** bpmn-js synthesises a
  plane per subprocess; a call activity's called process is a separate diagram it won't
  navigate into.
- **XML comments do not survive a save.** Text annotations, `bpmn:documentation`,
  `completionCondition`, `conditionExpression`, `default` and the non-normative `color:`
  attributes all do. Never put anything load-bearing in a comment.
- **The editor decides lane membership from geometry.** Move a box and bpmn-js assigns it to
  the lane it mostly overlaps; there is no UI for "no lane" or "two lanes". Declare the lane it
  is mostly in and the file and the editor stay in agreement on their own.
- **Neither validator sees a label collision**, or an element hidden behind bpmn-js's
  drill-down button at a collapsed subprocess's bottom-right corner. Render and look.
