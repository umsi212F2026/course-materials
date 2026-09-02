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

## This unit does not install Camunda, and inherits a machine that has it

**Camunda Modeler is installed in Installation 2**, by `setup-editors`, along with Zettlr. It
was moved out of setup once and moved back when the session order changed: Installation 2 is now
the class session about workflows, so the diagram opened at the end of it is that day's material
rather than an application installed weeks before anyone has a use for it. **Do not add an
install step here**, and do not write skills that check for one — by the time anything in this
unit runs, a student who finished setup has it.

What that leaves this unit holding, so none of it is learned twice:

- **Pinned to 5.50.1**, from
  `https://github.com/camunda/camunda-modeler/releases/download/v5.50.1/` —
  `camunda-modeler-5.50.1-mac-arm64.dmg`, `-mac-x64.dmg`, `-win-x64.zip`; on Windows through
  `winget` as `Camunda.Modeler`, whose manifest is that same zip. Pinned rather than "latest"
  because `api.github.com` allows sixty requests an hour from one address and a lab section
  shares one.
- **No installer registers `.bpmn` on Windows**, because there is no Windows installer — only a
  zip holding a portable `.exe`. **`setup-editors` has the student claim the type by hand**,
  browsing to the path above, and does not pass the phase until a double-click opens the
  diagram. So a student who finished Installation 2 can open a `.bpmn` by double-clicking it on
  either platform, and skills here can say "open this diagram" rather than opening it for them.
  Opening by path stays the fallback for a machine where it did not take.
- **On Windows it is at `C:\Program Files\Camunda Modeler\Camunda Modeler.exe`**, a constant,
  and skills here should name it the way `setup-repos` names git and Node. It takes a
  `--location` to get there, because a `winget` portable left to itself unpacks into a
  `WinGet\Packages` directory named for the package source — unnameable in advance, and
  unreachable by the agent when it goes per-user under `%LOCALAPPDATA%`. Use the full path
  rather than `PATH`, which does not update inside a running session.
- On macOS a `.dmg` into `/Applications` is enough, and double-clicking a diagram works —
  `.bpmn` has no declared file type there, so Camunda becomes its only claimant and wins by
  default.

`.si212-editors.json` carries a `camunda` key recording that the student was watched opening a
diagram, and `check-setup.mjs` reads it as an attested line. If this unit wants evidence of its
own, that is the shape to follow.

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
