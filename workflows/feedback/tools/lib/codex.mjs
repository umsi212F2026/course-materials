// Read a Codex rollout into entries.
//
// A ROLLOUT IS MOSTLY NOT THE CONVERSATION. Codex stores its system prompt, the whole of
// AGENTS.md, app context and every tool's output in the same file as the student's words, and
// marks AGENTS.md and the environment as `role: "user"`. What tells them apart is
// `content_item_kinds`, which only real typing has as all `user.text`. Where that metadata is
// missing, the injected blocks still open with fixed text, so that is the fallback.
//
// THE AUTO-APPROVAL REVIEWER WRITES ITS OWN ROLLOUTS, beside the session it reviews, and can be
// the newest file in the store. Its `session_meta.payload.source` is an object
// (`{ subagent: ... }`) where a session's own is a string, so it is never a candidate.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { readJsonl, toolLine } from "./entry.mjs";

const INJECTED = ["# AGENTS.md instructions", "<environment_context>", "<external_codex_apps_open_page>", "<user_instructions>"];

const subdirs = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(dir, d.name)) : []);

/** Every session rollout in <home>/.codex/sessions, with its modification time. */
export function codexCandidates(home) {
  const out = [];
  for (const year of subdirs(join(home, ".codex", "sessions")))
    for (const month of subdirs(year))
      for (const day of subdirs(month))
        for (const name of readdirSync(day)) {
          if (!/^rollout-.*\.jsonl$/.test(name)) continue;
          const path = join(day, name);
          const first = readFileSync(path, "utf8").split("\n", 1)[0];
          let source;
          try {
            source = JSON.parse(first).payload?.source;
          } catch {
            continue;
          }
          if (typeof source !== "string") continue;
          out.push({ path, mtimeMs: statSync(path).mtimeMs, harness: "Codex" });
        }
  return out;
}

const joined = (content, type) => (content ?? []).filter((c) => c.type === type).map((c) => c.text).join("");

function command(input) {
  const m = /cmd:\s*"((?:[^"\\]|\\.)*)"/.exec(input);
  if (!m) return input;
  try {
    return JSON.parse(`"${m[1]}"`);
  } catch {
    return m[1];
  }
}

function isTyped(p, text) {
  const kinds = p.internal_chat_message_metadata_passthrough?.content_item_kinds;
  if (kinds && kinds.some((k) => k !== "user.text")) return false;
  return !INJECTED.some((start) => text.startsWith(start));
}

/** The rollout at `path` as entries, in order. */
export function readCodex(path) {
  const out = [];
  for (const r of readJsonl(path)) {
    if (r.type !== "response_item") continue;
    const p = r.payload ?? {};
    if (p.type === "message" && p.role === "user") {
      const text = joined(p.content, "input_text");
      if (isTyped(p, text)) out.push({ role: "student", text });
    } else if (p.type === "message" && p.role === "assistant") {
      out.push({ role: "agent", text: joined(p.content, "output_text") });
    } else if (p.type === "custom_tool_call") {
      out.push(toolLine(command(String(p.input ?? ""))));
    } else if (p.type === "function_call") {
      let args = {};
      try {
        args = JSON.parse(p.arguments ?? "{}");
      } catch {}
      const cmd = Array.isArray(args.cmd) ? args.cmd.join(" ") : args.cmd;
      out.push(toolLine(cmd ?? p.name));
    }
  }
  return out;
}
