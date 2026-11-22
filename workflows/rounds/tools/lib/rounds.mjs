// Read and write ROUNDS.md, the student's record of two rounds (spec, plan, implementation).
//
// THIS FILE OWNS THE FORMAT. The skills, the check and the grader all go through parseRounds, so
// the headings and field labels below are the contract and are matched exactly. A student may
// still edit the file by hand, so parsing never throws: every departure from the format is a
// problem with a line number, and the rest of the file is still read.
//
// It is a sibling of record.mjs and shares its hash and part-rewriting code. An attestation is
// the same thing here: a hash of the own-words part it follows, so editing the words afterward
// makes it read stale.

import { ATTEST_RE, partHash, replacePart, unixLines } from "../../../record/tools/lib/record.mjs";

const FIELDS = [
  ["spec", "Spec"],
  ["plan", "Plan"],
  ["commits", "Commits"],
];

const PARTS = [
  ["new", "What's new (my own words)"],
  ["why", "Why next (my own words)"],
];

const ROUND_RE = /^## (\d+)\. (.+)$/;
const FIELD_RE = /^- \*\*([^*]+):\*\*\s?(.*)$/;
const BASE_RE = /^Base:\s*(.*)$/;
const HASH_RE = /^[0-9a-f]{4,40}$/i;

/** `{ first, last }` for `a..b` or a single hash, or null when `value` is neither. */
export function splitCommits(value) {
  const v = String(value ?? "").trim();
  const [first, last, ...rest] = v.split("..").map((s) => s.trim());
  if (rest.length) return null;
  if (last === undefined) return HASH_RE.test(first) ? { first, last: first } : null;
  return HASH_RE.test(first) && HASH_RE.test(last) ? { first, last } : null;
}

function validValue(key, value) {
  if (key === "commits") return splitCommits(value) !== null;
  return value.length > 0;
}

/** The rounds in `text`. Never throws.
 *
 *  `baseLine` says whether the `Base:` line is `missing`, still the `placeholder`, or `set`, so a
 *  check can say which. */
export function parseRounds(text) {
  const lines = unixLines(text).split("\n");
  const problems = [];
  const rounds = [];
  let base = null;
  let baseLine = "missing";

  const starts = [];
  lines.forEach((l, i) => {
    if (l.startsWith("## ")) starts.push(i);
  });
  for (const l of lines.slice(0, starts[0] ?? lines.length)) {
    const m = BASE_RE.exec(l.trim());
    if (!m) continue;
    const value = m[1].trim().replace(/^`(.*)`$/, "$1");
    if (!value || /^<.*>$/.test(value)) baseLine = "placeholder";
    else {
      baseLine = "set";
      base = value;
    }
  }

  starts.forEach((start, k) => {
    const end = starts[k + 1] ?? lines.length;
    const m = ROUND_RE.exec(lines[start]);
    if (!m) {
      problems.push({ line: start + 1, message: `"${lines[start]}" is not a round heading, which looks like "## 1. <title>".` });
      return;
    }
    const n = Number(m[1]);
    if (rounds.some((r) => r.n === n)) problems.push({ line: start + 1, message: `There is more than one round ${n}. Renumber one of them.` });
    rounds.push(parseRound(lines, start, end, n, m[2].trim(), problems));
  });

  return { base, baseLine, rounds, problems };
}

function parseRound(lines, start, end, n, title, problems) {
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
      problems.push({ line: i + 1, message: `Round ${n} has a line that is not one of its fields: "${l}".` });
      continue;
    }
    fields[known[0]] = f[2].trim();
  }
  for (const [key, label] of FIELDS) {
    if (!(key in fields)) problems.push({ line: start + 1, message: `Round ${n} is missing **${label}:**.` });
    else if (!validValue(key, fields[key]))
      problems.push({ line: start + 1, message: `Round ${n} has a **${label}:** that is not usable: "${fields[key]}".` });
  }

  const parts = {};
  for (const [key, heading] of PARTS) {
    const at = partStarts.find((i) => lines[i] === `### ${heading}`);
    if (at === undefined) {
      problems.push({ line: start + 1, message: `Round ${n} is missing its "### ${heading}" section.` });
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

/** One round as Markdown, ending in a newline. */
export function renderRound(n, { title, fields, parts }) {
  const out = [`## ${n}. ${title}`, ""];
  for (const [key, label] of FIELDS) out.push(`- **${label}:** ${fields[key] ?? ""}`);
  for (const [key, heading] of PARTS) {
    out.push("", `### ${heading}`, "");
    if (parts[key]) out.push(parts[key], "");
  }
  return out.join("\n").replace(/\n*$/, "\n");
}

const roundsOf = (text) => parseRounds(text).rounds;

/** The whole file with round `n`'s `key` part attested on `date`, replacing any old comment. */
export function setRoundAttestation(text, n, key, date) {
  return replacePart(
    text,
    n,
    key,
    (part) => [...(part.text ? [part.text, ""] : []), `<!-- attested ${date} sha256:${partHash(part.text)} -->`],
    roundsOf,
    "ROUNDS.md",
  );
}

/** The whole file with round `n`'s `key` part holding `words`, and no attestation.
 *
 *  A LINE THE PARSER WOULD READ AS STRUCTURE IS REFUSED, not escaped. A heading inside the
 *  student's words would split the round, and changing their words to avoid it is exactly what
 *  this tool exists not to do. */
export function setRoundPart(text, n, key, words) {
  const w = words.trim();
  if (w.split("\n").some((l) => /^#{1,3} /.test(l) || ATTEST_RE.test(l.trim())))
    throw new Error("Your answer has a line starting with #, which ROUNDS.md reads as a heading. Answer again without one.");
  return replacePart(text, n, key, () => (w ? [w] : []), roundsOf, "ROUNDS.md");
}
