---
name: record-round
description: Add one round to a student's final project record, ROUNDS.md, with its spec, plan and commits, and what's new and why next in their own words. Use when a round's implementation is committed and the project's AGENTS.md says to offer it, once ROUNDS.md names a base, when the student asks to record a round, and when find-rounds hands one over.
---

# Record a round

One round in `ROUNDS.md`: a Superpowers spec and plan committed after the base, and the commits
that implement them. Two parts of it are in the student's own words, and a tool copies those
words from this session exactly as they typed them. **You never write, shorten, tidy or
summarize either part, and you never answer a question here for the student.**

## Operates on

**Establish the folders from `~/.codex/AGENTS.md`**, which names `course-materials` and the
student's `assignments` repository, unless the skill that invoked this one names them. The
project folder, `<dir>`, is its `Final project:` line. Where there is no such line, read
`<assignments>/project/SUBMIT.md`: `Work: project/` means `<dir>` is `<assignments>/project`.
Where `Work:` is a repository URL instead, look in the folder that holds `assignments` for a
folder whose `git remote get-url origin` is that repository, by HTTPS or SSH, with or without
`.git`. If there is one, it is `<dir>`: add `Final project: <its absolute path>` to
`~/.codex/AGENTS.md` on the line after `Assignments:`, and go on. If there is none, send this
and end the turn, then add that line with the folder they give and go on:

> Your `SUBMIT.md` says your final project is at <the URL>, but I can't find a copy of it on
> this laptop. Which folder is it in?

Ask only where a folder is missing or not there, and say that is what happened. Where neither
names a project folder, the project is not started: say nothing about rounds.

Every read and write of `ROUNDS.md` goes through one tool, run from inside `course-materials`
with the absolute path of `<dir>`:

```
node workflows/rounds/tools/rounds.mjs <command> <dir> ...
```

Never edit `ROUNDS.md` yourself. Run every git command as `git -C <dir>`, limited to `<dir>`.

## Before you ask anything

1. Run `parse <dir>`. If `base` is `null`, stop here and say nothing about the record: work
   before the base is part of the base, and cannot be a round.
   **If you are offering on your own**, not because the student asked or `find-rounds` handed
   the round over, go on only if the project's `AGENTS.md` says to offer it, and the student
   has not already declined this round or asked you to stop offering. Otherwise stop here and
   say nothing about the record.
2. **Find the round.** If you were handed a plan, spec and commits, use them. Otherwise, first
   look at `git -C <dir> status`. **If a spec or plan is not committed yet, commit it on its
   own, before any code**: `git -C <dir> add -- <spec> <plan>`, then
   `git -C <dir> commit -m "<what it plans>" -- <spec> <plan>`. Then
   commit any implementation that is not committed yet, with a message that says what changed.
   Then run `candidates <dir>` and take the newest plan with `recorded: false`, its `spec` and
   its `suggestedCommits`.

   If there is no unrecorded plan, or its `suggestedCommits` is null, stop and say nothing when
   you are offering on your own; when the student asked, send this and stop. Use the first
   reason when there is no unrecorded plan, and otherwise the one for its `suggestedReason`,
   which is "no code yet", "code only before the plan" or "shares a commit with the next plan",
   in that order.

   > There's no round to record yet: <no plan committed after your base that isn't already a
   > round | no commits implement `<plan>` yet | the code for `<plan>` was all committed
   > before the plan, and code committed before its plan can't be a round | the code for
   > `<plan>` is in the commit that adds the next plan, so tell me which commits implement
   > it>. A round is a Superpowers spec and plan, committed after your base, then the commits
   > that implement them.

   **If its `spec` is null**, the round can still be recorded: list the files in
   `<dir>/docs/superpowers/specs/`, send this, and end the turn. Use the spec they name from
   here on.

   > Your plan `<plan>` has no spec with its name, and none committed with it. Which of these
   > is its spec? <the files, one per line>
   >
   > Name one, or say none of them, and I'll leave this round out.

