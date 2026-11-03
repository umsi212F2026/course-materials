# Submit for Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A student runs `submit-for-feedback` at the end of a Codex or Claude Code session and
gets a cleaned, numbered Markdown transcript of that session in Downloads, plus the steps to
upload it to Canvas.

**Architecture:** One CLI tool, `export-session.mjs`, finds the running session's transcript,
reads it through a per-harness reader into a common entry list, groups entries into numbered
turns, redacts, and writes the file. A two-turn skill asks the student's question, runs the tool,
and hands over.

**Tech Stack:** Node ESM (`.mjs`), `node:test`, no dependencies.

**Spec:** `docs/superpowers/specs/2026-11-02-submit-for-feedback-design.md`

## Global Constraints

- No em or en dashes anywhere: code, comments, output, skill, commit messages. American spelling.
- No dependencies beyond Node's standard library.
- Tests run from the repo root: `/opt/homebrew/bin/node --test 'workflows/*/tools/test/*.test.mjs'`.
- Tests never read the real `~/.codex` or `~/.claude`: every function that touches a store takes
  `home` as a parameter, and tests build fixtures under `mkdtempSync(join(tmpdir(), ...))`.
- Tool input in a `[ran: ...]` line is cut at 200 characters.
- Freshness window 2 minutes (120000 ms); ambiguity window 10 seconds (10000 ms).
- Output name `si212-session-<YYYY-MM-DD>-<HHMM>.md`, local time; default directory
  `<home>/Downloads`.
- Canvas URL: `https://umich.instructure.com/courses/878316/assignments/3338681`.
- Comment style: match `workflows/quiz/tools/quiz-practice.mjs` (a header block saying why, and
  capitalized lead-ins only where a decision needs defending).

## Review Focus

1. **Windows paths.** Home is `C:\Users\name`, and transcripts may carry it with backslashes;
   redaction must replace that form too. Pinned in Task 1.
2. **`~/Downloads` missing** (a fresh Linux account, a redirected folder). Create it rather than
   fail. Pinned in Task 4.
3. **A session with fewer than three turns** (student runs the skill first thing). Dropping two
   turns must leave an empty transcript and still write the file, saying "Turns: 0". Pinned in
   Task 4.
4. **Two sessions open at once** (a student with two Codex windows). Must exit non-zero and name
   both, never pick one silently. Pinned in Task 4.
5. **A Codex rollout with no `content_item_kinds`** (older or newer Codex). Injected context must
   still be dropped by its opening text. Pinned in Task 2.

---

### Task 1: Redaction

**Files:**
- Create: `workflows/feedback/tools/lib/redact.mjs`
- Test: `workflows/feedback/tools/test/redact.test.mjs`

**Interfaces:**
- Produces: `redact(text: string, home: string) -> { text: string, count: number }`. `count`
  counts secret replacements only, not home-path replacements.

- [ ] **Step 1: Write the failing tests**

```js
test("each key shape becomes [redacted] and is counted", () => {
  for (const s of ["sk-" + "abcdefghijklmnopqrstuvwx", "sk-ant-" + "api03-abcdefghijklmnopqrst",
    "ghp_" + "abcdefghijklmnopqrstuvwxyz0123456789", "github_pat_" + "11ABCDEFG0123456789_abcdefghij",
    "AKIA" + "ABCDEFGHIJKLMNOP", "xoxb-" + "1234567890-abcdefghij", "Bearer abc.def.ghi1234567890"]) {
    const r = redact(`key ${s} here`, "/Users/kim");
    assert.equal(r.text, "key [redacted] here", s);
    assert.equal(r.count, 1, s);
  }
});
test("a run of 40+ base64 or hex characters is redacted", () => {
  assert.equal(redact("x " + "a1B2".repeat(10) + " y", "/h").text, "x [redacted] y");
});
test("a 39-character run and ordinary prose are left alone", () => {
  const s = "a".repeat(39) + " skip the sk- prefix talk";
  assert.deepEqual(redact(s, "/h"), { text: s, count: 0 });
});
test("the home path becomes ~ and is not counted", () => {
  assert.deepEqual(redact("cd /Users/kim/si212", "/Users/kim"), { text: "cd ~/si212", count: 0 });
});
test("a Windows home with either slash becomes ~", () => {
  assert.equal(redact("C:\\Users\\kim\\si212 and C:/Users/kim/x", "C:\\Users\\kim").text, "~\\si212 and ~/x");
});
```

