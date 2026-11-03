// Small hand-built transcripts in the two harnesses' formats, written under a temporary home.
// Only the fields the readers look at; real files carry much more.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const jsonl = (records) => records.map((r) => JSON.stringify(r)).join("\n") + "\n";

/** Write a Codex rollout at <home>/.codex/sessions/2026/11/05/rollout-<name>.jsonl. */
export function codexRollout(home, name, records) {
  const dir = join(home, ".codex", "sessions", "2026", "11", "05");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `rollout-${name}.jsonl`);
  writeFileSync(path, jsonl(records));
  return path;
}

export const meta = (source) => ({ type: "session_meta", payload: { source, cwd: "/x" } });

export const userMsg = (text, kinds) => ({
  type: "response_item",
  payload: {
    type: "message",
    role: "user",
    content: [{ type: "input_text", text }],
    ...(kinds ? { internal_chat_message_metadata_passthrough: { content_item_kinds: kinds } } : {}),
  },
});

export const agentMsg = (text, phase = "final_answer") => ({
  type: "response_item",
  payload: { type: "message", role: "assistant", phase, content: [{ type: "output_text", text }] },
});

/** Write a Claude Code transcript at <home>/.claude/projects/<project>/<name>.jsonl. */
export function claudeTranscript(home, name, records, project = "-x") {
  const dir = join(home, ".claude", "projects", project);
  mkdirSync(join(dir, name, ".."), { recursive: true });
  const path = join(dir, `${name}.jsonl`);
  writeFileSync(path, jsonl(records));
  return path;
}

export const cUser = (content, extra = {}) => ({ type: "user", message: { role: "user", content }, ...extra });
export const cAgent = (content) => ({ type: "assistant", message: { role: "assistant", content } });
