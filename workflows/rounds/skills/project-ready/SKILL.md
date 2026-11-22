---
name: project-ready
description: Check a student's final project against what the grader looks for, on their laptop and as a stranger on the web sees it, and have them confirm that the own-words parts of ROUNDS.md are their own writing. Use when the student asks whether the final project is ready to submit, wants to check it, or is about to hand it in.
---

# Project ready to submit

The same items the grader looks for, checked by a tool, some of them over the network without
the student's credentials, as a stranger would see the project. Then one question: whether the
student wrote each own-words part of `ROUNDS.md` themselves. **You never write or change those
parts.** When the student says no, they rewrite it.

## Operates on

**Establish the folders from `~/.codex/AGENTS.md`**, which names `course-materials` and the
student's `assignments` repository, before you say anything. The project folder, `<dir>`, is
its `Final project:` line. Where there is no such line, read `<assignments>/project/SUBMIT.md`:
`Work: project/` means `<dir>` is `<assignments>/project`. Ask only where a folder is missing or
not there, and say that is what happened. Where neither names a project folder, send this and
stop:

> Your final project isn't set up yet. Ask me to start your final project.

Run the tool from inside `course-materials`, with the absolute paths of `<dir>` and of
`assignments` as `<repo>`. Run every git command as `git -C <dir>`, limited to `<dir>`.

## What you do

**1. Check, and ask.** Run:

```
node workflows/rounds/tools/rounds.mjs check <dir> --assignments <repo> --online
node workflows/rounds/tools/rounds.mjs parse <dir>
```

`check` lists its items in order, each `ok` or not, with a `detail`. Which items there are
depends on `Kind:` in `SUBMIT.md`. For `negotiated`, there is a `TERMS.md` item and no rounds
items, and nothing below about rounds or own-words parts applies: go straight to the block for
when there are no parts to confirm, without its line about own-words parts.

From `parse`, list the parts still to confirm: every own-words part (its `new`, then its `why`)
of a round whose `valid` is true, whose `attestation` is not `fresh` and whose `text` is not
empty, in round order.

**Then read every own-words part of a valid round**, confirmed or not, against the grader's
bar: "what's new" names the feature concretely enough to find in the running app or the
workflow, and "why next" gives a reason. Flag a part only when it clearly falls short: a
"what's new" that names no feature, such as "made it better" or "improved the app", or a "why
next" that gives no reason at all. The grader judges "why next" generously, so leave anything
borderline unflagged. **Never suggest wording, and never offer to help rewrite it.** The words
are the student's, and so is the decision whether to change them.

**And read every valid round against the rule**, as
[`record-round`](workflows/rounds/skills/record-round/SKILL.md)'s "Read the round against the
rule" does: its diff beside the requirements of the problem set it extends. Flag a round only
when it clearly is a bug fix, catch-up or deployment. That is the round the grader is most
likely to give nothing for.

**When there are parts to confirm**, ask about all of them in one call to
`request_user_input_async`, one question per part, in that order:

- **Title:** "Round <n>, <what's new | why next>, exactly as it is in `ROUNDS.md`: "<the text>".
  Did you write this yourself, rather than an agent writing it for you?"
- **Options**, in this order: "No, I'll rewrite it", "Yes, I wrote it"

The first option is preselected, so a student who clicks through without reading is asked to
rewrite, never recorded as having written something they did not read.

Then send this, filled in, as the last thing in the turn. List every item `check` returned.
Keep a ⚠️ line for each part and each round you flagged, and for each item that passed with a
`detail` starting "Warning:", and none when there is nothing to warn about:

> Here's how your final project checks out against what the grader looks for. The online items
> are what a stranger sees, without your sign-in:
>
> - ✅ <item name>
> - ❌ <item name>: <its detail>
> - ...
>
> ⚠️ Round <n>, <what's new | why next>, "<the text>", might lose credit: <in one sentence, what
> the grader looks for that it does not say>.
>
> ⚠️ Round <n> looks like <a bug fix | catch-up on Problem Set <n> | catch-up on your base |
> deployment>, which earns nothing as a round.
>
> ⚠️ <item name>: <its detail>
>
> Please answer the questions about the parts of your record that are in your own words.

If you have no `request_user_input_async`, ask about the parts one at a time instead, each as a
plain message that shows the part exactly as it is and asks the same question.

**When there are none**, send this and end the turn. Keep the ⚠️ lines as above, the line about
the site only for `Kind: deployed`, "It's ready to submit on Canvas." only when every item
passed, and "Want me to help with the ones marked ❌?" only when one did not:

> Here's how your final project checks out against what the grader looks for. The online items
> are what a stranger sees, without your sign-in:
>
> - ✅ <item name>
> - ❌ <item name>: <its detail>
> - ...
>
> ⚠️ ...
>
> Every own-words part is confirmed as yours.
>
> Your site will be graded live, so keep it running the code on `main` until grading is done.
>
> It's ready to submit on Canvas.
>
> Want me to help with the ones marked ❌?

**2. Record the answers.** For every part they answered "Yes, I wrote it", run
`attest <dir> <n> <new|why>`. An answer that is neither option is not a yes: ask about that
part again.

**Then each part they answered no, one at a time.** Send this and end the turn:

> Please rewrite round <n>'s "<what's new | why next>" in your own words. You can edit
> `ROUNDS.md` yourself and tell me when you have, or reply here with the new version and I'll
> put it in exactly as you write it.

If their reply is the new version, run `take-reply <dir> <n> <new|why>` at the start of your
next turn, before anything else; it prints what it recorded. If they say they edited the file,
run `parse` again. Either way, ask about that part again as in step 1, with one question
showing its new text, and record the answer as above.

**Send the rewrite request as a plain message**, never through `request_user_input_async` or
any other question tool. `take-reply` finds the student's words by the message of yours that
asked for them, so that message has to be a plain one.

When no part is left to confirm, commit `ROUNDS.md` with
`git -C <dir> commit -m "rounds: attested" -- ROUNDS.md`, and go back to step 1, so the student
sees the final state. If `project pushed` and `assignments pushed` are the only items failing,
end that block with "Want me to push it?" in place of its last line, and push whichever
repository needs it when they say yes.

## Depends on

- [`rounds.mjs`](workflows/rounds/tools/rounds.mjs) - tool
- [`record-round`](workflows/rounds/skills/record-round/SKILL.md) - skill
