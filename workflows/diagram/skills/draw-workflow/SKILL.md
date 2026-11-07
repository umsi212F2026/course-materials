---
name: draw-workflow
description: Draw or revise a BPMN diagram of a workflow, showing who does each step (the student, an AI agent following a skill file, or a program), what triggers it, and where its state is kept, for the student to view in Camunda. Use when someone asks to draw, change or fix a workflow diagram or a .bpmn file in their assignments repository, and whenever a workflow's design changes in a way the diagram shows. Designing a new workflow starts with superpowers, which uses this.
---

# Draw a workflow

A workflow diagram is a `.bpmn` file. The student looks at it in Camunda Modeler; you edit its
XML. It is half of a workflow's design. The other half is the spec, which says the same design in
words, and **the two are kept in step**: a change to either goes into the other in the same
commit.

## Operates on

Three things. **Establish the folders from `~/.codex/AGENTS.md`**, which names
`course-materials` and the student's `assignments` repository, before you say anything. Ask only
where it is missing or names a folder that is not there, and say that is what happened.

- **The diagram.** A skill that invokes this one says which file. Otherwise it is
  `workflow.bpmn` in the project's folder inside `assignments`, where the project is what
  [`superpowers`](workflows/develop/skills/superpowers/SKILL.md) says it is: a problem set's
  folder when the work belongs to one, so `ps5/workflow.bpmn` for Problem Set 5.
- **The spec**, if there is one: the design document Superpowers wrote in that project's
  `docs/superpowers/specs/`. Before brainstorming has written one, there is nothing to keep in
  step yet.
- **The tools**, in `course-materials/workflows/diagram/tools`, written `<tools>` below. Read
  them and run them; never edit them.

## Before your first edit in a session

1. **If `<tools>/node_modules` does not exist**, run `npm install --omit=dev` inside `<tools>`.
   It takes a few seconds and installs nothing outside that folder.
2. **Read [`references/student-conventions.md`](references/student-conventions.md).** It has
   the lanes, the palette, the naming, and the exact XML for each element.

## Every change, in this order

1. **Re-read the diagram now**, not from an earlier read. The student may have saved it from
   Camunda since.
2. **Edit only the process half**: the `<bpmn:collaboration>` and `<bpmn:process>` elements.
   Keep every existing id. Never write or change anything inside `<bpmndi:BPMNDiagram>`; that is
   positions, and the next step writes them.
3. **Lay it out:**
   ```
   node <tools>/layout.mjs <diagram>
   ```
   It places only what has no position yet, so a shape the student moved in Camunda stays
   where they put it. It prints each thing it `placed`, `moved` or `removed`.
4. **Validate, with both**, and fix and rerun until both are clean:
   ```
   node <tools>/check-di.mjs <diagram>
   node <tools>/node_modules/bpmnlint/bin/bpmnlint.js -c <tools>/../.bpmnlintrc <diagram>
   ```
   Add `--planned` to `check-di` once the plan has named skill and program files that the build
   has not written yet.
5. **Bring the spec into step.** If the change touched the trigger, a step, who does a step, a
   decision, or where state is kept, change the spec to say so too. If the spec changed first,
   this is the diagram catching up. Compare them by reading the spec beside the process half.
6. **Commit the diagram and the spec together**, with a message that says what changed in the
   design, in words: `diagram: check the deadline before reviewing the verdict`.

**A new diagram** is the one time you write the file whole: the skeleton in the conventions,
filled in with the process half, then steps 3 to 6. Every edit after that is to the elements
that change.

## Showing it to the student

Show the diagram whenever it would make something clearer than words would: an overview of the
whole run, a question about what happens after a decision, a question about where state is
kept, a choice of lane. That can be at any stage of the design. Otherwise keep the conversation
in text, and still keep the diagram in step.

**Do all of the work above first, then send this as the last thing in the turn**, with nothing
after it. Fill in the parts in angle brackets; the path is the diagram's full path.

> I've updated your workflow diagram: <what changed, in a sentence or two>.
>
> To see it, double-click `<full path to the diagram>`. If it is already open in Camunda and
> Camunda asks whether to reload it, say yes.
>
> <one question about the design that the diagram helps answer; one, not two>
>
> If you move anything in Camunda, save before you reply and I'll keep your layout. If you
> haven't saved something you changed there, tell me before I edit the file again.

**If this turn created the diagram**, add this line before the question:

> You should see three lanes: HUMAN operator (that's you), AI AGENT, and PROGRAM. Tell me if
> you don't.

**If `layout.mjs` reported `moved`** for anything, add which steps moved and why, in a phrase,
to the first line. It moves a shape only to make room for a new step or to put a step in the
lane it now belongs to.

If double-clicking does not open Camunda, open it for them: on macOS,
`open -a "Camunda Modeler" <diagram>`; on Windows,
`& "C:\Program Files\Camunda Modeler\Camunda Modeler.exe" <diagram>`.

## Depends on

- [`superpowers`](workflows/develop/skills/superpowers/SKILL.md) - skill
- [`student-conventions.md`](workflows/diagram/skills/draw-workflow/references/student-conventions.md) - reference
- [`layout.mjs`](workflows/diagram/tools/layout.mjs) - tool
- [`check-di.mjs`](workflows/diagram/tools/check-di.mjs) - tool
