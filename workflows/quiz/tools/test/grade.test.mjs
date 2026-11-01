import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { buildQueue, collectAnswers, gradedParts, mergeGrades, parsePartKey, partKey, partPrompt } from "../lib/grade.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const row = (item, text, uniqname = "me") => ({ uniqname, canvas_id: null, source: "submission", item, text });
const free = (id, extra = {}) => ({ id, type: "free", bank: "b", goal: "g1", prompt: "P?", rubric: "R", ...extra });
const mcq = { id: "m1", type: "mcq", goal: "g1", answer: 2, prompt: "M?" };
const multi = free("q9", { goal: undefined, goals: ["g1", "g2"] });
const opts = { date: "2026-10-03", session: 5 };
const strip = ({ graded, ...rest }) => rest;

// A VERDICT WITHOUT per_goal MUST MERGE EXACTLY AS IT DID AT 0ce78cb, because the instructor's
// private grading runner shares grade.mjs. The old module has no imports, so it loads as is.
test("single-goal verdicts merge exactly as at 0ce78cb", async (t) => {
  let oldSrc;
  try {
    oldSrc = execFileSync("git", ["show", "0ce78cb:workflows/quiz/tools/lib/grade.mjs"], { cwd: REPO, encoding: "utf8" });
  } catch {
    t.skip("commit 0ce78cb is not available");
    return;
  }
  const path = join(mkdtempSync(join(tmpdir(), "grade-compat-")), "grade.mjs");
  writeFileSync(path, oldSrc);
  const old = await import(pathToFileURL(path).href);

  const rows = [
    row(free("q1"), "an answer"), row(free("q2"), "another"), row(free("q3"), " "), row(mcq, "2"),
    row(free("q4", { goal: undefined }), "no goal"), row(free("q1"), "theirs", "you"), row(free("q5"), "x", "you"),
  ];
  const verdicts = [
    { item: "q1", uniqname: "me", credit: "half", missed: "M", axes: { unaided: "no" }, flag: true, flag_reason: "F", at: "2" },
    { item: "q2", uniqname: "me", credit: "full", axes: { criterion: "unchecked" } },
    { item: "q4", uniqname: "me", credit: "none", missed: "N" },
    { item: "q1", uniqname: "you", credit: "full", at: "5" },
    { item: "q5", uniqname: "you", credit: "bogus" },
  ];
  const corrections = [
    { item: "q1", uniqname: "me", credit: "full", comment: "fine", at: "3" },
    { item: "q1", uniqname: "you", credit: "none", at: "4" },
    { item: "zz", uniqname: "me", credit: "full" },
  ];
  // Serialized, so key order counts too: byte-identical is the requirement, not merely equal.
  assert.equal(JSON.stringify(strip(mergeGrades(rows, verdicts, { ...opts, corrections }))),
    JSON.stringify(strip(old.mergeGrades(rows, verdicts, { ...opts, corrections }))));
  // buildQueue gains `goals` and nothing else.
  const now = buildQueue(rows).map(({ goals, ...g }) => g);
  assert.deepEqual(now, old.buildQueue(rows));
});

test("buildQueue carries the item's goals", () => {
  const q = buildQueue([row(free("q1"), "a"), row(multi, "b"), row(free("q4", { goal: undefined }), "c")]);
  assert.deepEqual(q.map((g) => g.goals), [["g1"], ["g1", "g2"], []]);
});

test("a two-goal verdict averages its per-goal credits", () => {
  const v = {
    item: "q9", uniqname: "me", missed: "half of it",
    per_goal: { g1: { credit: "full", missed: "" }, g2: { credit: "none", missed: "M2", axes: { criterion: "unchecked" } } },
  };
  const out = mergeGrades([row(multi, "b")], [v], opts);
  assert.deepEqual(out.problems, []);
  const [s] = out.students;
  assert.equal(s.items[0].credit, "partial");
  assert.equal(s.items[0].value, 0.5);
  assert.equal(s.score, 0.5);
  assert.equal(s.out_of, 1);
  assert.deepEqual(s.items[0].per_goal, {
    g1: { credit: "full", missed: "", axes: { unaided: "yes", criterion: "met" } },
    g2: { credit: "none", missed: "M2", axes: { unaided: "yes", criterion: "unchecked" } },
  });
});

test("per_goal must name exactly the item's goals", () => {
  const missing = { item: "q9", uniqname: "me", per_goal: { g1: { credit: "full" } } };
  const out = mergeGrades([row(multi, "b")], [missing], opts);
  assert.equal(out.problems.length, 1);
  assert.match(out.problems[0], /q9.*g2/);
  assert.deepEqual(out.students[0].items, []);

  const extra = { item: "q9", uniqname: "me", per_goal: { g1: { credit: "full" }, g2: { credit: "full" }, g3: { credit: "none" } } };
  assert.match(mergeGrades([row(multi, "b")], [extra], opts).problems[0], /q9.*g3/);
});

