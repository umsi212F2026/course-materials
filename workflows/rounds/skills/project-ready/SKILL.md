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
`Work: project/` means `<dir>` is `<assignments>/project`. Where `Work:` is a repository URL
instead, look in the folder that holds `assignments` for a folder whose
`git remote get-url origin` is that repository, by HTTPS or SSH, with or without `.git`. If
there is one, it is `<dir>`: add `Final project: <its absolute path>` to `~/.codex/AGENTS.md` on
the line after `Assignments:`, and go on. If there is none, send this and end the turn, then add
that line with the folder they give and go on:

> Your `SUBMIT.md` says your final project is at <the URL>, but I can't find a copy of it on
> this laptop. Which folder is it in?

Ask only where a folder is missing or not there, and say that is what happened. Where neither
names a project folder, send this and stop:

> Your final project isn't set up yet. Ask me to start your final project.

Run the tool from inside `course-materials`, with the absolute paths of `<dir>` and of
`assignments` as `<repo>`. Run every git command as `git -C <dir>`, limited to `<dir>`.

## What you do

**1. Read, judge, and ask.** Run:

```
node workflows/rounds/tools/rounds.mjs parse <dir>
```

For `Kind: negotiated` in `SUBMIT.md`, nothing below about rounds or own-words parts applies: go
straight to the message at the end of this step, with no flags.

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

If you have no `request_user_input_async`, ask about the parts one at a time instead, each as a
plain message that shows the part exactly as it is and asks the same question, and send the
message below only once none is left to ask about.

**The message.** Run the check, which is slow because it asks the web what a stranger sees:

```
node workflows/rounds/tools/rounds.mjs say report <dir> --assignments <repo> --online
```

adding `--weak "<n> <new|why>=<in one sentence, what the grader looks for that it does not say>"`
for each part you flagged, and `--looks-like "<n>=<judgment>"` for each round you flagged, where
the judgment is `a bug fix`, `catch-up on Problem Set <n>`, `catch-up on your base` or
`deployment`. It prints every item the grader looks for and your flags, and ends with what fits:
a request to answer the questions while parts are left to confirm, and otherwise whether it is
ready. Send its output as your reply, as it is, and as the last thing in the turn.

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
sees the final state. When that message ends "Want me to push it?" and they say yes, push
whichever repository needs it.

## Depends on

- [`rounds.mjs`](workflows/rounds/tools/rounds.mjs) - tool
- [`record-round`](workflows/rounds/skills/record-round/SKILL.md) - skill
