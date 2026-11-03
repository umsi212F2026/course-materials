import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { codexCandidates, readCodex } from "../lib/codex.mjs";
import { codexRollout, meta, userMsg, agentMsg } from "./fixtures.mjs";

test("the student's text, the agent's reply and a tool line come out in order", () => {
  const home = mkdtempSync(join(tmpdir(), "codex-"));
  const path = codexRollout(home, "a", [
    meta("vscode"),
    userMsg("# AGENTS.md instructions\n\n<INSTRUCTIONS>...", ["agents_md.instructions"]),
    userMsg("/learn\n", ["user.text"]),
    agentMsg("I'll start.", "commentary"),
    {
      type: "response_item",
      payload: { type: "custom_tool_call", input: 'text(await tools.exec_command({cmd:"node survey.mjs --dir /x"}))' },
    },
    { type: "response_item", payload: { type: "custom_tool_call_output", output: [{ type: "input_text", text: "lots" }] } },
    agentMsg("You have 12 goals due.", "final_answer"),
  ]);
  assert.deepEqual(readCodex(path), [
    { role: "student", text: "/learn\n" },
    { role: "agent", text: "I'll start." },
    { role: "tool", text: "[ran: node survey.mjs --dir /x]" },
    { role: "agent", text: "You have 12 goals due." },
  ]);
});

test("injected context is dropped by its opening text when kinds are missing", () => {
  const home = mkdtempSync(join(tmpdir(), "codex-"));
  const path = codexRollout(home, "a", [
    meta("vscode"),
    userMsg("# AGENTS.md instructions\n\nstuff"),
    userMsg("<environment_context>\n<cwd>/x</cwd>"),
    userMsg("<external_codex_apps_open_page>{}</external_codex_apps_open_page>"),
    userMsg("<user_instructions>be nice</user_instructions>"),
  ]);
  assert.deepEqual(readCodex(path), []);
});

test("a function_call with a cmd array is a tool line", () => {
  const home = mkdtempSync(join(tmpdir(), "codex-"));
  const path = codexRollout(home, "a", [
    meta("vscode"),
    { type: "response_item", payload: { type: "function_call", name: "shell", arguments: JSON.stringify({ cmd: ["git", "status"] }) } },
  ]);
  assert.deepEqual(readCodex(path), [{ role: "tool", text: "[ran: git status]" }]);
});

test("a long command is cut at 200 characters", () => {
  const home = mkdtempSync(join(tmpdir(), "codex-"));
  const cmd = "x".repeat(300);
  const path = codexRollout(home, "a", [
    meta("vscode"),
    { type: "response_item", payload: { type: "custom_tool_call", input: `exec({cmd:"${cmd}"})` } },
  ]);
  assert.equal(readCodex(path)[0].text.length, "[ran: ]".length + 200);
});

test("guardian rollouts are not candidates", () => {
  const home = mkdtempSync(join(tmpdir(), "codex-"));
  const keep = codexRollout(home, "a", [meta("vscode")]);
  codexRollout(home, "b", [meta({ subagent: { other: "guardian" } })]);
  const found = codexCandidates(home);
  assert.deepEqual(found.map((c) => [c.path, c.harness]), [[keep, "Codex"]]);
  assert.equal(typeof found[0].mtimeMs, "number");
});

test("no store means no candidates", () => {
  assert.deepEqual(codexCandidates(mkdtempSync(join(tmpdir(), "codex-"))), []);
});
