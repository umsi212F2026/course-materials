# PS5: what to ask a student about their own workflow

These candidates are for a later mini-quiz, answered in class without the agent. The quiz tests
whether a student can respond well to a follow-up question about the workflow they built, not
whether they can recall what they wrote. Every question asks them to reason about a choice they
made, against an alternative or a risk they may not have considered.

Your files for each student are `ps5/CHANGES.md` (their change record), `ps5/README.md` when
there is one, every skill (`ps5/skills/<name>/SKILL.md`), every program, and
`generated/diagram.txt`, the grader's summary of their diagram, and `generated/entries.txt`,
which says which change-record entries qualify. The folder may have another name
than `ps5/`; use the paths you are given. `failures`, when present, lists what the grader's program found wrong.

Every candidate is `type: "free"` with `id`, `prompt`, `expected`, `rubric` and `evidence`.
Evidence is a list of `{ file, lines, sha }`, with `lines` a single line (`"12"`) or a range
(`"12-15"`) of the numbered file you were given and `sha` the student's graded sha. **Every line
of every evidence span must appear word for word in the prompt.** A candidate that cites a line
it does not quote is dropped, so quote what you ask about and cite only what you quote. The
rubric says what earns full credit, what earns half, and what earns none.

## 1. Another fix, one per qualifying entry: `p-ps5-<uniq>-alt-<k>`

An entry qualifies when `generated/entries.txt` says so: it has one line per entry, in record
order, `Entry <k>, numbered <n>: qualifies` or `Entry <k>, numbered <n>: does not qualify`, from
the grader's own reading of the record. `<k>` is the entry's position in `CHANGES.md` and `<n>`
is the number on its heading; two entries can share a number, never a position. Do not decide
it yourself from the entry's fields. The id carries the position, `<k>`.

Quote the entry's "What was wrong (my own words)" part and its `What changed` line. Propose one
plausible alternative fix, preferably in a different place than theirs:

- a diagram change where they edited a skill,
- a skill rule where they added a step to the diagram,
- a program check where they relied on the agent's judgment.

End with this question, word for word: "Is the fix you made better than that alternative, worse,
or about the same? Justify your answer." Do not ask why they chose their fix: they may never
have weighed the alternative. The alternative must be one a thoughtful
student could really have chosen, not a strawman, and it must not be what they did; read the
entry's `Changed` line and the skill or diagram it names to be sure.

**Never quote the entry's "Why this fix (my own words)" part**, and do not cite its lines. It is
the answer to the question. Read it to write `expected`, which may draw on it.

The rubric credits a real trade-off grounded in their workflow or its inputs, in either
direction. It does not require that their choice was the better one: a student who says the
alternative would have been better, and why, earns full credit, and so does one who says neither
is clearly better because each has a real trade-off tied to this workflow. Half credit for a trade-off
that is true of fixes in general but not tied to this workflow. No credit for restating what
they changed.

## 2. Defend a lane, one per student: `p-ps5-<uniq>-lane`

`generated/diagram.txt` has one line per step, `<lane>: <step name> (<type>)`, then the start
events and the flows. An indented `  documentation:` line under a step is the student's note on
that step, not a step. `Start:` and `Flow:` lines are not lanes, and a step under `(no lane)` is
in no lane, so it has no lane to defend. Quote one step's line, not its documentation line, and
cite that line of `generated/diagram.txt`. Prefer a step in the agent's lane, or a step in the
person's lane that a program could plausibly do. Name one other lane and ask what would go
wrong if the step moved there.

The rubric credits a consequence specific to that step's inputs: what the step reads, what
varies from one input to the next, and what the new lane would do with that variation. A
consequence true of any step ("programs are less flexible", "people are slower") earns half
credit at most. Skip this candidate when the file has no step lines.

## 3. Prompt injection, one per student: `p-ps5-<uniq>-injection`

From the skills and programs, find two things: the untrusted text the agent reads (posting
bodies, fetched pages, emails, saved files that came from elsewhere), and what the agent can do
while reading it (write files, run commands, reach the network, change the student's tracker).
Quote the skill or program lines that show both. Ask whether the workflow, as built on their
laptop, is safe from an instruction planted in one of those inputs, and why.

The question is about the workflow as it runs on the student's laptop, not about agents in
general and not about a hosted version they did not build.

The rubric credits naming the untrusted input and tying the risk to what the agent can actually
do. "Safe, because the agent can only write one output file" earns full credit when that is true
of their workflow. Where you cannot tell from the files what the agent can do (a skill run by
hand in a session with the student's usual permissions, say), `expected` says so, and the rubric
credits an answer that reasons about what that session is allowed to do. No credit for "safe,
because the inputs are trustworthy" when they come from outside.

## Rules for every question

- A student with no qualifying entry gets kinds 2 and 3 only.
- The question must be answerable from the prompt and the student's own understanding. Never
  ask them to enumerate what they cannot see, such as every step in their diagram or every rule
  in a skill.
- Address the student as "you". If a question needs to name who teaches the course, say "the
  instructor".
- The prompt is read on paper in class. Quote a few lines, not a whole file, and keep the
  question itself to one or two sentences.
