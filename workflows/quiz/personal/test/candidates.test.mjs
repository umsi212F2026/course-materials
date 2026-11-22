import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  spanText, locateQuote, validateCandidate, numberLines, stripLineNumbers, CANDIDATE_SCHEMA,
  rng, pick, kindOf, choosePersonal, PERSONAL_RULE,
} from "../lib/candidates.mjs";

function repoWith(files) {
  const dir = mkdtempSync(join(tmpdir(), "cand-"));
  for (const [p, t] of Object.entries(files)) { mkdirSync(join(dir, p, ".."), { recursive: true }); writeFileSync(join(dir, p), t); }
  execFileSync("git", ["-C", dir, "init", "-q", "-b", "main"]);
  execFileSync("git", ["-C", dir, "add", "."]);
  execFileSync("git", ["-C", dir, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "i"]);
  return { dir, sha: execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() };
}

const REPORT = "# MovieLens analysis\n\n## Task 3\n\n| users | score |\n| --- | --- |\n| 12, 88 | 0.41 |\n| 3, 41 | 0.39 |\n";

test("spanText reads the committed lines", () => {
  const { dir, sha } = repoWith({ "ps1-data-analysis/report.md": REPORT });
  assert.equal(spanText(dir, sha, "ps1-data-analysis/report.md", "5-7"), "| users | score |\n| --- | --- |\n| 12, 88 | 0.41 |");
});

const NOTES = "# Report\n\n## Task 3. User pairs with shared viewing habits\n\n" +
  "The naive count favors heavy raters. Two users with niche tastes could share a high count\n" +
  "while still having a low proportion of movies in common. Jaccard fixes this.\n";

test("locateQuote finds a quote that spans a line break, whitespace collapsed, and reports its starting line", () => {
  const { dir, sha } = repoWith({ "report.md": NOTES });
  const loc = locateQuote(dir, sha, "report.md", "Two users with niche tastes could share a high count while still having a low proportion of movies in common.");
  assert.deepEqual(loc, { line: 5 });
});

test("locateQuote returns null for a quote that is not in the file", () => {
  const { dir, sha } = repoWith({ "report.md": NOTES });
  assert.equal(locateQuote(dir, sha, "report.md", "This sentence never appears."), null);
});

test("validateCandidate keeps a self-contained, grounded question and drops the others", () => {
  const { dir, sha } = repoWith({ "ps1-data-analysis/report.md": REPORT });
  const base = {
    id: "p-ps1-ada-1", type: "free", expected: "e", rubric: "r",
    evidence: [{ file: "ps1-data-analysis/report.md", lines: "5-8", sha }],
  };
  const good = { ...base, prompt: "Your report shows:\n\n| users | score |\n| --- | --- |\n|  12, 88 | 0.41 |\n| 3, 41 | 0.39 |\n\nWhy does 12, 88 rank first?" };
  assert.equal(validateCandidate(good, { repoDir: dir, sha }), null);

  const unquoted = { ...base, prompt: "Why does 12, 88 rank first in your table?" };
  assert.match(validateCandidate(unquoted, { repoDir: dir, sha }), /not in the prompt/);

  const invented = { ...good, evidence: [{ file: "ps1-data-analysis/report.md", lines: "40-44", sha }] };
  assert.match(validateCandidate(invented, { repoDir: dir, sha }), /no such lines/);

  const stale = { ...good, evidence: [{ ...good.evidence[0], sha: "0".repeat(40) }] };
  assert.match(validateCandidate(stale, { repoDir: dir, sha }), /sha/);

  assert.match(validateCandidate({ ...good, evidence: [] }, { repoDir: dir, sha }), /evidence/);
});

test("validateCandidate checks a generated file's lines against its text and still needs the graded sha", () => {
  const { dir, sha } = repoWith({ "a.md": "x\n" });
  const generated = { "generated/summary.md": "# Summary\nalpha 1\nbeta 2\ngamma 3\n" };
  const base = { id: "p-1", type: "free", expected: "e", rubric: "r", evidence: [{ file: "generated/summary.md", lines: "2-3", sha }] };
  const good = { ...base, prompt: "The summary says:\n\nalpha 1\nbeta 2\n\nWhy?" };
  assert.equal(validateCandidate(good, { repoDir: dir, sha, generated }), null);
  assert.match(validateCandidate({ ...base, prompt: "Why is alpha 1 there?" }, { repoDir: dir, sha, generated }), /is not in the prompt/);
  assert.match(validateCandidate({ ...good, evidence: [{ ...base.evidence[0], lines: "9-10" }] }, { repoDir: dir, sha, generated }), /no such lines/);
  assert.match(validateCandidate({ ...good, evidence: [{ ...base.evidence[0], sha: "0".repeat(40) }] }, { repoDir: dir, sha, generated }), /sha/);
  assert.match(validateCandidate(good, { repoDir: dir, sha }), /no such lines/);
});

test("numberLines numbers from 1 as `<n>: <line>`, and stripLineNumbers undoes it", () => {
  assert.equal(numberLines("a\nb\n\nc"), "1: a\n2: b\n3: \n4: c");
  assert.equal(stripLineNumbers(numberLines("a\nb")), "a\nb");
});

