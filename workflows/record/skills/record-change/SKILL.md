---
name: record-change
description: Add one change to a student's Problem Set 5 change record, ps5/CHANGES.md, with what they noticed and why they chose the fix in their own words. Use right after a change to ps5/workflow.bpmn or a ps5/skills/*/SKILL.md once CHANGES.md names an initial design, when the student asks to record a change, and when find-changes hands one over.
---

# Record a change

One entry in `ps5/CHANGES.md`: a change to the workflow's diagram or to a skill file that the
student noticed or guided. Two parts of it are in the student's own words, and a tool copies
those words from this session exactly as they typed them. **You never write, shorten, tidy or
summarize either part, and you never answer a question here for the student.**

## Operates on

**Establish the folders from `~/.codex/AGENTS.md`**, which names `course-materials` and the
student's `assignments` repository, unless the skill that invoked this one names them. Ask only
where it is missing or names a folder that is not there, and say that is what happened.

Every read and write of `CHANGES.md` goes through one tool, run from inside `course-materials`
with the absolute path of `assignments` as `<repo>`:

```
node workflows/record/tools/changes.mjs <command> <repo> ...
```

Never edit `CHANGES.md` yourself.

## Before you ask anything

1. Run `parse <repo>`. If `initialDesign` is `null`, stop here and say nothing about the record:
   changes before the initial design do not go in it.
2. **Find the change's commit.** If you were handed one, use it. If the change is not committed
   yet, commit it now, with a message that says what changed. A diagram change and its spec go
   in one commit, as `draw-workflow` does.
3. Note what changed (the diagram, or which skill) and what prompted it, if you know: a run on
   one of the examples, or design critique in class.

**When `find-changes` hands you a change**, do everything above, then start at step 2 below:
the student has already chosen to record it. At the end of step 4 send no block. Commit, then go
back to `find-changes`, which says what comes next.

## What you do

**1. Ask whether it goes in the record.** Send this, filled in, and end the turn:

> That change to <the diagram, or the `<name>` skill> could go in your change record.
>
> Your record counts changes to the diagram or a skill file that **you** noticed or guided:
> you spotted the problem, or you chose the fix, or both. A change I both noticed and fixed
> on my own doesn't count, and it doesn't go in.
>
> Do you want this one in your record?

If they say no, say "OK, it stays out." and stop.

**2. Ask who noticed it and who chose the fix.** Send this and end the turn:

> Three quick questions about <the diagram change, or the change to the `<name>` skill> in
> commit <short hash>, "<its subject>".
>
> **What prompted it?** A run on one of your examples (which one?), or design critique in
> class?
>
> **Who noticed the problem?**
> 1. me
> 2. the agent
> 3. a classmate or Paul
>
> **Who chose the fix?**
> 1. me
> 2. the agent, from my description
> 3. me, from options the agent gave
> 4. the agent
>
> For example: "a run on examples/acme, 1, 2".

Take their answers as they gave them. If an answer is unclear, ask that question again; do not
pick one for them. Then run `add-entry` with a short `--title` and `--what-changed` of your own,
and their answers, word for word from the lists:

```
add-entry <repo> --title <t> --changed "<diagram | skill <name>>" --commit <hash>
  --prompted-by "<a run on examples/<id> | design critique>"
  --who-noticed "<answer>" --who-chose "<answer>" --what-changed <t>
```

It prints the new entry's number. If it refuses because the agent noticed and chose the fix, or
because a critique change's fix was not the student's choice, send this and stop:

> This one doesn't go in your record: <the tool's message>

Any other refusal is a mistake in how you ran it, such as a value not copied exactly from the
lists or a commit hash mistyped. Fix it and run it again; do not tell the student it doesn't
count.

**3. Ask what they noticed.** Send this and end the turn:

> In your own words: **what did you notice was wrong?** Name the input or the critique that
> showed you, and what was wrong with what came out. Whatever you write here goes into your
> record exactly as you type it.

**At the start of your next turn, before anything else**, if their reply answers the question,
run `take-reply <repo> <n> noticed`. It copies their last message into the record and prints
what it recorded. If their reply is a question instead, answer it and send the step 3 block
again; do not run the tool on a question. If the tool refuses:

- **Two sessions are active:** rerun it once with `--transcript <path>` set to whichever of the
  two named files ends with the reply you just received.
- **Any other refusal**, such as a line starting with `#` or a reply that doesn't answer the
  question: send the block for this step again with the tool's message as its first line, and
  run it again on their next answer.

**4. Ask why they chose the fix.** Send this, with what `take-reply` printed, and end the turn:

> I recorded what you noticed, exactly as you wrote it:
>
> > <the words take-reply printed>
>
> And in your own words: **why did you choose this fix**, rather than some other way of
> handling it?

At the start of your next turn, as in step 3, run `take-reply <repo> <n> why`. Then commit
`ps5/CHANGES.md` with the message `record: entry <n>`, and send this as the last thing in the
turn:

> Recorded as entry <n> in `ps5/CHANGES.md`, with why you chose the fix exactly as you wrote it:
>
> > <the words take-reply printed>

**Ask every question here as a plain message**, never through a question or multiple-choice
tool. The tool copies the student's typed reply, and an answer given through another tool may
not be one it can read.

## Depends on

- [`changes.mjs`](workflows/record/tools/changes.mjs) - tool
- [`draw-workflow`](workflows/diagram/skills/draw-workflow/SKILL.md) - skill
- [`find-changes`](workflows/record/skills/find-changes/SKILL.md) - skill
