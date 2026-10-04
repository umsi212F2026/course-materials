import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { drawPractice, courseOnly } from "../quiz-draw.mjs";

// A workspace with one topic, t1, whose course goals are g1 and g2 and whose learner goal is
// gL, and one folder bank a-x/s1 of questions q1..q4. `goalOf` says which goal each rubric names.
function fixture({ goalOf = {}, log = [], n = 2 } = {}) {
  const root = mkdtempSync(join(tmpdir(), "draw-test-"));
  const put = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  const g = (id, extra = "") => `### \`${id}\`\n- **goal:** Do it.\n- **criterion:** Done.\n${extra}\n`;
  put("learning-topics/t1/goals.md", `# T\n\n**origin:** course\n\n## Goals\n\n${g("g1")}${g("g2")}${g("gL", "- **origin:** learner\n")}`);
  const ids = Array.from({ length: n }, (_, i) => `q${i + 1}`);
  put("learning-topics/t1/tasks/a-x/s1.md", ids.map((q) => `### ${q}\n\nQ.\n`).join("\n"));
  put("learning-topics/t1/rubrics/a-x/s1.md",
    ids.map((q) => `### ${q}\n\n- **answer:** A.\n${goalOf[q] ? `- **goal:** ${goalOf[q]}\n` : ""}`).join("\n"));
  if (log.length) {
    put("learning-topics/t1/evidence/attempts.jsonl", log.map((e) => JSON.stringify(e)).join("\n") + "\n");
  }
  return root;
}

const pool = (take) => ({ draw: { "learning-topics/t1/a-x/s1": take } });
const seen = (label, at) => ({ at, goal: "g1", label });

test("with one of two seen, take 1 draws the unseen one whatever the seed", () => {
  const root = fixture({ log: [seen("a-x/s1/q1", "2026-09-01T00:00:00Z")] });
  for (const seed of ["a", "b", "c", "d", "e", "f"]) {
    const { items } = drawPractice(pool(1), root, { seed });
    assert.deepEqual(items.map((i) => i.label), ["a-x/s1/q2"]);
  }
});

test("with all seen, the least recently seen is drawn, using each item's latest attempt", () => {
  const root = fixture({
    log: [
      seen("a-x/s1/q1", "2026-09-01T00:00:00Z"),
      seen("a-x/s1/q2", "2026-08-01T00:00:00Z"),
      seen("a-x/s1/q1", "2026-09-10T00:00:00Z"),
    ],
  });
  for (const seed of ["a", "b", "c", "d"]) {
    assert.deepEqual(drawPractice(pool(1), root, { seed }).items.map((i) => i.label), ["a-x/s1/q2"]);
  }
});

test("preferUnseen: false keeps the seeded random draw", () => {
  const root = fixture({ n: 6, log: ["q1", "q2", "q3"].map((q) => seen(`a-x/s1/${q}`, "2026-09-01T00:00:00Z")) });
  const picks = new Set();
  for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
    const [it] = drawPractice(pool(1), root, { seed, preferUnseen: false }).items;
    picks.add(it.label);
    // Same seed against an empty log: identical, so the log is ignored.
    const blank = drawPractice(pool(1), fixture({ n: 6 }), { seed, preferUnseen: false }).items[0];
    assert.equal(it.label, blank.label);
  }
  assert.ok([...picks].some((l) => ["q1", "q2", "q3"].some((q) => l.endsWith(q))));
});

test("a learner-origin goal drops the item and is reported; no goal is kept", () => {
  const root = fixture({ n: 3, goalOf: { q1: "g1", q2: "gL" } });
  const { items, problems } = drawPractice(pool(3), root, { seed: "x" });
  assert.deepEqual(items.map((i) => i.label).sort(), ["a-x/s1/q1", "a-x/s1/q3"]);
  assert.ok(problems.includes("learning-topics/t1/a-x/s1/q2 (learning-topics/t1/a-x) dropped: gL is not a course goal"));
});

test("courseOnly drops a multi-goal item naming any non-course goal, and keeps topicless items", () => {
  const root = fixture();
  const topic = join(root, "learning-topics/t1");
  const { items, problems } = courseOnly([
    { id: "m", goals: ["g1", "gL"], topic },
    { id: "ok", goals: ["g1", "g2"], topic },
    { id: "single", goal: "g1", topic },
    { id: "free", topic: null },
  ]);
  assert.deepEqual(items.map((i) => i.id), ["ok", "single", "free"]);
  assert.deepEqual(problems, ["m dropped: gL is not a course goal"]);
});

test("strata carry their bank", () => {
  const { strata } = drawPractice(pool(1), fixture(), { seed: "x" });
  assert.equal(strata[0].bank, "learning-topics/t1/a-x");
});

test("a dropped item does not stay pickable because another topic's item shares its id", () => {
  const root = fixture();
  const put = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  put("learning-topics/t2/goals.md", "# T\n\n**origin:** course\n\n## Goals\n\n### `h1`\n- **goal:** Do it.\n- **criterion:** Done.\n");
  for (const [t, goal] of [["t1", "gL"], ["t2", "h1"]]) {
    put(`learning-topics/${t}/tasks/items.md`, "### q1\n\nQ.\n");
    put(`learning-topics/${t}/rubrics/items.md`, `### q1\n\n- **answer:** A.\n- **goal:** ${goal}\n`);
  }
  const p = { draw: { "learning-topics/t1/items": 1, "learning-topics/t2/items": 1 } };
  const { items, problems } = drawPractice(p, root, { seed: "x" });
  assert.deepEqual(items.map((i) => i.bank), ["learning-topics/t2/items"]);
  assert.ok(problems.some((m) => m.startsWith("q1 (learning-topics/t1/items) dropped: gL")));
});

test("attempt times are compared as instants, not as strings", () => {
  // As strings q1 (T10...-08:00) sorts before q2 (T12...Z); as instants q1 is 18:00Z, the later.
  const root = fixture({ log: [seen("a-x/s1/q1", "2026-09-01T10:00:00-08:00"), seen("a-x/s1/q2", "2026-09-01T12:00:00Z")] });
  for (const seed of ["a", "b", "c", "d"]) {
    assert.deepEqual(drawPractice(pool(1), root, { seed }).items.map((i) => i.label), ["a-x/s1/q2"]);
  }
});

test("a question with no goal ranks after a goal-bearing one, even a seen one", () => {
  const root = fixture({ goalOf: { q2: "g1" }, log: [seen("a-x/s1/q2", "2026-09-01T00:00:00Z")] });
  for (const seed of ["a", "b", "c", "d"]) {
    assert.deepEqual(drawPractice(pool(1), root, { seed }).items.map((i) => i.label), ["a-x/s1/q2"]);
  }
});
