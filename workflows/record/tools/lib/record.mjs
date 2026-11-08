// Read and write ps5/CHANGES.md, the student's change record.
//
// THIS FILE OWNS THE FORMAT. The skills, the check and the grader all go through parseRecord, so
// the headings and field labels below are the contract and are matched exactly. A student may
// still edit the file by hand, so parsing never throws: every departure from the format is a
// problem with a line number, and the rest of the file is still read.
//
// AN ATTESTATION IS A HASH OF THE PART IT FOLLOWS. The comment after an own-words part carries
// the first 12 hex digits of the SHA-256 of that part's trimmed text, so editing the words after
// the student said they wrote them makes it read stale, and the check asks again.

import { createHash } from "node:crypto";

const FIELDS = [
  ["changed", "Changed"],
  ["commit", "Commit"],
  ["promptedBy", "Prompted by"],
  ["whoNoticed", "Who noticed"],
  ["whoChose", "Who chose the fix"],
  ["whatChanged", "What changed"],
];

export const WHO_NOTICED = ["me", "the agent", "a classmate or Paul"];
export const WHO_CHOSE = ["me", "the agent, from my description", "me, from options the agent gave", "the agent"];

const PARTS = [
  ["noticed", "What I noticed was wrong (my own words)"],
  ["why", "Why I chose this fix (my own words)"],
];

const ENTRY_RE = /^## (\d+)\. (.+)$/;
const FIELD_RE = /^- \*\*([^*]+):\*\*\s?(.*)$/;
const ATTEST_RE = /^<!-- attested (\d{4}-\d{2}-\d{2}) sha256:([0-9a-f]{12}) -->$/;
const INITIAL_RE = /^Initial design:\s*(.*)$/;

/** First 12 hex digits of the SHA-256 of `text`, trimmed. */
export function partHash(text) {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 12);
}

/** Whether an entry belongs in the record: the spec's table, whose last row is agent and agent.
 *  A change prompted by design critique counts only when the student chose the fix. */
export function qualifies(entry) {
  const f = entry.fields;
  if (f.whoNoticed === "the agent" && f.whoChose === "the agent") return false;
  if (f.promptedBy === "design critique" && f.whoChose !== "me") return false;
  return true;
}

function validValue(key, value) {
  if (key === "changed") return value === "diagram" || /^skill \S+$/.test(value);
  if (key === "promptedBy") return value === "design critique" || /^a run on \S/.test(value);
  if (key === "whoNoticed") return WHO_NOTICED.includes(value);
  if (key === "whoChose") return WHO_CHOSE.includes(value);
  return value.length > 0;
}

/** `text` with Windows line endings made Unix ones. Git for Windows checks files out with
 *  CRLF by default, so a Windows student's record has them before anyone edits it. */
export const unixLines = (text) => text.replace(/\r\n/g, "\n");

/** The record in `text`. Never throws.
 *
 *  `initialLine` says whether the `Initial design:` line is `missing`, still the `placeholder`,
 *  or `set`, so a check can say which. */
export function parseRecord(text) {
  const lines = unixLines(text).split("\n");
  const problems = [];
  const entries = [];
  let initialDesign = null;
  let initialLine = "missing";

  // Top-level sections: the preamble, then one per `## ` heading.
  const starts = [];
  lines.forEach((l, i) => {
    if (l.startsWith("## ")) starts.push(i);
  });
  for (const l of lines.slice(0, starts[0] ?? lines.length)) {
    const m = INITIAL_RE.exec(l.trim());
    if (!m) continue;
    const value = m[1].trim().replace(/^`(.*)`$/, "$1");
    if (!value || /^<.*>$/.test(value)) initialLine = "placeholder";
    else {
      initialLine = "set";
      initialDesign = value;
    }
  }

  starts.forEach((start, k) => {
    const end = starts[k + 1] ?? lines.length;
    const m = ENTRY_RE.exec(lines[start]);
    if (!m) {
      problems.push({ line: start + 1, message: `"${lines[start]}" is not an entry heading, which looks like "## 1. <title>".` });
      return;
    }
    const n = Number(m[1]);
    if (entries.some((e) => e.n === n)) problems.push({ line: start + 1, message: `There is more than one entry ${n}. Renumber one of them.` });
    entries.push(parseEntry(lines, start, end, n, m[2].trim(), problems));
  });

  return { initialDesign, initialLine, entries, problems };
}

