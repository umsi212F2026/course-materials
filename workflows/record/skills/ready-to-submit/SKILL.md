---
name: ready-to-submit
description: Check a student's Problem Set 5 against what the grader looks for, and have them confirm that the own-words parts of their change record are their own writing. Use when the student asks whether Problem Set 5 is ready to submit, wants to check it, or is about to hand it in.
---

# Ready to submit

The same items the grader looks for, checked by a tool, and then one question: whether the
student wrote each own-words part of their change record themselves. **You never write or
change those parts.** When the student says no, they rewrite it.

## Operates on

**Establish the folders from `~/.codex/AGENTS.md`**, which names `course-materials` and the
student's `assignments` repository, before you say anything. Ask only where it is missing or
names a folder that is not there, and say that is what happened.

Run the tool from inside `course-materials`, with the absolute path of `assignments` as
`<repo>`.

## What you do

**1. Check, and ask.** Run:

```
node workflows/record/tools/changes.mjs check <repo>
node workflows/record/tools/changes.mjs parse <repo>
```

`check` lists nine items, each `ok` or not, with a `detail`. From `parse`, list the parts still
to confirm: every own-words part (its `noticed`, then its `why`) of an entry whose `qualifies`
is true, whose `attestation` is not `fresh` and whose `text` is not empty, in entry order.

**When there are parts to confirm**, ask about all of them in one call to
`request_user_input_async`, one question per part, in that order:

- **Title:** "Entry <n>, <what was wrong | why this fix>, exactly as it is in
  `ps5/CHANGES.md`: "<the text>". Did you write this yourself, rather than an agent writing it
  for you?"
- **Options**, in this order: "No, I'll rewrite it", "Yes, I wrote it"

The first option is preselected, so a student who clicks through without reading is asked to
rewrite, never recorded as having written something they did not read.

Then send this, filled in, as the last thing in the turn:

> Here's how Problem Set 5 checks out against what the grader looks for:
>
> - ✅ <item name>
> - ❌ <item name>: <its detail>
> - ...
>
> Please answer the questions about the parts of your record that are in your own words.

If you have no `request_user_input_async`, ask about the parts one at a time instead, each as a
plain message that shows the part exactly as it is and asks the same question.

**When there are none**, send this and end the turn. Keep "It's ready to submit on Canvas." only
when every item passed, and "Want me to help with the ones marked ❌?" only when one did not:

> Here's how Problem Set 5 checks out against what the grader looks for:
>
> - ✅ <item name>
> - ❌ <item name>: <its detail>
> - ...
>
> Every own-words part is confirmed as yours. It's ready to submit on Canvas.
>
> Want me to help with the ones marked ❌?

**2. Record the answers.** For every part they answered "Yes, I wrote it", run
`attest <repo> <n> <noticed|why>`. An answer that is neither option is not a yes: ask about
that part again.

**Then each part they answered no, one at a time.** Send this and end the turn:

> Please rewrite entry <n>'s "<what was wrong | why this fix>" in your own words. You can edit
> `ps5/CHANGES.md` yourself and tell me when you have, or reply here with the new version and
> I'll put it in exactly as you write it.

If their reply is the new version, run `take-reply <repo> <n> <noticed|why>` at the start of
your next turn, before anything else; it prints what it recorded. If they say they edited the
file, run `parse` again. Either way, ask about that part again as in step 1, with one question
showing its new text, and record the answer as above.

**Send the rewrite request as a plain message**, never through `request_user_input_async` or
any other question tool. `take-reply` finds the student's words by the message of yours that
asked for them, so that message has to be a plain one.

When no part is left to confirm, commit `ps5/CHANGES.md` with the message `record: attested`,
and go back to step 1, so the student sees the final state. If the `pushed` item is the only one
failing, end that block with "Want me to push it?" in place of its last line, and push when they
say yes.

## Depends on

- [`changes.mjs`](workflows/record/tools/changes.mjs) - tool
