import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { readBank, readPoolSources, applyPool, recordLabel } from "../lib/bank.mjs";
import { drawPractice } from "../quiz-draw.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

// A workspace in a temp dir from { "learning-topics/t1/tasks/a-x/s1.md": text, ... }.
function workspace(files) {
  const root = mkdtempSync(join(tmpdir(), "pool-test-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

// `n` free questions q1..qn, as a tasks file and its rubric.
const qs = (n) => Array.from({ length: n }, (_, i) => `### q${i + 1}\n\nQ.\n`).join("\n");
const keys = (n) => Array.from({ length: n }, (_, i) => `### q${i + 1}\n\n- **answer:** A.\n`).join("\n");
const ids = (n, p = "") => Array.from({ length: n }, (_, i) => `### ${p}${i + 1}\n\nQ.\n`).join("\n");
const idKeys = (n, p = "") => Array.from({ length: n }, (_, i) => `### ${p}${i + 1}\n\n- **answer:** A.\n`).join("\n");

// t1: folder activity a-x (scenarios s1 with 3, s2 with 2), folder activity a-y (1), and a
// single-file bank `items` (4). Three banks, in name order a-x, a-y, items.
const T1 = {
  "learning-topics/t1/tasks/a-x/s1.md": qs(3),
  "learning-topics/t1/rubrics/a-x/s1.md": keys(3),
  "learning-topics/t1/tasks/a-x/s2.md": qs(2),
  "learning-topics/t1/rubrics/a-x/s2.md": keys(2),
  "learning-topics/t1/tasks/a-y/s1.md": qs(1),
  "learning-topics/t1/rubrics/a-y/s1.md": keys(1),
  "learning-topics/t1/tasks/items.md": ids(4, "i"),
  "learning-topics/t1/rubrics/items.md": idKeys(4, "i"),
};

const drawn = (pool, root) => {
  const { strata, problems } = applyPool(readPoolSources(pool, root), pool);
  return { shape: strata.map((s) => [s.name, s.take, s.items.length]), strata, problems };
};

test("folder items read with a label get a qualified id and keep the topic-local label", () => {
  const root = workspace(T1);
  const { items } = readBank(join(root, "learning-topics/t1"), "learning-topics/t1");
  const q1 = items.find((i) => i.label === "a-x/s1/q1");
  assert.equal(q1.id, "learning-topics/t1/a-x/s1/q1");
  assert.equal(q1.bank, "learning-topics/t1/a-x");
  // Single-file items keep their bare ids.
  assert.equal(items.find((i) => i.bank === "learning-topics/t1/items").id, "i1");
  // With no label the id is the label itself.
  assert.equal(readBank(join(root, "learning-topics/t1")).items.find((i) => i.label).id, "a-x/s1/q1");
});

test("two sources with the same folder path give distinct ids", () => {
  const root = workspace({
    ...T1,
    "learning-topics/t2/tasks/a-x/s1.md": qs(1),
    "learning-topics/t2/rubrics/a-x/s1.md": keys(1),
  });
  const pool = { draw: { "learning-topics/t1/a-x/s1": 1, "learning-topics/t2/a-x/s1": 1 } };
  const { strata, problems } = drawn(pool, root);
  assert.deepEqual(problems, []);
  const all = strata.flatMap((s) => s.items.map((i) => i.id));
  assert.equal(new Set(all).size, all.length);
  assert.ok(all.includes("learning-topics/t2/a-x/s1/q1"));
});

test("recordLabel: folder label, then move and id, then id", () => {
  assert.equal(recordLabel({ id: "learning-topics/t1/a-x/s1/q1", label: "a-x/s1/q1", move: "CATCH" }), "a-x/s1/q1");
  assert.equal(recordLabel({ id: "w3", move: "CATCH" }), "CATCH: w3");
  assert.equal(recordLabel({ id: "i1" }), "i1");
});

test("draw keys resolve at activity, scenario and file level", () => {
  const root = workspace(T1);
  const pool = {
    draw: {
      "learning-topics/t1/a-x": 2,
      "learning-topics/t1/a-x/s2": 1,
      "learning-topics/t1/items": 1,
    },
  };
  const { shape, strata, problems } = drawn(pool, root);
  assert.deepEqual(problems, []);
  assert.deepEqual(shape, [
    ["learning-topics/t1/a-x", 2, 5],
    ["learning-topics/t1/a-x/s2", 1, 2],
    ["learning-topics/t1/items", 1, 4],
  ]);
  assert.ok(strata[1].items.every((i) => i.scenario === "s2"));
});

test("a topic-level key spreads evenly across the topic's banks, passing a shortfall on", () => {
  const root = workspace({
    "learning-topics/t1/tasks/a-a/s.md": qs(5),
    "learning-topics/t1/rubrics/a-a/s.md": keys(5),
    "learning-topics/t1/tasks/a-b/s.md": qs(5),
    "learning-topics/t1/rubrics/a-b/s.md": keys(5),
    "learning-topics/t1/tasks/c.md": ids(5, "c"),
    "learning-topics/t1/rubrics/c.md": idKeys(5, "c"),
  });
  const even = drawn({ draw: { "learning-topics/t1": 7 } }, root);
  assert.deepEqual(even.problems, []);
  assert.deepEqual(even.shape, [
    ["learning-topics/t1", 3, 5],
    ["learning-topics/t1", 2, 5],
    ["learning-topics/t1", 2, 5],
  ]);
  assert.deepEqual(even.strata.map((s) => s.bank), ["learning-topics/t1/a-a", "learning-topics/t1/a-b", "learning-topics/t1/c"]);

  // T1's banks hold 5, 1 and 4: a-y can give only 1 of its 2, and items takes the other.
  const short = drawn({ draw: { "learning-topics/t1": 7 } }, workspace(T1));
  assert.deepEqual(short.problems, []);
  assert.deepEqual(short.strata.map((s) => [s.bank, s.take]), [
    ["learning-topics/t1/a-x", 3],
    ["learning-topics/t1/a-y", 1],
    ["learning-topics/t1/items", 3],
  ]);

  // More than the whole topic holds is a problem, and every question is still offered.
  const over = drawn({ draw: { "learning-topics/t1": 12 } }, workspace(T1));
  assert.ok(over.problems.some((p) => p.includes("learning-topics/t1") && p.includes("12")));
  assert.equal(over.strata.reduce((n, s) => n + s.take, 0), 10);
});

test("a practice draw on a topic-level key draws the full count and finds the topic", () => {
  const root = workspace(T1);
  const { items, problems } = drawPractice({ draw: { "learning-topics/t1": 7 } }, root, { seed: "x" });
  assert.deepEqual(problems, []);
  assert.equal(items.length, 7);
  assert.equal(new Set(items.map((i) => i.id)).size, 7);
  assert.ok(items.every((i) => i.topic === join(root, "learning-topics/t1")));
});

test("a missing scenario, and a scenario of a single-file bank, are problems", () => {
  const root = workspace(T1);
  const { problems } = drawn(
    { draw: { "learning-topics/t1/a-x/nope": 1, "learning-topics/t1/items/i1": 1 } },
    root,
  );
  assert.ok(problems.some((p) => p.includes("nope") && p.includes("no scenario")));
  assert.ok(problems.some((p) => p.includes("learning-topics/t1/items/i1") && p.includes("single-file")));
});

test("a key under no source folder is the not-a-folder problem", () => {
  const root = workspace(T1);
  const { problems } = drawn({ draw: { "learning-topics/gone/items": 1 } }, root);
  assert.ok(problems.some((p) => p.includes("learning-topics/gone") && p.includes("not a folder")));
});

test("topic form checks exhaustiveness against single-file banks only", () => {
  const root = workspace(T1);
  const { problems } = drawn({ topic: "t1", draw: { "a-x": 1 } }, root);
  assert.ok(problems.some((p) => p.startsWith("items is in the topic")));
  assert.ok(!problems.some((p) => p.startsWith("a-y")));
});

test("exclude takes qualified folder ids and bare single-file ids", () => {
  const root = workspace(T1);
  const pool = {
    draw: { "learning-topics/t1/a-x/s2": 2, "learning-topics/t1/items": 4 },
    exclude: { "learning-topics/t1/a-x/s2/q1": "", i1: "" },
  };
  const { shape } = drawn(pool, root);
  assert.deepEqual(shape, [
    ["learning-topics/t1/a-x/s2", 2, 1],
    ["learning-topics/t1/items", 4, 3],
  ]);
});

// BACKWARD COMPATIBILITY against the real pools and the real sources: every published pool must
// draw the same strata, sizes and problems as bank.mjs did at 0ce78cb. The old module is written
// to a temp tree that mirrors its relative import of moves.mjs.
test("every real pool draws as it did at 0ce78cb", async (t) => {
  const ROOT = process.env.SOURCES_ROOT ?? resolve(REPO, "..");
  let oldSrc;
  try {
    oldSrc = execFileSync("git", ["show", "0ce78cb:workflows/quiz/tools/lib/bank.mjs"], { cwd: REPO, encoding: "utf8" });
  } catch {
    t.skip("commit 0ce78cb is not available");
    return;
  }
  const scratch = mkdtempSync(join(tmpdir(), "pool-compat-"));
  mkdirSync(join(scratch, "workflows/quiz/tools/lib"), { recursive: true });
  mkdirSync(join(scratch, "workflows/learn/tools/lib"), { recursive: true });
  writeFileSync(join(scratch, "workflows/quiz/tools/lib/bank.mjs"), oldSrc);
  writeFileSync(
    join(scratch, "workflows/learn/tools/lib/moves.mjs"),
    readFileSync(join(REPO, "workflows/learn/tools/lib/moves.mjs"), "utf8"),
  );
  const old = await import(pathToFileURL(join(scratch, "workflows/quiz/tools/lib/bank.mjs")).href);

  const dir = join(REPO, "quiz-bank");
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".pool.json")).sort()) {
    const pool = JSON.parse(readFileSync(join(dir, name), "utf8"));
    const sources = pool.topic
      ? [join("learning-topics", pool.topic)]
      : Object.keys(pool.draw ?? {}).map((k) => k.split("/").slice(0, -1).join("/"));
    const missing = sources.filter((s) => !existsSync(join(ROOT, s)));
    if (missing.length) {
      t.diagnostic(`${name}: skipped, ${missing.join(", ")} not under ${ROOT}`);
      continue;
    }
    const shape = (r) => ({ strata: r.strata.map((s) => [s.name, s.take, s.items.length]), problems: r.problems });
    const before = shape(old.applyPool(old.readPoolSources(pool, ROOT), pool));
    const after = shape(applyPool(readPoolSources(pool, ROOT), pool));
    assert.deepEqual(after, before, name);
    t.diagnostic(`${name}: same ${JSON.stringify(after.strata)}, ${after.problems.length} problems`);
  }
});
