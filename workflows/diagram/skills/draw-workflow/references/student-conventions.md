# Conventions for a workflow diagram

What goes in the `<bpmn:process>` half of the file, and how to write it. The other half,
`<bpmndi:BPMNDiagram>`, is positions, and `layout.mjs` writes it; you never do.

These are the same conventions as the course's own diagrams, which the student has read in
class, so a diagram drawn this way reads the way they expect.

## One run

**A diagram shows what happens in one run of the workflow**, from the trigger to one of its
ends. Settle what one run is before drawing anything: one posting, one week's batch, one
sitting. Every loop and every end event depends on it. Say "run", never "token", which in this
course means the unit students are billed in.

**Two triggers whose runs happen at different times are two workflows.** Capturing a posting
whenever one is found and reviewing the captures once a week are different runs, at different
rates. Draw them as two pools in the same file, each with its own process and its own three
lanes. What connects them is the state one writes and the other reads: a data store drawn in
each pool, under the same name.

## Three lanes

One pool, named for the workflow, with three lanes, in this order and with these names:

| lane | who performs the step | task type |
| --- | --- | --- |
| `HUMAN operator` | the student | `bpmn:userTask` |
| `AI AGENT` | an agent following a skill file | `bpmn:serviceTask` |
| `PROGRAM` | a program or script | `bpmn:scriptTask` |

**A lane says who performs the step**, not who is responsible for it coming out right. A
program the agent runs goes in PROGRAM, because the program does the work.

**A check is two steps.** Producing the evidence (a program comparing outputs, an agent
writing a verdict) goes in the lane of whoever produces it. Deciding on it is a gateway in the
lane of whoever decides. Kept apart, they show who actually makes each call.

**A step with two performers** is a plain `bpmn:task`, which has no icon, in the lane of the
main performer.

## The palette

Use only these. Each has an exact XML form below.

- a **start event**, named for the trigger, as something that happened: `posting link saved`
- **tasks**, typed by lane as above, named verb plus object: `Assess posting`
- an **exclusive gateway** that decides, named as a question: `worth applying?`, with each
  outgoing flow named for an answer: `yes`, `no`
- an **exclusive gateway** that only merges paths, with no name. One gateway never does both.
- a **parallel gateway**, unnamed, to split into steps that happen at the same time, and
  another to join them
- **end events**, each named for what is now true: `posting tracked`, never `done`
- a **data object reference** for a file a run reads or writes and does not keep
- a **data store reference** for state that outlives a run: a CSV every run appends to, a
  database, a folder of saved results
- a **collapsed subprocess** for a phase with detail one level down
- a **text annotation** only for something no other element can say

**Every place state is kept is drawn.** If a step reads or writes a file, the file is a data
object or data store with an association to that step. Where state lives is one of the first
things a design critique asks.

**Draw a file again when the next step that uses it is far away**, rather than one reference
with associations reaching across the diagram, which become dotted lines through everything
between. When steps that use it sit next to each other, they share one reference. A step that
uses many stores is a sign the stores could be fewer: one folder holding several kinds of file
is one store. Each reference to a file points at the same `bpmn:dataObject`, which is what
makes them one file; each reference to a store has the same name.

**A store's name can say what it physically is**, since the cylinder looks like a database:
`Capture inbox (folder)`, `tracker.csv`, `Criteria (criteria.md)`.

**Never simplify by deleting.** Removing an arrow says there is no path. Removing an end event
says the run never ends. To hide detail, collapse it into a subprocess.

## Binding a step to its implementation

**Only once the plan names the files**, not while the spec is being worked out. Then each leaf
step carries:

- the full path from the repository root in `bpmn:documentation`:
  `ps5/skills/assess/SKILL.md`, `ps5/fetch.py`
- the short name on a second line of its label: `Assess posting&#10;assess.md`,
  `Fetch posting&#10;fetch.py`. A `SKILL.md` is named by its folder with `.md` added, so it reads
  as a file rather than as part of the step's name; anything else by its filename.

Until the file exists, run `check-di.mjs` with `--planned`.

## Ids

**Never change an existing id.** The student's change record is found from diffs between
versions, and a renamed id makes a one-word change look like a rewrite. **New ids** are the name
in lowercase with underscores: `check_deadline`, `deadline_passed`, `to_check_deadline` for the
flow into it.

## The XML, element by element

A new diagram, with nothing in it yet but the lanes:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="definitions" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="collaboration">
    <bpmn:participant id="workflow" name="Postings tracker" processRef="workflow_process" />
  </bpmn:collaboration>
  <bpmn:process id="workflow_process" isExecutable="false">
    <bpmn:laneSet id="lanes">
      <bpmn:lane id="lane_human" name="HUMAN operator" />
      <bpmn:lane id="lane_agent" name="AI AGENT" />
      <bpmn:lane id="lane_program" name="PROGRAM" />
    </bpmn:laneSet>
  </bpmn:process>