- [ ] **Step 2: Run** `/opt/homebrew/bin/node --test workflows/feedback/tools/test/redact.test.mjs`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement `redact` in `lib/redact.mjs`.** Secret patterns first (each `replace`
  callback increments the count), then the home path in both slash forms via a literal (escaped)
  pattern. Long-run pattern: `/\b[A-Za-z0-9+/=_-]{40,}\b/g`, applied after the named shapes.

- [ ] **Step 4: Run** the same command. Expected: PASS.

- [ ] **Step 5: Commit** `git add workflows/feedback/tools/lib/redact.mjs workflows/feedback/tools/test/redact.test.mjs` and `git commit -m "Submit for feedback: redact keys, tokens and the home path"`.

### Task 2: Codex reader

**Files:**
- Create: `workflows/feedback/tools/lib/codex.mjs`
- Test: `workflows/feedback/tools/test/codex.test.mjs`

**Interfaces:**
- Produces:
  - `Entry = { role: "student" | "agent" | "tool", text: string }` (shared with Task 3).
  - `codexCandidates(home: string) -> Array<{ path, mtimeMs, harness: "Codex" }>`: every
    `<home>/.codex/sessions/*/*/*/rollout-*.jsonl` whose first line's `payload.source` is a
    string. Missing store returns `[]`.
  - `readCodex(path: string) -> Entry[]`.

Rules for `readCodex`, over `type: "response_item"` records in order:
- `payload.type === "message"`, `role === "user"`: student, text is the joined `input_text`
  parts, **unless** `internal_chat_message_metadata_passthrough.content_item_kinds` exists and
  contains anything other than `"user.text"`, **or** the text starts with `# AGENTS.md
  instructions`, `<environment_context>`, `<external_codex_apps_open_page>` or `<user_instructions>`.
- `role === "assistant"`: agent, joined `output_text`. Both phases (`commentary`,
  `final_answer`) are kept.
- `role === "developer"` / `"system"`: dropped.
- `custom_tool_call`: tool, `[ran: X]` where X is the first `cmd:"..."` string in `input`
  (JSON-unescaped) if there is one, else `input`, cut to 200 characters.
- `function_call`: tool, `[ran: X]` where X is `JSON.parse(arguments).cmd` (joined with spaces
  if an array) if present, else `name`, cut to 200.
- Everything else, including tool outputs: dropped.

- [ ] **Step 1: Write the failing tests.** A helper writes a rollout from an array of records
  into `<tmp>/.codex/sessions/2026/11/05/rollout-...jsonl`. Tests:
  - `"the student's text, the agent's reply and a tool line come out in order"`: records for
    AGENTS.md injection (with kinds `["agents_md.instructions"]`), a `user.text` "/learn", an
    assistant commentary, a `custom_tool_call` with input `text(await tools.exec_command({cmd:"node survey.mjs --dir /x"}))`,
    its `custom_tool_call_output`, an assistant final_answer. Assert `deepEqual` to
    `[{student,"/learn"},{agent,...},{tool,"[ran: node survey.mjs --dir /x]"},{agent,...}]`.
  - `"injected context is dropped by its opening text when kinds are missing"`: user messages
    starting `# AGENTS.md instructions` and `<environment_context>` with no metadata produce no
    entries.
  - `"a long command is cut at 200 characters"`: a 300-character cmd gives a `text` of length
    `"[ran: ]".length + 200`.
  - `"guardian rollouts are not candidates"`: two files, one with `source: "vscode"`, one with
    `source: { subagent: { other: "guardian" } }`; `codexCandidates` returns only the first.
  - `"no store means no candidates"`: `codexCandidates(emptyTmp)` is `[]`.

- [ ] **Step 2: Run** `/opt/homebrew/bin/node --test workflows/feedback/tools/test/codex.test.mjs`. Expected: FAIL.

- [ ] **Step 3: Implement** `codexCandidates` and `readCodex` in `lib/codex.mjs`, reading lines
  with `readFileSync(...).split("\n")` and skipping blank or unparseable lines.

- [ ] **Step 4: Run** the same command. Expected: PASS.

- [ ] **Step 5: Commit** both files: `"Submit for feedback: read a Codex rollout"`.

### Task 3: Claude Code reader

**Files:**
- Create: `workflows/feedback/tools/lib/claude.mjs`
- Test: `workflows/feedback/tools/test/claude.test.mjs`

