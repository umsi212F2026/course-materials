---
name: record-change
description: Add one change to a student's Problem Set 5 change record, ps5/CHANGES.md, with what was wrong and why that fix, in their own words. Use right after a change to ps5/workflow.bpmn or a ps5/skills/*/SKILL.md that ps5/AGENTS.md says is worth recording, once CHANGES.md names an initial design, when the student asks to record a change, and when find-changes hands one over.
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
   **If you are offering on your own**, not because the student asked or `find-changes` handed
   the change over, go on only if `ps5/AGENTS.md` says the change is worth recording, and the
   student has not already declined it or asked you to stop offering. Otherwise stop here and
   say nothing about the record.
2. **Find the change's commit.** If you were handed one, use it. If the change is not committed
   yet, commit it now, with a message that says what changed. A diagram change and its spec go
   in one commit, as `draw-workflow` does.
3. Note what changed: the diagram, or which skill.

**When `find-changes` hands you a change**, do everything above, then ask step 1's questions
without the first one: the student has already chosen to record it. At the end of step 3 send
no block. Commit, then go back to `find-changes`, which says what comes next.

## What you do

**1. Offer it, and ask who noticed it and who chose the fix.** Ask these three questions
together in one call to `request_user_input_async`, filled in, with the options exactly as
written and in this order. Then send this as the last thing in the turn:

> Please answer the questions about this change.

The questions:

1. **Title:** "That change to <the diagram, or the `<name>` skill>, in commit <short hash>,
   "<its subject>", could go in your change record. Do you want it there?"
   **Options:** "Yes, record it", "No, leave it out"
2. **Title:** "Who noticed the problem it fixes?"
   **Options:** "the agent", "me", "a classmate or instructor"
3. **Title:** "Who chose the fix?"
   **Options:** "the agent", "the agent, from my description", "me, from options the agent
   gave", "me"

**The order of the options is deliberate.** The first option is preselected, so a student who
clicks through without choosing lands on "the agent" twice, which the tool turns away, rather
than on "me" twice, which would put a change in their record that they did not guide.

If you have no `request_user_input_async`, send the three questions as one plain message
instead, each with its options as a numbered list, and end the turn.

If they say to leave it out, say "OK, it stays out." and stop.

Take their answers as they gave them. If an answer is free text that is not one of the options,
or is unclear, ask that question again; do not pick one for them. Then run `add-entry` with a
short `--title` and `--what-changed` of your own, and their answers, word for word from the
options:

```
add-entry <repo> --title <t> --changed "<diagram | skill <name>>" --commit <hash>
  --who-noticed "<answer>" --who-chose "<answer>" --what-changed <t>
```

It prints the new entry's number. If it refuses because the agent noticed and chose the fix, or
because a classmate or the instructor noticed it and the student did not choose the fix, send
this and stop:

> This one doesn't go in your record: <the tool's message>

Any other refusal is a mistake in how you ran it, such as a value not copied exactly from the
lists or a commit hash mistyped. Fix it and run it again; do not tell the student it doesn't
count.

**2. Ask what was wrong.** Send this and end the turn:

> In your own words: **what was wrong that this change fixes?** Say what the workflow got
> wrong. Whatever you write here will go into your record exactly as you type it.

**At the start of your next turn, before anything else**, if their reply answers the question,
run `take-reply <repo> <n> noticed`. It copies their last message into the record and prints
what it recorded. If their reply is a question instead, answer it and send the step 2 block
again; do not run the tool on a question. If the tool refuses:

- **Two sessions are active:** rerun it once with `--transcript <path>` set to whichever of the
  two named files ends with the reply you just received.
- **Any other refusal**, such as a line starting with `#` or a reply that doesn't answer the
  question: send the block for this step again with the tool's message as its first line, and
  run it again on their next answer.

**3. Ask why this fix.** Send this, with what `take-reply` printed, and end the turn:

> I recorded what was wrong, exactly as you wrote it:
>
> > <the words take-reply printed>
>
> And in your own words: **why this fix**, rather than some other way of handling it?

At the start of your next turn, as in step 2, run `take-reply <repo> <n> why`. Then commit
`ps5/CHANGES.md` with the message `record: entry <n>`, and send this as the last thing in the
turn:

> Recorded as entry <n> in `ps5/CHANGES.md`, with why this fix exactly as you wrote it:
>
> > <the words take-reply printed>

**Ask the two own-words questions as plain messages**, never through `request_user_input_async`
or any other question tool. `take-reply` finds the student's words by the message of yours
that asked for them, so that message has to be a plain one.

## Depends on

- [`changes.mjs`](workflows/record/tools/changes.mjs) - tool
- [`draw-workflow`](workflows/diagram/skills/draw-workflow/SKILL.md) - skill
- [`find-changes`](workflows/record/skills/find-changes/SKILL.md) - skill
