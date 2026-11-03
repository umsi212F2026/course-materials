// What both readers produce: an Entry is { role: "student" | "agent" | "tool", text }.

import { readFileSync } from "node:fs";

export const TOOL_INPUT_LIMIT = 200;

/** Every parseable line of a JSONL file. A line being written as we read is skipped. */
export function readJsonl(path) {
  const out = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {}
  }
  return out;
}

/** A tool call as one line, input cut so a long heredoc does not swamp the transcript. */
export const toolLine = (input) => ({ role: "tool", text: `[ran: ${String(input).slice(0, TOOL_INPUT_LIMIT)}]` });
