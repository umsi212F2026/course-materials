import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claudeCandidates, readClaude } from "../lib/claude.mjs";
import { claudeTranscript, cUser, cAgent } from "./fixtures.mjs";

const tmpHome = () => mkdtempSync(join(tmpdir(), "claude-"));

test("typed text, replies and a Bash line come out in order", () => {
  const path = claudeTranscript(tmpHome(), "s", [
    { type: "queue-operation" },
    cUser("Explain my tests"),
    cAgent([{ type: "thinking", thinking: "hmm" }, { type: "text", text: "Looking." }]),
    cAgent([{ type: "tool_use", id: "t1", name: "Bash", input: { command: "npm test" } }]),
    cUser([{ type: "tool_result", tool_use_id: "t1", content: "lots" }]),
    cAgent([{ type: "tool_use", id: "t2", name: "Read", input: { file_path: "/a.js" } }]),
    cAgent([{ type: "text", text: "Two fail." }]),
  ]);
  assert.deepEqual(readClaude(path), [
    { role: "student", text: "Explain my tests" },
    { role: "agent", text: "Looking." },
    { role: "tool", text: "[ran: npm test]" },
    { role: "tool", text: '[ran: Read {"file_path":"/a.js"}]' },
    { role: "agent", text: "Two fail." },
  ]);
});

test("meta lines, ide context and system reminders are dropped", () => {
  const path = claudeTranscript(tmpHome(), "s", [
    cUser("Base directory for this skill: /x", { isMeta: true }),
    cUser("side", { isSidechain: true }),
    cUser([{ type: "text", text: "<system-reminder>x</system-reminder>" }]),
    cUser([{ type: "text", text: "[Request interrupted by user for tool use]" }]),
    cUser([{ type: "text", text: "<ide_opened_file>f</ide_opened_file>" }, { type: "text", text: "approved." }]),
  ]);
  assert.deepEqual(readClaude(path), [{ role: "student", text: "approved." }]);
});

test("task notifications, peer messages and compaction summaries are not the student", () => {
  const path = claudeTranscript(tmpHome(), "s", [
    cUser("<task-notification>done</task-notification>", { origin: { kind: "task-notification" } }),
    cUser("This session is being continued from a previous conversation...", { isCompactSummary: true }),
    cUser("typed", { origin: { kind: "human" } }),
  ]);
  assert.deepEqual(readClaude(path), [{ role: "student", text: "typed" }]);
});

test("a slash command is its name and arguments", () => {
  const path = claudeTranscript(tmpHome(), "s", [
    cUser("<command-name>/learn</command-name>\n<command-args></command-args>"),
    cUser("<command-name>/quiz</command-name>\n<command-args>session 5</command-args>"),
  ]);
  assert.deepEqual(readClaude(path), [
    { role: "student", text: "/learn" },
    { role: "student", text: "/quiz session 5" },
  ]);
});

test("an AskUserQuestion round trip keeps the question and the answer", () => {
  const path = claudeTranscript(tmpHome(), "s", [
    cAgent([{ type: "tool_use", id: "q1", name: "AskUserQuestion", input: { questions: [{ question: "Which?" }, { question: "Why?" }] } }]),
    cUser([{ type: "tool_result", tool_use_id: "q1", content: [{ type: "text", text: 'User answered: "A"' }] }]),
  ]);
  assert.deepEqual(readClaude(path), [
    { role: "agent", text: "[asked: Which? / Why?]" },
    { role: "student", text: '[answered: User answered: "A"]' },
  ]);
});

test("subagent transcripts are not candidates", () => {
  const home = tmpHome();
  const keep = claudeTranscript(home, "abc", [cUser("hi")]);
  claudeTranscript(home, "abc/subagents/a", [cUser("hi")]);
  assert.deepEqual(claudeCandidates(home).map((c) => [c.path, c.harness]), [[keep, "Claude Code"]]);
});

test("no store means no candidates", () => {
  assert.deepEqual(claudeCandidates(tmpHome()), []);
});
