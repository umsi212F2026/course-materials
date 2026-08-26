---
name: workflow-diagram
description: Draw or revise a workflow as a BPMN diagram, interactively, with Paul. Covers the executor lanes, the naming and binding conventions, which construct to reach for, and the two validators that have to pass. Use when building a new workflow diagram, adding a phase to an existing one, or converting a sketch into BPMN.
---

# Workflow diagram

You draw the semantics and the coordinates; Paul does the visual work in the bpmn.io VS Code
editor. Both of you edit the same `.bpmn` file, so the protocol below is not optional.

Conventions and the BPMN specifics are in
[`references/conventions.md`](references/conventions.md). Read it before your first edit.

> **This workflow is provisional — see [`STATUS.md`](workflows/diagram/STATUS.md).** It is a
> stub that grew out of ad hoc use rather than a designed workflow like the others, and it is
> exempt from the course's skill conventions until it is redesigned. Read `STATUS.md` before
> tidying anything here.

## Operates on

One `.bpmn` file — today `workflows/<name>/<file>.bpmn` in this repository, because the
course's own diagrams are course materials. Nothing tells this skill where to work, and when
students draw their own that changes. `STATUS.md` has the rest.

## Before you draw anything

**Ask what one run means.** A workflow diagram is a claim about what happens once. In
`workflows/learn/learn.bpmn` a run is one _sitting_ — the phases inside it are separate agent
sessions. Getting this wrong makes every loop and terminal wrong, and it is the thing most
often left unsaid.

**Say "run" or "process instance", never "token".** BPMN literature and the modelers say token
— you will meet it everywhere outside this repo, and it means what run means here. We don't use
it, because in this course _token_ is the unit students are billed in, and two central meanings
for one word is a tax nobody should pay. Translate on the way in.

**Find the skill or program behind each step before you name it.** A box with no implementation
is a guess. If it genuinely doesn't exist yet, say so _in the label_ —
`workflows/learn/tools/review-due.mjs — NOT WRITTEN YET` — rather than leaving a path that
silently doesn't resolve.

**Read the skill files, not just Paul's description.** The diagram is worth having only if it
says what the skills say. Every serious defect found in the audit was a place where the picture
and the prose disagreed.

## Three lanes

`HUMAN operator` / `AI AGENT` / `PROGRAM`. **A lane set is a partition** — a node joins at most
one lane, so a lane names the single role a step sits with: whoever it waits on, or is
accountable for it.

A step run by more than one party is said two ways instead. Its **type** carries the hybrid — a
plain `<bpmn:task>` with no icon means "not simply one kind of performer", and subprocesses
have no type marker at all, so they already say it. Its **lane** names the primary role. A box
may still be _drawn_ across two bands; the geometry then says more than the model can, which is
fine as long as the lane it claims is one it sits in.

Don't try to leave a node lane-less to mean "both". bpmn-js assigns the lane a box mostly
overlaps whenever you move it, so that only survives until the next nudge.

An empty stretch of the PROGRAM lane is an argument, not a gap: it shows how little is
machine-adjudicated. Don't fill it to be tidy.

## Working with Paul

He owns layout. You own semantics. Both of you write the same file.

- **Re-read the file immediately before writing.** Not from a read in an earlier tool call — he
  may have saved in between. This has bitten more than once.
- **Edit surgically.** Replace one `dc:Bounds` or one `di:waypoint`, not a whole `BPMNEdge`
  block or shape. Rewriting a block discards positioning he set, and nothing warns either of
  you.
- **Announce anything plane-wide** — a coordinate shift to make room, a re-layout — so he can
  save and close first.
- **List what you touched** after every edit: added, renamed, moved. That turns silent loss
  into visible loss.
- **Commit after each accepted change.** An uncommitted file has no recovery path, and
  `git checkout <file>` is the only undo that survives two editors.

## Validate every change

Both, every time. They catch different things and neither is sufficient.

Each workflow's diagram lives in its own folder — `workflows/learn/learn.bpmn`,
`workflows/bootstrap/bootstrap.bpmn`, `workflows/develop/superpowers.bpmn`. Run both from the
repo root:

```
node workflows/diagram/tools/check-di.mjs workflows/<name>/<file>.bpmn
node workflows/diagram/tools/node_modules/.bin/bpmnlint -c workflows/diagram/.bpmnlintrc workflows/<name>/<file>.bpmn
```

**`bpmnlint` needs the `-c`.** It looks for `.bpmnlintrc` in the working directory, and this
repo's lives with the diagram workflow rather than at the root, so without the flag it fails
with _"Could not locate local .bpmnlintrc"_ — which reads like a broken install and isn't.

`bpmnlint` does semantics — implicit splits, missing end events, unresolved references,
gateways that fork and join, defaults without conditions. `check-di` does geometry and
reachability — every node has a shape, every edge's endpoints still touch what they connect,
every node is reachable from a start event and can reach an end, and a file drawn twice is
really one data object.

**Neither can see a label collision or an element hidden behind bpmn-js's drill-down button.**
Render and look:

```
node workflows/diagram/tools/render.mjs <in>.bpmn <out>.png [subprocessId]
```

A clean lint is not a readable diagram. Look at every plane you changed.

## Choosing a construct

Stay inside Silver's **Descriptive** subset — see the reference. Going outside costs a reader
something specific; name the cost before you spend it.

Everything below is in the set except `adHocSubProcess`, which is already spent on the
conversation idiom. Don't reach for a second exception without deciding to.

| you want to say                     | use                                           |
| ----------------------------------- | --------------------------------------------- |
| a phase, with detail one level down | collapsed `subProcess`, its own `BPMNPlane`   |
| a conversation with no fixed order  | `adHocSubProcess` + `completionCondition`     |
| one decision, several outcomes      | `exclusiveGateway`, named as a question       |
| several things at once              | `parallelGateway` to split, another to join   |
| several paths converging            | a separate merging gateway, unnamed           |
| the same step in two places         | draw it twice while it's still being designed |

**Don't simplify by deleting.** BPMN has no null in the graph layer: removing an arrow asserts
_no path_, removing a gateway from a two-outgoing task asserts _both branches fire_, removing
the end event asserts _never terminates_. Simplify by abstraction — collapse detail behind a
subprocess — which hides without asserting.

## Failure modes in yourself

- **Trusting the commit message.** Reasoning recorded at the time is often wrong later; check
  it against the file.
- **Reading a scaled render.** Crop and look at native size before reporting a defect. Two
  "problems" reported this way turned out not to exist.
- **Asserting a baseline you didn't measure.** Count it, then compare.
- **Fixing the picture when the defect is in the prose.** A diagram that disagrees with a skill
  is sometimes the diagram telling the truth. Say which you think is wrong.
- **Building a design that doesn't terminate.** Every loop needs an exit whose condition can
  actually become false. Check with the reachability walk, not by eye.

## Depends on

- [`STATUS.md`](workflows/diagram/STATUS.md) — status
- [`check-di.mjs`](workflows/diagram/tools/check-di.mjs) — tool
- [`render.mjs`](workflows/diagram/tools/render.mjs) — tool
- [`review-due.mjs`](workflows/learn/tools/review-due.mjs) — tool
- [`bootstrap.bpmn`](workflows/bootstrap/bootstrap.bpmn) — diagram
- [`superpowers.bpmn`](workflows/develop/superpowers.bpmn) — diagram
- [`learn.bpmn`](workflows/learn/learn.bpmn) — diagram
