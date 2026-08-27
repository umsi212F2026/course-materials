# SI 212 — course materials

Public materials for **SI 212, Fall 2026**, University of Michigan School of Information.

Students clone this repository during first-day setup. It is **pull-only**: everything here is
maintained by the instructor, and your own work belongs in your personal course repositories,
not in this one.

> **Being set up. Not ready for students yet.** Every workflow below is drafted and none has
> been run with a student. Wait to be told it is ready.

## What's here

    AGENTS.md                where an agent starts — the entry-point index
    workflows/bootstrap/     first-day setup: the U-M GPT prompt, the setup skills, the setup check
    workflows/tour/          the setup's own smoke test, and what a workflow is made of
    workflows/learn/         the learning workflow — goals, activities, study, review
    workflows/update/        bringing one repository up to date with this one
    workflows/diagram/       BPMN validators and viewer  (provisional — see its STATUS.md)
    workflows/develop/       instructor tooling: the skill checker, model trials

Each workflow holds its own `guides/` for people, `skills/` for agents, `tools/` for programs,
and the diagram that says how its parts fit together.

## Reading it

Start with [`AGENTS.md`](AGENTS.md). It lists the handful of workflows you can begin a session
from, with each one's own description, and every skill lists what it depends on at the bottom of
its own file — so anything reached from those is findable from there.

Nothing is hidden. The skills are plain English, and if an agent does something unexpected, the
skill it was following is the place to look.

## Your work does not live here

Two other public repositories seed the repositories that become yours:

- [`learning-topics`](https://github.com/umsi212F2026/learning-topics) — your learning work,
  private to you.
- [`assignments`](https://github.com/umsi212F2026/assignments) — what you hand in; the teaching
  team can read it.

You clone all three on the first day. In week 2 the two above become your own private
repositories, while this one stays pull-only for the term — which is what lets a correction here
reach you without touching anything you have written.
