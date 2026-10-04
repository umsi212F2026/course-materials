import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { buildQueue, mergeGrades } from "../lib/grade.mjs";

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