</bpmn:definitions>
```

Two workflows in one file: a participant for each in the collaboration, and a process for
each, with ids that keep the two apart. Each process has its own `laneSet` with all three lanes.

```xml
<bpmn:collaboration id="collaboration">
  <bpmn:participant id="capture" name="Capture a posting" processRef="capture_process" />
  <bpmn:participant id="review" name="Review captured postings" processRef="review_process" />
</bpmn:collaboration>
<bpmn:process id="capture_process" isExecutable="false">
  <bpmn:laneSet id="capture_lanes">
    <bpmn:lane id="capture_lane_human" name="HUMAN operator" />
    <bpmn:lane id="capture_lane_agent" name="AI AGENT" />
    <bpmn:lane id="capture_lane_program" name="PROGRAM" />
  </bpmn:laneSet>
  <bpmn:dataStoreReference id="inbox_in_capture" name="Capture inbox (folder)" />
</bpmn:process>
<bpmn:process id="review_process" isExecutable="false">
  <bpmn:laneSet id="review_lanes">
    ...the same three lanes, with review_ ids...
  </bpmn:laneSet>
  <bpmn:dataStoreReference id="inbox_in_review" name="Capture inbox (folder)" />
</bpmn:process>
```

A lane lists its steps, gateways and events; a lane with none is self-closing as above. Data
objects and stores are in no lane.

```xml
<bpmn:lane id="lane_agent" name="AI AGENT">
  <bpmn:flowNodeRef>assess_posting</bpmn:flowNodeRef>
</bpmn:lane>
```

A step lists its flows. **Every flow is written three times**: as a `sequenceFlow`, as an
`outgoing` on its source, and as an `incoming` on its target.

```xml
<bpmn:serviceTask id="assess_posting" name="Assess posting">
  <bpmn:incoming>to_assess</bpmn:incoming>
  <bpmn:outgoing>to_review</bpmn:outgoing>
</bpmn:serviceTask>
<bpmn:sequenceFlow id="to_assess" sourceRef="fetch_posting" targetRef="assess_posting" />
```

A decision, and its answers:

```xml
<bpmn:exclusiveGateway id="worth_applying" name="worth applying?">
  <bpmn:incoming>to_decide</bpmn:incoming>
  <bpmn:outgoing>yes</bpmn:outgoing>
  <bpmn:outgoing>no</bpmn:outgoing>
</bpmn:exclusiveGateway>
<bpmn:sequenceFlow id="yes" name="yes" sourceRef="worth_applying" targetRef="posting_tracked" />
```

**Two flows into one step go through a merging gateway first**, unnamed, because a task with
two incoming flows is ambiguous and `bpmnlint` reports it as `fake-join`. The same holds for
an end event.

**A new path that ends the run** gets its own end event if what is true at the end is
different (`posting dropped, deadline passed` beside `posting dropped`), and goes through a
merge into the existing end event if it is the same.

State a run keeps, written by one step and read by another. The write goes inside the writing
step; the read goes inside the reading step and needs the `property` placeholder, which is how
Camunda writes it:

```xml
<bpmn:dataStoreReference id="postings_store" name="postings.csv" />

<bpmn:serviceTask id="assess_posting" name="Assess posting">
  ...
  <bpmn:dataOutputAssociation id="assess_writes_postings">
    <bpmn:targetRef>postings_store</bpmn:targetRef>
  </bpmn:dataOutputAssociation>
</bpmn:serviceTask>

<bpmn:userTask id="review_verdict" name="Review verdict">
  ...
  <bpmn:property id="review_verdict_input" name="__targetRef_placeholder" />
  <bpmn:dataInputAssociation id="review_reads_postings">
    <bpmn:sourceRef>postings_store</bpmn:sourceRef>
    <bpmn:targetRef>review_verdict_input</bpmn:targetRef>
  </bpmn:dataInputAssociation>
</bpmn:userTask>
```

For a file a run does not keep, the same with `bpmn:dataObjectReference`, which also needs a
`bpmn:dataObject` it points to:

```xml
<bpmn:dataObject id="posting_text_object" />
<bpmn:dataObjectReference id="posting_text" name="posting.txt" dataObjectRef="posting_text_object" />
```

The same file drawn again beside the step that reads it, as one object:

```xml
<bpmn:dataObjectReference id="posting_text_for_assess" name="posting.txt" dataObjectRef="posting_text_object" />
```

Inside an element, children go in this order: `documentation`, `incoming`, `outgoing`,
`property`, `dataInputAssociation`, `dataOutputAssociation`.
