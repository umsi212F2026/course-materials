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

`check` lists eight items, each `ok` or not, with a `detail`. From `parse`, collect every own-words
part of a qualifying entry (both its `noticed` and its `why`) whose `attestation` is not
`fresh` and whose `text` is not empty. An entry qualifies unless its `whoNoticed` and `whoChose`
are both `the agent`.

Then send one block, filled in, and end the turn. Leave out the attestation half when nothing
needs attesting:

> Here's how Problem Set 5 checks out against what the grader looks for:
>
> - ✅ <item name>
> - ❌ <item name>: <its detail>
> - ...
>
> Your change record has parts that should be in your own words. Here they are, exactly as
> they are in `ps5/CHANGES.md`:
>
> **Entry <n>, what you noticed was wrong:**
> > <the text>
>
> **Entry <n>, why you chose this fix:**
> > <the text>
>
> Did you write each of these yourself, rather than an agent writing it for you? Say yes, or
> say which ones you didn't.

When nothing failed and nothing needs attesting, send instead:

> Problem Set 5 passes every item the grader checks, and every own-words part is confirmed as
> yours. It's ready to submit.

**2. Attest what they confirm.** For each part they say they wrote, run
`attest <repo> <n> <noticed|why>`. Then, for each part they say they didn't write, send this
and end the turn:

> Please rewrite entry <n>'s "<what you noticed was wrong | why you chose this fix>" in your
> own words. You can edit `ps5/CHANGES.md` yourself, or reply here with the new version and
> I'll put it in exactly as you write it.

If they reply with a new version, run `take-reply <repo> <n> <noticed|why>` at the start of your
next turn, before anything else. Either way, go back to step 1, which asks about the rewritten
part again.

When every part they confirmed is attested and none is left to rewrite, commit
`ps5/CHANGES.md` with the message `record: attested`, and go back to step 1 once, so the
student sees the final state.

## Depends on

- [`changes.mjs`](workflows/record/tools/changes.mjs) - tool
