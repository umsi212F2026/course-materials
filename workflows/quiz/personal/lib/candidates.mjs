// The generator's reusable core: what makes a drafted question about one person's own work safe to
// ask, and how a few of them are chosen for a quiz.
//
// A CANDIDATE QUESTION MUST QUOTE WHAT IT IS ABOUT. Each evidence span has to exist verbatim in
// the file at the given sha, and every line of it has to appear in the prompt. The second rule
// is what makes a question answerable from the prompt alone. A candidate failing either is
// dropped with its reason, never repaired.
//
// A GENERATED FILE CAN BE CITED. validateCandidate takes an optional `generated` map of path to
// text, for text that is not in the repository (a rendered summary, say). Its evidence lines are
// checked against that text, but evidence.sha must still equal the graded sha.
//
// CHOOSING IS DETERMINISTIC. choosePersonal takes a base seed and appends `:personal:<kind>` for
// each kind, so the same seed gives the same choice for an unchanged kept set. One alt, one
// injection, never two of a kind: a kept lane question fills whichever of the two is missing, and
// a set left with fewer than two is reported short. pick and rng are the quiz bake's own, so a
// practice draw and a real draw use one generator.

import { execFileSync } from "node:child_process";

export const PERSONAL_RULE = "one kept alt and one kept injection, a kept lane filling whichever is missing, never two of a kind";

const KINDS = new Set(["alt", "lane", "injection"]);

function readAtSha(repoDir, sha, file) {
  try { return execFileSync("git", ["-C", repoDir, "show", `${sha}:${file}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
}

export function spanText(repoDir, sha, file, lines) {
  return linesOf(readAtSha(repoDir, sha, file), lines);
}

function linesOf(text, lines) {
  if (text == null) return null;
  const [a, b = a] = String(lines).split("-").map(Number);
  const all = text.split("\n");
  if (!(a >= 1) || b < a || b > all.length) return null;
  return all.slice(a - 1, b).join("\n");
}

const squash = (s) => s.replace(/\s+/g, " ").trim();

// A run of whitespace, including a line break, collapses to one space, so a quote may be typed
// without the source's exact spacing and may span a line break. lineOfChar tracks, for each
// character of the squashed text, which line of the original file it came from, so a match's
// start can be reported as the line the quote begins on.
function squashedWithLines(text) {
  const out = [];
  const lineOfChar = [];
  let line = 1, inRun = false;
  for (const ch of text) {
    if (/\s/.test(ch)) {
      if (!inRun) { out.push(" "); lineOfChar.push(line); inRun = true; }
      if (ch === "\n") line++;
    } else {
      out.push(ch); lineOfChar.push(line); inRun = false;
    }
  }
  let start = 0, end = out.length;
  while (start < end && out[start] === " ") start++;
  while (end > start && out[end - 1] === " ") end--;
  return { text: out.slice(start, end).join(""), lineOfChar: lineOfChar.slice(start, end) };
}

/** { line } for a verbatim quote in the file at the given sha, or null if it is not there. */
export function locateQuote(repoDir, sha, file, quote) {
  const text = readAtSha(repoDir, sha, file);
  if (text == null) return null;
  const target = squash(quote);
  if (!target) return null;
  const { text: hay, lineOfChar } = squashedWithLines(text);
  const idx = hay.indexOf(target);
  return idx === -1 ? null : { line: lineOfChar[idx] };
}

export function validateCandidate(c, { repoDir, sha, generated = {} }) {
  for (const f of ["id", "prompt", "expected", "rubric"]) if (!c[f] || typeof c[f] !== "string") return `${f} is missing`;
  if (c.type !== "free") return "type must be free";
  if (!Array.isArray(c.evidence) || !c.evidence.length) return "evidence is missing";
  const prompt = squash(c.prompt);
  for (const e of c.evidence) {
    if (e.sha !== sha) return `evidence sha ${e.sha} is not the graded sha ${sha}`;
    const text = Object.hasOwn(generated, e.file) ? linesOf(generated[e.file], e.lines) : spanText(repoDir, sha, e.file, e.lines);
    if (text == null || !text.trim()) return `${e.file} has no such lines ${e.lines} at ${sha.slice(0, 7)}`;
    for (const line of text.split("\n")) {
      if (line.trim() && !prompt.includes(squash(line))) return `quoted line "${line.trim().slice(0, 60)}" is not in the prompt`;
    }
  }
  return null;
}

const str = { type: "string" };

export const CANDIDATE_SCHEMA = {
  type: "object",
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: str, type: { type: "string", enum: ["free"] }, prompt: str, expected: str, rubric: str,
          evidence: {
            type: "array",
            items: { type: "object", properties: { file: str, lines: str, sha: str }, required: ["file", "lines", "sha"], additionalProperties: false },
          },
        },
        required: ["id", "type", "prompt", "expected", "rubric", "evidence"],
        additionalProperties: false,
      },
    },
    addressed: str,
  },
  required: ["candidates", "addressed"],
  additionalProperties: false,
};

/** The text with each line numbered from 1 as `<n>: <line>`, the form a drafting call is shown. */
export const numberLines = (text) => text.split("\n").map((l, i) => `${i + 1}: ${l}`).join("\n");

/** A quoted line's line-number prefix removed: `> 11: x` becomes `> x`, `11: x` becomes `x`. */
export const stripLineNumbers = (prompt) => prompt.replace(/^(> ?)?\d+:(?: |$)/gm, "$1");

/** The kind in `p-<ps>-<uniq>-<kind>[-<n>]`, or null when the id is not of that shape. */
export function kindOf(id, ps, uniq) {
  const prefix = `p-${ps}-${uniq}-`;
  if (!id.startsWith(prefix)) return null;
  const kind = id.slice(prefix.length).replace(/-\d+$/, "");
  return KINDS.has(kind) ? kind : null;
}

/** mulberry32, seeded from a string. Small, deterministic, and good enough for
 *  choosing a handful of items out of a hand-authored bank. */
export function rng(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(items, count, seed) {
  const next = rng(seed);
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/** The questions to append to one student's quiz, from their kept set. `seed` is the caller's base. */
export function choosePersonal(kept, seed) {
  const of = (kind) => kept.filter((k) => k.kind === kind);
  const one = (kind) => pick(of(kind), 1, `${seed}:personal:${kind}`)[0];
  let alt = one("alt");
  let injection = one("injection");
  const lane = one("lane");
  if (!alt && lane) alt = lane;
  else if (!injection && lane) injection = lane;
  const items = [alt, injection].filter(Boolean).map((k) => ({
    id: k.id,
    type: "free",
    prompt: stripLineNumbers(k.prompt),
    expected: k.expected,
    rubric: k.rubric,
  }));
  return { items, short: items.length < 2 };
}