**Interfaces:**
- Consumes: `Entry` from Task 2.
- Produces:
  - `claudeCandidates(home) -> Array<{ path, mtimeMs, harness: "Claude Code" }>`: every
    `<home>/.claude/projects/*/*.jsonl` (one level only, so `<id>/subagents/` never appears).
  - `readClaude(path) -> Entry[]`.

Rules for `readClaude`, over lines with `type` `"user"` or `"assistant"`, skipping `isMeta` and
`isSidechain`:
- User, `message.content` a string: student. If it contains `<command-name>X</command-name>`,
  the text is `X` plus ` ` plus the `<command-args>` content when non-empty.
- User, content a list: each `text` block is student text, except blocks starting `<ide_`,
  `<system-reminder>` or `[Request interrupted`; join kept blocks with a blank line, and emit
  nothing if none are kept. A `tool_result` block whose `tool_use_id` matches a remembered
  `AskUserQuestion` call is student text `[answered: <its text content>]`. Other tool results
  are dropped.
- Assistant: `text` blocks are agent; `thinking` is dropped; `tool_use` named `AskUserQuestion`
  is agent text `[asked: <questions[].question joined with " / ">]` and its id is remembered;
  `Bash` is `[ran: <input.command>]`; any other tool is `[ran: <name> <JSON.stringify(input)>]`;
  tool lines cut to 200.

- [ ] **Step 1: Write the failing tests**, fixtures as in Task 2 under `<tmp>/.claude/projects/-x/`:
  - `"typed text, replies and a Bash line come out in order"`.
  - `"meta lines, ide context and system reminders are dropped"`: an `isMeta` user line, and a
    list with an `<ide_opened_file>` block plus `approved.` yields only `{student,"approved."}`.
  - `"a slash command is its name and arguments"`: `<command-name>/learn</command-name><command-args></command-args>` yields `{student,"/learn"}`.
  - `"an AskUserQuestion round trip keeps the question and the answer"`.
  - `"subagent transcripts are not candidates"`: a file at `-x/<id>.jsonl` and one at
    `-x/<id>/subagents/a.jsonl`; only the first is returned.

- [ ] **Step 2: Run** `/opt/homebrew/bin/node --test workflows/feedback/tools/test/claude.test.mjs`. Expected: FAIL.

- [ ] **Step 3: Implement** in `lib/claude.mjs`.

- [ ] **Step 4: Run.** Expected: PASS.

- [ ] **Step 5: Commit**: `"Submit for feedback: read a Claude Code transcript"`.

### Task 4: The export tool

**Files:**
- Create: `workflows/feedback/tools/export-session.mjs`
- Test: `workflows/feedback/tools/test/export.test.mjs`

**Interfaces:**
- Consumes: `redact`, `codexCandidates`, `readCodex`, `claudeCandidates`, `readClaude`.
- Produces (exported for tests; the CLI runs only when the file is the entry point):
  - `findSession(candidates, nowMs) -> { path, harness }`; throws `Error` whose message is the
    one line the CLI prints. Messages: `"No session transcript was written in the last 2 minutes."`
    and `"Two sessions are active: <path1> and <path2>. Rerun with --transcript <path>."`
  - `toTurns(entries, drop = 2) -> Array<{ n, student: string[], agent: string[] }>`: a turn
    starts at each student entry; agent and tool entries before the first student entry are
    discarded; tool entries go into `agent`; the last `drop` turns are removed.
  - `render({ when: Date, harness, question, turns, redactions }) -> string`, the exact layout in
    the spec's Output section. An empty or `"skip"` question (case-insensitive, trimmed) renders
    `Nothing specific.`
  - `exportSession({ home, now, question, out, transcript }) -> string` (the written path):
    builds candidates (or uses `transcript`, inferring harness from whether the path contains
    `.codex`), reads, turns, renders the transcript section, redacts it, renders the whole with the
    count, creates `out` if missing, writes, returns the path.
- CLI: `--question`, `--out`, `--transcript`; prints the path on success; on error prints the
  message to stderr and exits 1.

- [ ] **Step 1: Write the failing tests**:
  - `"the newest fresh candidate wins"`, `"stale candidates are ignored"` (121 s old),
    `"two within 10 seconds is ambiguous and names both"` (message contains both paths),
    `"no candidates throws the no-session message"`.
  - `"turns are numbered and the submit run is dropped"`: five student entries with replies give
    turns 1 to 3.
  - `"a session shorter than the submit run gives zero turns"`: one student entry, `toTurns`
    returns `[]`, and `render` contains `- Turns: 0`.
  - `"render matches the spec layout"`: assert exact string for one turn, question "skip".
  - `"exportSession writes a redacted file into a Downloads folder it creates"`: a Codex fixture
    under a tmp home containing a fake `sk-` key and the home path; result file
    exists in `<home>/Downloads`, contains `[redacted]`, `- Redactions: 1`, `~/`, and not the
    home path.

