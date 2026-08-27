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

Whether that is this skill widened or a second one beside it is open. Deferred deliberately —
the first-day bootstrap comes first.

## This unit owes an install

**Camunda Modeler is no longer installed on day one.** It was, and it did not earn the place:
an application first opened in this unit, installed a week or more earlier, alongside a
screenshot of a diagram nobody had a reason to read yet. It belongs here, in the week it is
first used, with a diagram in hand as the reason.

So this unit gains a step that installs it. What the bootstrap work already established, so it
does not have to be learned twice:

- **Pinned to 5.50.1**, from
  `https://github.com/camunda/camunda-modeler/releases/download/v5.50.1/` —
  `camunda-modeler-5.50.1-mac-arm64.dmg`, `-mac-x64.dmg`, `-win-x64.zip`. Pinned rather than
  "latest" because `api.github.com` allows sixty requests an hour from one address and a lab
  section shares one.
- **There is no Windows installer**, only a zip holding a portable `.exe`. Nothing registers
  `.bpmn` on Windows, so a student who double-clicks a diagram is offered Notepad and a browser
  with Camunda not in the list. That is true however it is installed, including through
  `winget`, whose manifest is the same zip. **So the skill opens diagrams for them, by path.**
- **On Windows, install to `%USERPROFILE%\Programs`**, never under `AppData` — see the rule in
  `setup-editors`, which explains why, and `check-setup.mjs`, which looks in the same place.
- On macOS a `.dmg` into `/Applications` is enough; `.bpmn` has no declared file type there, so
  Camunda becomes its only claimant and wins by default.

`.si212-editors.json` used to carry a `camunda` key recording that a student had opened a
diagram. The setup check no longer reads it. If this unit wants the same evidence, it is a
reasonable shape to reuse.

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
