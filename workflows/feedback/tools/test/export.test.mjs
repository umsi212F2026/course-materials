import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { findSession, toTurns, render, exportSession, harnessFor } from "../export-session.mjs";
import { codexRollout, meta, userMsg, agentMsg } from "./fixtures.mjs";

const NOW = 1_800_000_000_000;
const cand = (path, ageMs) => ({ path, mtimeMs: NOW - ageMs, harness: "Codex" });

test("the newest fresh candidate wins", () => {
  assert.deepEqual(findSession([cand("/old", 60_000), cand("/new", 1_000)], NOW), { path: "/new", harness: "Codex" });
});

test("stale candidates are ignored", () => {
  assert.throws(() => findSession([cand("/a", 121_000)], NOW), { message: "No session transcript was written in the last 2 minutes." });
});

test("two within 10 seconds is ambiguous and names both", () => {
  assert.throws(
    () => findSession([cand("/a", 1_000), cand("/b", 9_000)], NOW),
    { message: "Two sessions are active: /a and /b. Rerun with --transcript <path>." }
  );
});

test("no candidates throws the no-session message", () => {
  assert.throws(() => findSession([], NOW), { message: "No session transcript was written in the last 2 minutes." });
});

const S = (text) => ({ role: "student", text });
const A = (text) => ({ role: "agent", text });

test("turns are numbered and the submit run is dropped", () => {
  const entries = [A("preamble"), S("one"), A("r1"), S("two"), { role: "tool", text: "[ran: ls]" }, A("r2"), S("three"), S("submit"), A("q?"), S("skip")];
  assert.deepEqual(toTurns(entries), [
    { n: 1, student: ["one"], agent: ["r1"] },
    { n: 2, student: ["two"], agent: ["[ran: ls]", "r2"] },
    { n: 3, student: ["three"], agent: [] },
  ]);
});

test("a session shorter than the submit run gives zero turns", () => {
  const turns = toTurns([S("submit this")]);
  assert.deepEqual(turns, []);
  assert.match(render({ when: new Date(2026, 10, 5, 14, 2), harness: "Codex", question: "", turns, redactions: 0 }), /^- Turns: 0$/m);
});

test("render matches the spec layout", () => {
  const out = render({
    when: new Date(2026, 10, 5, 14, 2),
    harness: "Claude Code",
    question: " Skip ",
    turns: [{ n: 1, student: ["Explain this"], agent: ["[ran: ls]", "Here it is."] }],
    redactions: 2,
  });
  assert.equal(
    out,
    `# SI 212 session for feedback

- Date: 2026-11-05 14:02
- Harness: Claude Code
- Turns: 1
- Redactions: 2

## What I'd like feedback on

Nothing specific.

## Transcript

### Turn 1 (you)

Explain this

### Turn 1 (agent)

[ran: ls]

Here it is.
`
  );
});

test("exportSession writes a redacted file into a Downloads folder it creates", () => {
  const home = mkdtempSync(join(tmpdir(), "export-"));
  codexRollout(home, "s", [
    meta("vscode"),
    userMsg(`my key is ${"sk-" + "abcdefghijklmnopqrstuvwx"} in ${home}/si212`, ["user.text"]),
    agentMsg("Do not paste keys."),
    userMsg("submit this for feedback", ["user.text"]),
    agentMsg("What would you like feedback on?"),
    userMsg("skip", ["user.text"]),
  ]);
  const path = exportSession({ home, now: new Date(), question: "Was I clear?" });
  assert.equal(dirname(path), join(home, "Downloads"));
  assert.ok(existsSync(path));
  const text = readFileSync(path, "utf8");
  assert.match(text, /\[redacted\]/);
  assert.match(text, /^- Redactions: 1$/m);
  assert.match(text, /~\/si212/);
  assert.ok(!text.includes(home));
  assert.match(text, /^- Harness: Codex$/m);
  assert.match(text, /^Was I clear\?$/m);
  assert.ok(!text.includes("submit this for feedback"));
});

test("a named transcript's harness is read from either slash", () => {
  assert.equal(harnessFor("C:/Users/kim/.codex/sessions/2026/11/05/rollout-a.jsonl"), "Codex");
  assert.equal(harnessFor("C:\\Users\\kim\\.codex\\sessions\\rollout-a.jsonl"), "Codex");
  assert.equal(harnessFor("/Users/kim/.claude/projects/-x/a.jsonl"), "Claude Code");
});

test("the question is the student's last message, exactly, when none is passed", () => {
  const home = mkdtempSync(join(tmpdir(), "export-"));
  codexRollout(home, "s", [
    meta("vscode"),
    userMsg("help me deploy", ["user.text"]),
    agentMsg("Done."),
    userMsg("submit this", ["user.text"]),
    agentMsg("What would you like feedback on?"),
    userMsg("Was asking for `$5` hosting too vague?\n", ["user.text"]),
  ]);
  const text = readFileSync(exportSession({ home, now: new Date() }), "utf8");
  assert.match(text, /^Was asking for `\$5` hosting too vague\?$/m);
  assert.match(text, /^- Turns: 1$/m);
});