3. **Read the round against the rule.** Read `Extends:` in `<assignments>/project/SUBMIT.md`.
   For a problem set, read its requirements in its `INSTRUCTIONS.md` in `assignments`
   (`ps1-data-analysis`, `ps2-web-app`, `ps3`, `ps4` or `ps5`); for `new`, the base is the
   bar. Then read the round's diff: `git -C <dir> diff <first>^..<last> -- . ':!docs/superpowers'`.
   Decide whether it clearly is one of the three things that never count as a round:
   - **a bug fix:** it repairs something already there rather than adding something someone
     could now do or see
   - **catch-up on Problem Set <n>:** it adds something that problem set required, finished or
     not, or for something new, something the base needed
   - **deployment:** it only puts the project on a host, or moves it to a different one

   When you are not sure, it is none of them. The student decides what to record, and the
   grader judges what counts.

**When `find-rounds` hands you a round**, do everything above, then in step 1 below skip the
offer question and go straight to `add-round`, refusal handling included: the student has
already chosen to record it. At the end of step 3 send no block. Commit, then go
back to `find-rounds`, which says what comes next.

## What you do

**1. Offer it.** Ask this in one call to `request_user_input_async`, filled in, with the options
in the order given. Then send this as the last thing in the turn:

> Please answer the question about this round.

- **Title**, when step 3 found nothing: "Your plan `<plan>`, with its spec and commits
  <commits>, could be round <n> in `ROUNDS.md`. Do you want it there?"
  **Options:** "Yes, record it", "No, leave it out"
- **Title**, when step 3 found one: "Your plan `<plan>`, with its spec and commits <commits>:
  this looks like <a bug fix | catch-up on Problem Set <n> | catch-up on your base |
  deployment>, which does not count as a round. Record it anyway?"
  **Options:** "No, leave it out", "Yes, record it anyway"

The first option is preselected, so a student who clicks through without reading records a
round only when nothing about it looked wrong.

If you have no `request_user_input_async`, send the question as a plain message instead, with
its options as a numbered list, and end the turn.

If they say to leave it out, say "OK, it stays out." and stop. If they say the commits are
different, use theirs.

Then run `add-round`, with a `--title` of your own: a few words naming the feature, which the
README check looks for in a deployed project's `README.md`:

```
add-round <dir> --title <t> --spec <spec> --plan <plan> --commits <first>..<last>
```

It prints the new round's number. If it refuses, the message says which rule the round fails,
such as a plan committed in or before the base, or commits that come before the plan. Send this
and stop:

> This one can't be a round: <the tool's message>

Unless the refusal is a mistake in how you ran it, such as a path or hash mistyped: then fix it
and run it again.

**2. Ask what's new.** Send this and end the turn:

> In your own words: **what's new in round <n>?** Say what someone could now do or see that they
> could not before. Whatever you write here will go into `ROUNDS.md` exactly as you type it.

**At the start of your next turn, before anything else**, if their reply answers the question,
run `take-reply <dir> <n> new`. It copies their last message into the record and prints what it
recorded. If their reply is a question instead, answer it and send the step 2 block again; do
not run the tool on a question. If the tool refuses:

- **Two sessions are active:** rerun it once with `--transcript <path>` set to whichever of the
  two named files ends with the reply you just received.
- **Any other refusal**, such as a line starting with `#`: send the block for this step again
  with the tool's message as its first line, and run it again on their next answer.

**3. Ask why next.** Send this, with what `take-reply` printed, and end the turn:

> I recorded what's new, exactly as you wrote it:
>
> > <the words take-reply printed>
>
> And in your own words: **why was this feature worth doing next?**

At the start of your next turn, as in step 2, run `take-reply <dir> <n> why`. Then commit
`ROUNDS.md` with `git -C <dir> commit -m "rounds: round <n>" -- ROUNDS.md`, and send this as the
last thing in the turn:

> Recorded as round <n> in `ROUNDS.md`, with why next exactly as you wrote it:
>
> > <the words take-reply printed>

**Ask the two own-words questions as plain messages**, never through `request_user_input_async`
or any other question tool. `take-reply` finds the student's words by the message of yours that
asked for them, so that message has to be a plain one.

## Depends on

- [`rounds.mjs`](workflows/rounds/tools/rounds.mjs) - tool
- [`find-rounds`](workflows/rounds/skills/find-rounds/SKILL.md) - skill