test("a multi-goal verdict without per_goal is a problem naming the item, and is left unscored", () => {
  const v = { item: "q9", uniqname: "me", credit: "full", missed: "" };
  const out = mergeGrades([row(multi, "b")], [v], opts);
  assert.equal(out.problems.length, 1);
  assert.match(out.problems[0], /q9.*g1, g2.*per_goal/);
  assert.deepEqual(out.students[0].items, []);
});

// A COMPOUND: stem `Stem.`, an mcq part `a` whose answer is 0, and a free part `b`.
const partA = { label: "a", type: "mcq", prompt: "Part a?", choices: ["True", "False"], answer: 0 };
const partB = { label: "b", type: "free", prompt: "Part b?", rubric: "Rb", expected: "E", credit: "full for E" };
const c1 = { id: "c1", type: "compound", bank: "b", goal: "g1", prompt: "Stem.", parts: [partA, partB] };
const c2 = { ...c1, id: "c2", parts: [partA, { ...partA, label: "b", prompt: "Part b?", answer: 1 }] };
const crow = (item, parts, uniqname = "me") => ({ ...row(item, null, uniqname), parts });

test("gradedParts: one entry for a plain item, one per part for a compound", () => {
  assert.deepEqual(gradedParts(mcq), [{ key: "m1", label: null, type: "mcq", prompt: "M?", answer: 2 }]);
  const parts = gradedParts(c1);
  assert.deepEqual(parts.map((p) => p.key), ["c1#a", "c1#b"]);
  assert.equal(parts[0].prompt, "Stem.\n\nPart a?");
  assert.deepEqual(parts[0].choices, ["True", "False"]);
  assert.equal(parts[1].rubric, "Rb");
  assert.equal(parts[1].expected, "E");
  assert.equal(partPrompt({ ...c1, prompt: "" }, partA), "Part a?");
});

test("partKey and parsePartKey round trip, and a bare id has no label", () => {
  assert.equal(partKey("s3/c1", "b"), "s3/c1#b");
  assert.deepEqual(parsePartKey("s3/c1#b"), { id: "s3/c1", label: "b" });
  assert.deepEqual(parsePartKey("c1"), { id: "c1", label: null });
});

test("collectAnswers gives a compound one row with an answer per part", () => {
  const drawFile = { draws: [{ uniqname: "me", items: [c1] }] };
  const sub = (answers) => ({ submissions: [{ uniqname: "me", answers }], drafts: [] });
  const both = collectAnswers(drawFile, sub([{ item_id: "c1#a", text: "0" }, { item_id: "c1#b", text: "text" }]));
  assert.equal(both.length, 1);
  assert.equal(both[0].text, null);
  assert.deepEqual(both[0].parts, { a: "0", b: "text" });
  const one = collectAnswers(drawFile, sub([{ item_id: "c1#a", text: "0" }]));
  assert.deepEqual(one[0].parts, { a: "0", b: null });
});

test("collectAnswers gives a plain item exactly the row it always has", () => {
  const drawFile = { draws: [{ uniqname: "me", canvas_id: 7, items: [mcq, free("q1")] }] };
  const subs = { submissions: [{ uniqname: "me", answers: [{ item_id: "m1", text: "2" }] }], drafts: [] };
  assert.equal(JSON.stringify(collectAnswers(drawFile, subs)), JSON.stringify([
    { uniqname: "me", canvas_id: 7, source: "submission", item: mcq, text: "2" },
    { uniqname: "me", canvas_id: 7, source: "submission", item: free("q1"), text: null },
  ]));
});

test("buildQueue queues a compound's answered free parts, by part key", () => {
  const [g, ...rest] = buildQueue([crow(c1, { a: "0", b: "text" })]);
  assert.deepEqual(rest, []);
  assert.deepEqual(g, {
    item: "c1#b", bank: "b", goal: "g1", goals: ["g1"], prompt: "Stem.\n\nPart b?", rubric: "Rb",
    answers: [{ uniqname: "me", answer: "text" }],
  });
  assert.deepEqual(buildQueue([crow(c1, { a: "0", b: "  " })]), []);
  assert.deepEqual(buildQueue([crow(c2, { a: "0", b: "1" })]), []);
});

const vb = (credit, extra = {}) => ({ item: "c1#b", uniqname: "me", credit, missed: "", ...extra });

test("a compound with both parts right is full and met", () => {
  const out = mergeGrades([crow(c1, { a: "0", b: "text" })], [vb("full")], opts);
  assert.deepEqual(out.problems, []);
  const [it] = out.students[0].items;
  assert.deepEqual(Object.keys(it), ["item", "type", "goal", "credit", "missed", "flag", "flag_reason",
    "corrected", "grader_credit", "axes", "value", "parts"]);
  assert.equal(it.item, "c1");
  assert.equal(it.type, "compound");
  assert.equal(it.credit, "full");
  assert.equal(it.value, 1);
  assert.deepEqual(it.axes, { unaided: "yes", criterion: "met" });
  assert.deepEqual(it.parts, [
    { label: "a", type: "mcq", credit: "full", missed: "", flag: false, flag_reason: "", corrected: false, grader_credit: null },
    { label: "b", type: "free", credit: "full", missed: "", flag: false, flag_reason: "", corrected: false, grader_credit: null },
  ]);
});

