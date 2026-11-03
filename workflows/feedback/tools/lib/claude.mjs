// Read a Claude Code transcript into entries.
//
// THE HARNESS SPEAKS AS THE USER. Skill bodies, IDE selections, system reminders, subagent
// notifications, compaction summaries and interruption notices all arrive as `type: "user"`
// lines. Skill bodies are `isMeta`, summaries `isCompactSummary`, notifications and peer
// messages carry an `origin.kind` other than `human`; the rest are recognized by their opening
// text. A slash command arrives wrapped in
// `<command-name>` tags and is kept as what the student typed.
//
// A MULTIPLE-CHOICE ANSWER IS A TOOL RESULT. When the agent asks with AskUserQuestion, the
// student's choice comes back as the result of that call, so it is kept as their turn while
// every other tool result is dropped.
//
// SUBAGENTS WRITE UNDER THE SESSION'S OWN FOLDER (`<id>/subagents/`), so reading only one level
// below each project keeps them out of the candidates.

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readJsonl, toolLine } from "./entry.mjs";

const HARNESS_TEXT = ["<ide_", "<system-reminder>", "[Request interrupted"];

/** Every top-level session transcript in <home>/.claude/projects, with its modification time. */
export function claudeCandidates(home) {
  const root = join(home, ".claude", "projects");
  if (!existsSync(root)) return [];
  const out = [];
  for (const project of readdirSync(root, { withFileTypes: true })) {
    if (!project.isDirectory()) continue;
    const dir = join(root, project.name);
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      if (!f.isFile() || !f.name.endsWith(".jsonl")) continue;
      const path = join(dir, f.name);
      out.push({ path, mtimeMs: statSync(path).mtimeMs, harness: "Claude Code" });
    }
  }
  return out;
}

function typed(text) {
  const name = /<command-name>([\s\S]*?)<\/command-name>/.exec(text);
  if (!name) return text;
  const args = /<command-args>([\s\S]*?)<\/command-args>/.exec(text)?.[1].trim();
  return args ? `${name[1]} ${args}` : name[1];
}

const resultText = (content) =>
  typeof content === "string" ? content : (content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");

/** The transcript at `path` as entries, in order. */
export function readClaude(path) {
  const out = [];
  const asked = new Set();
  for (const r of readJsonl(path)) {
    if ((r.type !== "user" && r.type !== "assistant") || r.isMeta || r.isSidechain || r.isCompactSummary) continue;
    if (r.origin?.kind && r.origin.kind !== "human") continue;
    const content = r.message?.content;
    if (r.type === "user") {
      if (typeof content === "string") {
        out.push({ role: "student", text: typed(content) });
        continue;
      }
      const kept = [];
      for (const b of content ?? []) {
        if (b.type === "text" && !HARNESS_TEXT.some((s) => b.text.startsWith(s))) kept.push(typed(b.text));
        if (b.type === "tool_result" && asked.has(b.tool_use_id))
          out.push({ role: "student", text: `[answered: ${resultText(b.content)}]` });
      }
      if (kept.length) out.push({ role: "student", text: kept.join("\n\n") });
      continue;
    }
    for (const b of content ?? []) {
      if (b.type === "text") out.push({ role: "agent", text: b.text });
      else if (b.type === "tool_use" && b.name === "AskUserQuestion") {
        asked.add(b.id);
        out.push({ role: "agent", text: `[asked: ${(b.input?.questions ?? []).map((q) => q.question).join(" / ")}]` });
      } else if (b.type === "tool_use" && b.name === "Bash") out.push(toolLine(b.input?.command ?? ""));
      else if (b.type === "tool_use") out.push(toolLine(`${b.name} ${JSON.stringify(b.input ?? {})}`));
    }
  }
  return out;
}