- [ ] **Step 2: Run** `/opt/homebrew/bin/node --test workflows/feedback/tools/test/export.test.mjs`. Expected: FAIL.

- [ ] **Step 3: Implement** `export-session.mjs` with a header comment covering why the newest
  transcript is the running one and why cwd is not a test (the spec's Finding section).

- [ ] **Step 4: Run the whole suite**: `/opt/homebrew/bin/node --test 'workflows/*/tools/test/*.test.mjs'`. Expected: all pass.

- [ ] **Step 5: Commit**: `"Submit for feedback: the export tool"`.

### Task 5: The skill and its entry point

**Files:**
- Create: `workflows/feedback/skills/submit-for-feedback/SKILL.md`
- Modify: `AGENTS.md` Workflows list, after **quiz**, before **update**.

- [ ] **Step 1: Write the skill.** Frontmatter `name: submit-for-feedback`, and description:
  `Save the session you are in as a file the student uploads to Canvas for coaching on their prompting. Use when someone asks to submit this session, send it for feedback, or get coaching on how they prompted.`
  Body, in order: one paragraph saying what it is; **Operates on** (`course-materials` from
  `~/.codex/AGENTS.md`, the tool is run from inside it; nothing else); **What you do** with the two
  steps below; **Depends on** listing `export-session.mjs`. Exact copy for the two turns:

  Step 1, a message that ends the turn:

  > I'll save this session as a file in your Downloads folder so you can post it to Canvas for
  > coaching on your prompting. You'll read it first, and nothing leaves your computer until you
  > upload it.
  >
  > Is there anything in particular you'd like feedback on? For example, a moment where you
  > weren't sure how to ask for what you wanted. Or say "skip".

  Step 2: run `node workflows/feedback/tools/export-session.mjs --question "<their reply, verbatim>"`
  from inside `course-materials`. Do all work first; then send exactly one of these as the last
  thing in the turn, with nothing after it:

  > Your session is saved at:
  >
  > `<the path the tool printed>`
  >
  > Read it through before you send it. It has your messages and my replies, word for word. If
  > there's anything in it you'd rather not share, delete it from the file first.
  >
  > To send it:
  >
  > 1. Open https://umich.instructure.com/courses/878316/assignments/3338681
  > 2. Click **Start Assignment** (or **New Attempt** if you've sent one before).
  > 3. Under **Upload File**, choose the file above from your Downloads folder.
  > 4. Click **Submit Assignment**.
  >
  > You can send another session later the same way. Each one is kept.

  If the tool exits non-zero:

  > I couldn't save this session. The tool said: `<its message>`. Nothing was sent. Want me to
  > look into why?

  If the message names two sessions, the agent may rerun once with `--transcript` set to the one
  whose last student message is the reply it just received, before falling back to the failure
  block.

- [ ] **Step 2: Add the AGENTS.md entry** in the existing format:
  `- **submit-for-feedback** - Save the session you are in as a file to upload to Canvas for coaching on your prompting. Use when someone asks to submit a session or get feedback on how they prompted.` followed by the indented path `` `workflows/feedback/skills/submit-for-feedback/SKILL.md` ``.

- [ ] **Step 3: Run the three checks** from `course-private/notes/skill-authoring.md`: the
  quoted blocks alone give the whole experience; the step-1 explanation rides on the question the
  agent needs answered; nothing follows the step-2 block. `grep -cP "\x{2013}|\x{2014}"` on both files: 0.

- [ ] **Step 4: Commit**: `"Submit for feedback: the skill and its AGENTS.md entry"`.

### Task 6: Real runs (with Paul)

- [ ] **Step 1: Codex.** In Codex, open a session against the test data folder, do two or three
  exchanges, then ask to submit for feedback. Expected: the question arrives, the file lands in
  Downloads, its last turn is the exchange before the request, no guardian content, the final
  message is the step-2 block and nothing else.
- [ ] **Step 2: Claude Code.** The same in a fresh Claude Code session. Expected: as above, with
  `- Harness: Claude Code`.
- [ ] **Step 3:** Fix anything either run shows, with a test for it, and commit.
- [ ] **Step 4:** Paul uploads one file to the Canvas assignment to confirm `.md` is accepted and
  attempts are unlimited.