test("CANDIDATE_SCHEMA asks for candidates and addressed", () => {
  assert.deepEqual(CANDIDATE_SCHEMA.required, ["candidates", "addressed"]);
  assert.deepEqual(CANDIDATE_SCHEMA.properties.candidates.items.required, ["id", "type", "prompt", "expected", "rubric", "evidence"]);
});

test("kindOf reads alt, lane and injection", () => {
  assert.equal(kindOf("p-ps5-ada-alt-1", "ps5", "ada"), "alt");
  assert.equal(kindOf("p-ps5-ada-alt-2", "ps5", "ada"), "alt");
  assert.equal(kindOf("p-ps5-ada-lane", "ps5", "ada"), "lane");
  assert.equal(kindOf("p-ps5-ada-injection", "ps5", "ada"), "injection");
  assert.equal(kindOf("p-ps5-ada-other", "ps5", "ada"), null);
  assert.equal(kindOf("p-ps5-grace-alt-1", "ps5", "ada"), null);
});

test("stripLineNumbers removes \"> 11: \" and \"11: \" at a line start and nothing else", () => {
  assert.equal(stripLineNumbers("> 11: foo\n12: bar\n> 13: baz"), "> foo\nbar\n> baz");
  assert.equal(stripLineNumbers("see 11: here"), "see 11: here");
  assert.equal(stripLineNumbers("11:00 meeting"), "11:00 meeting");
  assert.equal(stripLineNumbers("> 11:00 meeting"), "> 11:00 meeting");
  assert.equal(stripLineNumbers("> 12:"), "> ");
  assert.equal(stripLineNumbers("> 11: a\n> 12:\n> 13: b"), "> a\n> \n> b");
  assert.equal(stripLineNumbers("11:00"), "11:00");
});

const k = (id, kind) => ({ id, kind, prompt: `> 3: ${id}`, expected: "e", rubric: "r" });

test("choosePersonal gives one alt and one injection", () => {
  const { items, short } = choosePersonal([k("a1", "alt"), k("a2", "alt"), k("i1", "injection"), k("l1", "lane")], "q:1:grace");
  assert.equal(items.length, 2);
  assert.equal(short, false);
  assert.ok(["a1", "a2"].includes(items[0].id));
  assert.equal(items[1].id, "i1");
  assert.deepEqual(Object.keys(items[0]), ["id", "type", "prompt", "expected", "rubric"]);
  assert.equal(items[0].type, "free");
  assert.equal(items[0].prompt, "> " + items[0].id);
});

test("choosePersonal fills a missing kind with a lane", () => {
  const { items, short } = choosePersonal([k("a1", "alt"), k("l1", "lane")], "s");
  assert.deepEqual(items.map((i) => i.id), ["a1", "l1"]);
  assert.equal(short, false);
  const r = choosePersonal([k("i1", "injection"), k("l1", "lane")], "s");
  assert.deepEqual(r.items.map((i) => i.id), ["l1", "i1"]);
});

test("choosePersonal never gives two lanes", () => {
  const { items, short } = choosePersonal([k("l1", "lane"), k("l2", "lane")], "s");
  assert.equal(items.length, 1);
  assert.equal(short, true);
});

test("choosePersonal is short when fewer than two", () => {
  assert.equal(choosePersonal([], "s").short, true);
  assert.deepEqual(choosePersonal([], "s").items, []);
  assert.equal(choosePersonal([k("a1", "alt")], "s").short, true);
  assert.equal(choosePersonal([k("a1", "alt"), k("a2", "alt")], "s").short, true);
});

test("the same seed gives the same choice, and the seed matters", () => {
  const kept = Array.from({ length: 12 }, (_, i) => k(`a${i}`, "alt")).concat([k("i1", "injection")]);
  assert.deepEqual(choosePersonal(kept, "q:1:ada"), choosePersonal(kept, "q:1:ada"));
  const picks = new Set(Array.from({ length: 20 }, (_, i) => choosePersonal(kept, `q:1:u${i}`).items[0].id));
  assert.ok(picks.size > 1);
});

test("PERSONAL_RULE names the rule", () => {
  assert.equal(typeof PERSONAL_RULE, "string");
  assert.match(PERSONAL_RULE, /alt/);
});

test("pick is the bake's pick", () => {
  // Pinned from tools/quiz-bake.mjs in course-private before the move.
  assert.deepEqual(pick(["a", "b", "c", "d", "e"], 3, "mq-11:1:ada:personal:alt"), ["e", "c", "b"]);
  assert.equal(typeof rng("x")(), "number");
  const kept = [..."1234"].map((n) => ({ id: `a${n}`, kind: "alt", prompt: `> 3: a${n}\n4: x`, expected: "e", rubric: "r" }))
    .concat([{ id: "i1", kind: "injection", prompt: "> 3: i1\n4: x", expected: "e", rubric: "r" }, { id: "i2", kind: "injection", prompt: "> 3: i2\n4: x", expected: "e", rubric: "r" }, { id: "l1", kind: "lane", prompt: "> 3: l1\n4: x", expected: "e", rubric: "r" }]);
  assert.deepEqual(choosePersonal(kept, "mq-11:1:ada"), {
    items: [
      { id: "a4", type: "free", prompt: "> a4\nx", expected: "e", rubric: "r" },
      { id: "i2", type: "free", prompt: "> i2\nx", expected: "e", rubric: "r" },
    ],
    short: false,
  });
});
