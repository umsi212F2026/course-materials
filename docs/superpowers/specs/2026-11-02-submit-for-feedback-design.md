# Submit a session for feedback

**Status:** design for review, 2026-11-02. Branch `submit-session`, local only until Paul says to
publish.

## Why

At the Oct 29 check-in students asked to "show your prompts and get coaching or maybe even
grading" and to "submit prompting sessions and get feedback". On Nov 3 Paul announces it as a
change coming this semester: optional, submit a tutoring session, get coaching on your prompting.
It has to work soon after the announcement, not by it.

## Decided

- **What gets submitted:** the session the student is in. They run the skill at the end of a
  tutoring session (or any session) and that session, as it stands at that moment, is what goes.
  No picker.
- **Harnesses:** Codex and Claude Code. Gemini is out until we know which Gemini students use;
  each harness has its own reader module so one can be added without touching the rest.
- **Where it goes:** a Canvas assignment, uploaded by the student. The skill never sends anything
  anywhere. Paul cannot see `learning-topics`, so the repo is not a route.
- **Format:** Markdown. Paul's review is agent-assisted and quotes the transcript directly, so
  the text must come out exact and turns must be citable by number. Canvas shows `.md` as plain
  text; coaching goes in the submission comments.
- **Contents:** the student's messages and the agent's replies verbatim; each tool call reduced to
  one line with no output.
- **The student's own question:** asked for, optional, placed at the top of the file.
- **Credit:** the skill says nothing about it. Points and limits live on the Canvas assignment and
  in Paul's announcement.
- **The skill is as small as it can be.** Mechanics live in a tool.

## Layout

```
workflows/feedback/
  skills/submit-for-feedback/SKILL.md
  tools/export-session.mjs
  tools/lib/codex.mjs
  tools/lib/claude.mjs
  tools/lib/redact.mjs
  tools/test/...
```

`AGENTS.md` gains a `submit-for-feedback` entry under Workflows.

## The tool: `export-session.mjs`

```
node workflows/feedback/tools/export-session.mjs [--question "<text>"] [--out <dir>] [--transcript <path>]
```

`--out` defaults to `~/Downloads`. Prints the absolute path of the file it wrote, and nothing
else on success.

### Finding the session

Each reader lists candidate transcripts in its store:

| harness     | store                                                   | working directory from         |
| ----------- | ------------------------------------------------------- | ------------------------------ |
| Codex       | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`          | `session_meta.payload.cwd`     |
| Claude Code | `~/.claude/projects/<cwd with / and . as ->/<id>.jsonl` | the `cwd` field on its entries |

The tool takes, across both stores, the most recently modified top-level transcript, provided it
was modified within the last 2 minutes. The session running the tool is being written as it
runs, so it is the newest. Working directory is not a test: Codex records the folder the session
started in, and the tools run from inside `course-materials`, which is a different folder.

Subagent transcripts are never candidates: Codex rollouts whose `session_meta.payload.source` is
an object (the auto-approval reviewer writes these, as `{subagent: ...}`), and anything under a
Claude Code session's `subagents/` folder.

If none qualifies it exits non-zero with a one-line reason and writes nothing. If the next newest
was modified within 10 seconds of the newest it exits non-zero rather than guess, naming both;
`--transcript <path>` then names the file outright. The plan verifies the rule with a real run in
each harness before anything depends on it.

### Extracting

Each reader turns its format into one list of entries: `{ role: "student" | "agent" | "tool",
text }`.

- **Kept, verbatim:** messages the student typed; the agent's text replies.
- **Reduced to one line:** each tool call, as `[ran: <command or tool name and short input>]`,
  input cut at 200 characters. Tool output is dropped, with one exception: in Claude Code a
  student who answers a multiple-choice question answers through a tool result, so an
  `AskUserQuestion` call and its result are kept as `[asked: ...]` and the student's
  `[answered: ...]`. That is the student's prompting too.
- **Dropped:** system and developer messages, injected context (AGENTS.md text, environment and
  app-context blocks, skill bodies), reasoning, token counts, and metadata.
- **The submit run itself:** the last two turns, which are the student asking to submit and the
  student answering the skill's question. The tool drops them by position, since the student's
  wording of the request varies.

A turn is one student message and everything up to the next one. Turns are numbered from 1.

### Redacting

A program pass over the extracted text, never a judgment:

- Key and token shapes (`sk-...`, `sk-ant-...`, `ghp_`/`gho_`/`github_pat_...`, `AKIA...`,
  `Bearer <token>`, `xox[bp]-...`), and any unbroken run of 40 or more base64 or hex characters,
  become `[redacted]`.
- The home directory path becomes `~`.

The header records how many redactions were made, so a reviewer knows something was there.

### Output

`<out>/si212-session-<YYYY-MM-DD>-<HHMM>.md`:

```markdown
# SI 212 session for feedback

- Date: 2026-11-05 14:12
- Harness: Codex
- Turns: 14
- Redactions: 1

## What I'd like feedback on

<the student's question, or "Nothing specific.">

## Transcript

### Turn 1 (you)

...

### Turn 1 (agent)

[ran: node workflows/learn/tools/survey.mjs --dir ~/...]

...
```

No student name: Canvas knows who submitted it.

## The skill

Two turns, nothing else.

1. **Ask.** One message, ending the turn, that says the session will be saved as a file in
   Downloads for them to read and then upload to Canvas, that only what they upload reaches Paul,
   and asks what they would like feedback on, or "skip". The explanation rides on the question
   because the agent needs the answer to proceed.
2. **Export and hand over.** Run the tool, which takes their answer from the transcript, where it
   is the last student message (`--question` overrides it). Then one final
   message, after all work, with nothing following it: the file's full path, the Canvas assignment
   link, the upload steps (open the link, Start Assignment, Upload File, choose the file, Submit
   Assignment), and that later sessions can be submitted to the same assignment. If the tool
   fails, that message says what it printed and offers to look into why. Paul does not debug
   it; the student works it out with their agent.

Both blocks are quoted in the skill, with the path and link inside the quote, per
`course-private/notes/skill-authoring.md`.

## Canvas assignment

https://umich.instructure.com/courses/878316/assignments/3338681, which goes in the skill. It
should be online upload, `.md` only, unlimited attempts, points to be decided. Feedback is a
submission comment that quotes turns by number.

## Testing

- Fixture transcripts for each harness, trimmed from real ones and scrubbed: extraction, turn
  numbering, dropping injected context and the submit run, tool-line formatting.
- Redaction: each pattern, the home path, the count.
- Finding: newest wins; subagent transcripts ignored; stale ignored; none and ambiguous both exit
  non-zero.
- A real run in Codex and in Claude Code before the skill is called done.

## Not doing

- Gemini or Antigravity.
- Choosing an earlier session.
- Uploading to Canvas from the tool.
- Any feedback tooling on Paul's side; that is course-private's business.