function parseEntry(lines, start, end, n, title, problems) {
  const fields = {};
  const partStarts = [];
  for (let i = start + 1; i < end; i++) if (lines[i].startsWith("### ")) partStarts.push(i);
  const fieldEnd = partStarts[0] ?? end;

  for (let i = start + 1; i < fieldEnd; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    const f = FIELD_RE.exec(l);
    const known = f && FIELDS.find(([, label]) => label === f[1]);
    if (!known) {
      problems.push({ line: i + 1, message: `Entry ${n} has a line that is not one of its fields: "${l}".` });
      continue;
    }
    fields[known[0]] = f[2].trim();
  }
  for (const [key, label] of FIELDS) {
    if (!(key in fields)) problems.push({ line: start + 1, message: `Entry ${n} is missing **${label}:**.` });
    else if (!validValue(key, fields[key]))
      problems.push({ line: start + 1, message: `Entry ${n} has a **${label}:** that is not one of the allowed answers: "${fields[key]}".` });
  }

  const parts = {};
  for (const [key, heading] of PARTS) {
    const at = partStarts.find((i) => lines[i] === `### ${heading}`);
    if (at === undefined) {
      problems.push({ line: start + 1, message: `Entry ${n} is missing its "### ${heading}" section.` });
      parts[key] = { line: start + 1, text: "", attestation: "missing" };
      continue;
    }
    const stop = partStarts.find((i) => i > at) ?? end;
    parts[key] = readPart(lines, at, stop);
  }
  return { n, title, line: start + 1, fields, parts };
}

function readPart(lines, at, stop) {
  const body = [];
  let hash = null;
  for (let i = at + 1; i < stop; i++) {
    const a = ATTEST_RE.exec(lines[i].trim());
    if (a) hash = a[2];
    else body.push(lines[i]);
  }
  const text = body.join("\n").trim();
  const attestation = hash === null ? "missing" : hash === partHash(text) ? "fresh" : "stale";
  return { line: at + 1, text, attestation };
}

/** One entry as Markdown, ending in a newline. */
export function renderEntry(n, { title, fields, parts }) {
  const out = [`## ${n}. ${title}`, ""];
  for (const [key, label] of FIELDS) out.push(`- **${label}:** ${fields[key] ?? ""}`);
  for (const [key, heading] of PARTS) {
    out.push("", `### ${heading}`, "");
    if (parts[key]) out.push(parts[key], "");
  }
  return out.join("\n").replace(/\n*$/, "\n");
}

/** The whole file with entry `n`'s `key` part rewritten as `body` lines after its heading. */
function replacePart(text, n, key, body) {
  text = unixLines(text);
  const lines = text.split("\n");
  const entry = parseRecord(text).entries.find((e) => e.n === n);
  if (!entry) throw new Error(`There is no entry ${n} in CHANGES.md.`);
  const part = entry.parts[key];
  const at = part.line - 1;
  if (!lines[at].startsWith("### ")) throw new Error(`Entry ${n} has no ${key} section.`);
  let stop = lines.length;
  for (let i = at + 1; i < lines.length; i++)
    if (lines[i].startsWith("## ") || lines[i].startsWith("### ")) {
      stop = i;
      break;
    }
  const region = [lines[at], "", ...body(part)];
  if (stop < lines.length) region.push("");
  return [...lines.slice(0, at), ...region, ...lines.slice(stop)].join("\n").replace(/\n*$/, "\n");
}

/** The whole file with entry `n`'s `key` part attested on `date`, replacing any old comment. */
export function setAttestation(text, n, key, date) {
  return replacePart(text, n, key, (part) => [...(part.text ? [part.text, ""] : []), `<!-- attested ${date} sha256:${partHash(part.text)} -->`]);
}

/** The whole file with entry `n`'s `key` part holding `words`, and no attestation.
 *
 *  A LINE THE PARSER WOULD READ AS STRUCTURE IS REFUSED, not escaped. A heading inside the
 *  student's words would split the entry, and changing their words to avoid it is exactly what
 *  this tool exists not to do. */
export function setPart(text, n, key, words) {
  const w = words.trim();
  if (w.split("\n").some((l) => /^#{1,3} /.test(l) || ATTEST_RE.test(l.trim())))
    throw new Error("Your answer has a line starting with #, which CHANGES.md reads as a heading. Answer again without one.");
  return replacePart(text, n, key, () => (w ? [w] : []));
}