test("a compound is the mean of its parts", () => {
  const none = mergeGrades([crow(c1, { a: "0", b: "text" })], [vb("none", { missed: "M" })], opts);
  const [n] = none.students[0].items;
  assert.equal(n.credit, "partial");
  assert.equal(n.value, 0.5);
  assert.equal(n.axes.criterion, "not met");
  assert.equal(n.parts[1].missed, "M");

  const half = mergeGrades([crow(c1, { a: "0", b: "text" })], [vb("half")], opts);
  assert.equal(half.students[0].items[0].value, 0.75);
  assert.equal(half.students[0].items[0].axes.criterion, "not met");
});

test("a blank part counts as none and needs no verdict", () => {
  const out = mergeGrades([crow(c1, { a: "0", b: null })], [], opts);
  assert.deepEqual(out.problems, []);
  const [it] = out.students[0].items;
  assert.equal(it.value, 0.5);
  assert.equal(it.parts[1].credit, "none");
});

test("a compound of mcq parts grades with no verdicts", () => {
  const out = mergeGrades([crow(c2, { a: "0", b: "0" })], [], opts);
  assert.deepEqual(out.problems, []);
  assert.equal(out.students[0].items[0].value, 0.5);
});

test("an answered free part with no verdict leaves the compound unscored", () => {
  const out = mergeGrades([crow(c1, { a: "0", b: "text" })], [], opts);
  assert.deepEqual(out.problems, ["me c1#b: answered, but no verdict came back"]);
  assert.deepEqual(out.students[0].items, []);
});

test("a part verdict is used, and flags and axes roll up from the parts", () => {
  const v = vb("full", { flag: true, flag_reason: "odd", axes: { unaided: "unclear", criterion: "unchecked" } });
  const out = mergeGrades([crow(c1, { a: "0", b: "text" })], [v], opts);
  assert.deepEqual(out.problems, []);
  const [it] = out.students[0].items;
  assert.equal(it.flag, true);
  assert.match(it.flag_reason, /odd/);
  assert.deepEqual(it.axes, { unaided: "unclear", criterion: "unchecked" });
  assert.equal(it.parts[1].flag, true);
  assert.equal(it.parts[1].flag_reason, "odd");
});

test("a correction on a part, newer than its verdict, corrects that part only", () => {
  const corrections = [{ item: "c1#b", uniqname: "me", credit: "full", comment: "fine", at: "3" }];
  const out = mergeGrades([crow(c1, { a: "0", b: "text" })], [vb("none", { at: "2" })], { ...opts, corrections });
  assert.deepEqual(out.problems, []);
  const [it] = out.students[0].items;
  assert.equal(it.value, 1);
  assert.equal(it.credit, "full");
  assert.equal(it.corrected, false);
  assert.deepEqual(it.parts[1], {
    label: "b", type: "free", credit: "full", missed: "fine", flag: false, flag_reason: "", corrected: true, grader_credit: "none",
  });

  const stale = [{ item: "c1#b", uniqname: "me", credit: "full", at: "1" }];
  const old = mergeGrades([crow(c1, { a: "0", b: "text" })], [vb("none", { at: "2" })], { ...opts, corrections: stale });
  assert.deepEqual(old.problems, []);
  assert.equal(old.students[0].items[0].value, 0.5);
});

test("a correction on the bare id replaces the mark, drops value and keeps the parts", () => {
  const corrections = [{ item: "c1", uniqname: "me", credit: "full", at: "3" }];
  const out = mergeGrades([crow(c1, { a: "0", b: "text" })], [vb("none", { at: "2" })], { ...opts, corrections });
  assert.deepEqual(out.problems, []);
  const [it] = out.students[0].items;
  assert.equal(it.credit, "full");
  assert.equal(it.corrected, true);
  assert.equal(it.grader_credit, "partial");
  assert.equal(Object.hasOwn(it, "value"), false);
  assert.equal(it.axes.criterion, "met");
  assert.deepEqual(it.parts.map((p) => p.credit), ["full", "none"]);
  assert.equal(out.students[0].score, 1);
});

test("a correction naming a part the compound does not have is a problem", () => {
  const corrections = [{ item: "c1#z", uniqname: "me", credit: "full" }];
  const out = mergeGrades([crow(c1, { a: "0", b: "text" })], [vb("full")], { ...opts, corrections });
  assert.deepEqual(out.problems, ["correction for me c1#z matches no graded item"]);
});

test("score counts a compound by its value and out_of counts it once", () => {
  const out = mergeGrades([crow(c1, { a: "0", b: "text" }), row(mcq, "2")], [vb("half")], opts);
  assert.equal(out.students[0].score, 1.75);
  assert.equal(out.students[0].out_of, 2);
});
