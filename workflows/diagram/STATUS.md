# Provisional

**This workflow is a stub. It has not been designed, and it is not in its final state.**

Everything else under `workflows/` was worked out deliberately — what the phases are, who the
executor is at each step, which artifacts exist and who owns them. This one grew out of Paul
using an agent to draw BPMN diagrams and writing down what worked. It is useful and it is in
use; it is not a design.

## What it actually is today

- `skills/workflow-diagram/` — instructions written for Paul specifically. They name him, and
  they assume the visual editing happens in the bpmn.io VS Code extension, which students will
  not have.
- `tools/` — real and working: `check-di.mjs` and `bpmnlint` validate, `autolayout.mjs` places
  nodes, `render.mjs` makes images, `bpmn-viewer.html` displays a diagram without an editor.
- No guide, no student-facing skill, no diagram of its own.

## What it is going to become

Students will draw their own workflow diagrams. When they do, the diagram lives in their
repository rather than this one, and the skill takes a data directory like every other skill.
The first-day setup already installs the editor and the validators on student machines, so the
thing that uses them is owed.

Whether that is this skill widened or a second one beside it is open. Deferred deliberately —
the first-day bootstrap comes first.

## What this means for checks and edits

`workflows/develop/tools/check-skills.mjs` reads this file. While it exists, skills under
`workflows/diagram/` are exempt from the **design conventions** — the `## Operates on`
declaration, the entry-point rules, the data-directory language of `workspace-architecture.md`
§9. They are reported once, as a note, and do not fail the run.

They are **not** exempt from correctness. Manifest paths must still resolve, kinds must still
match, frontmatter must still carry `name` and `description`, and anything referenced must
still be declared. A stub is allowed to be unfinished; it is not allowed to be broken.

**Do not tidy this workflow into the conventions.** It is going to be redesigned, and
conforming it first means doing the work twice and then arguing with the result. If a check
here is in your way, the answer is usually to leave it alone.

Delete this file when the workflow has actually been designed. The checks turn back on by
themselves.
