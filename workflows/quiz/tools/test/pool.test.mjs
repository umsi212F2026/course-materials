import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { readBank, readPoolSources, applyPool, recordLabel, keyParts, takeOf, pickSameScenario, SAME_SCENARIO_NOTE } from "../lib/bank.mjs";
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

test("a key joining banks with | is one stratum drawn from their union", () => {
  const root = workspace(T1);
  const key = "learning-topics/t1/a-x | learning-topics/t1/a-y";
  const { shape, strata, problems } = drawn({ draw: { [key]: 1 } }, root);
  assert.deepEqual(problems, []);
  assert.deepEqual(shape, [[key, 1, 6]]);
  assert.deepEqual(
    [...new Set(strata[0].items.map((i) => i.bank))].sort(),
    ["learning-topics/t1/a-x", "learning-topics/t1/a-y"],
  );
  // A practice draw serves the count from it, and reports nothing short.
  const d = drawPractice({ draw: { [key]: 1 } }, root, { seed: "s", preferUnseen: false });
  assert.equal(d.items.length, 1);
  assert.deepEqual(d.problems, []);
});

test("a joined key reads each part's source, even across topics", () => {
  const root = workspace({
    ...T1,
    "learning-topics/t2/tasks/b.md": ids(2, "b"),
    "learning-topics/t2/rubrics/b.md": idKeys(2, "b"),
  });
  const key = "learning-topics/t1/items | learning-topics/t2/b";
  const { shape, problems } = drawn({ draw: { [key]: 2 } }, root);
  assert.deepEqual(problems, []);
  assert.deepEqual(shape, [[key, 2, 6]]);
});

test("a joined key naming a bank that does not exist is a problem", () => {
  const root = workspace(T1);
  const key = "learning-topics/t1/a-x | learning-topics/t1/a-nope";
  const { shape, problems } = drawn({ draw: { [key]: 1 } }, root);
  // The part that exists still supplies the stratum; only the missing one is reported.
  assert.deepEqual(shape, [[key, 1, 5]]);
  assert.deepEqual(problems, [`pool draws from learning-topics/t1/a-nope, which is not a file in the topic's tasks/`]);
});

test("exclude applies inside a joined stratum", () => {
  const root = workspace(T1);
  const key = "learning-topics/t1/a-y | learning-topics/t1/items";
  const { strata, problems } = drawn({ draw: { [key]: 1 }, exclude: { "learning-topics/t1/a-y/s1/q1": "", i2: "" } }, root);
  assert.deepEqual(problems, []);
  assert.deepEqual(strata[0].items.map((i) => i.id), ["i1", "i3", "i4"]);
});

test("exclude takes qualified folder ids and bare single-file ids", () => {
  const root = workspace(T1);
  const pool = {
    draw: { "learning-topics/t1/a-x/s2": 1, "learning-topics/t1/items": 3 },
    exclude: { "learning-topics/t1/a-x/s2/q1": "", i1: "" },
  };
  // Takes that fit what is left, so a problem here can only be an exclude that did not resolve.
  const { strata, problems } = drawn(pool, root);
  assert.deepEqual(problems, []);
  assert.deepEqual(strata.map((s) => s.items.map((i) => i.id)), [
    ["learning-topics/t1/a-x/s2/q2"],
    ["i2", "i3", "i4"],
  ]);
});

const same = (take) => ({ take, sameScenario: true });

test("takeOf reads a plain count and the object form alike", () => {
  assert.equal(takeOf(3), 3);
  assert.equal(takeOf(same(2)), 2);
});

test("a sameScenario draw value gives one stratum over the whole activity that says so", () => {
  const root = workspace(T1);
  const { shape, strata, problems } = drawn({ draw: { "learning-topics/t1/a-x": same(2) } }, root);
  assert.deepEqual(problems, []);
  assert.deepEqual(shape, [["learning-topics/t1/a-x", 2, 5]]);
  assert.equal(strata[0].sameScenario, true);
  // A plain count carries no flag.
  assert.equal(drawn({ draw: { "learning-topics/t1/a-x": 2 } }, root).strata[0].sameScenario, undefined);
});

test("sameScenario needs some scenario with enough questions", () => {
  const root = workspace(T1);
  // s1 has 3 and s2 has 2, so 3 is fine and 4 is not.
  assert.deepEqual(drawn({ draw: { "learning-topics/t1/a-x": same(3) } }, root).problems, []);
  const { problems } = drawn({ draw: { "learning-topics/t1/a-x": same(4) } }, root);
  assert.deepEqual(problems, ["pool draws 4 from one scenario of learning-topics/t1/a-x, but no scenario has 4 available"]);
});

test("sameScenario on a single-file bank, a joined key or a whole topic is a problem", () => {
  const root = workspace(T1);
  const joined = "learning-topics/t1/a-x | learning-topics/t1/a-y";
  const { problems } = drawn(
    { draw: { "learning-topics/t1/items": same(1), [joined]: same(1), "learning-topics/t1": same(1) } },
    root,
  );
  assert.ok(problems.some((p) => p.includes("learning-topics/t1/items") && p.includes("single-file")));
  assert.ok(problems.some((p) => p.includes(joined) && p.includes("one activity")));
  assert.ok(problems.some((p) => p.startsWith("pool draws from learning-topics/t1 with sameScenario") && p.includes("one activity")));
});

test("pickSameScenario takes one scenario's questions in file order, noting the scenario after the first", () => {
  const root = workspace(T1);
  const { strata } = drawn({ draw: { "learning-topics/t1/a-x": same(2) } }, root);
  const scenarios = new Set();
  for (let i = 0; i < 20; i++) {
    let x = i / 20;
    const next = () => ((x = (x * 7.31 + 0.17) % 1), x);
    const got = pickSameScenario(strata[0].items, 2, next);
    assert.equal(got.length, 2);
    assert.equal(new Set(got.map((it) => it.scenario)).size, 1);
    const order = strata[0].items.map((it) => it.id);
    assert.ok(order.indexOf(got[0].id) < order.indexOf(got[1].id));
    assert.ok(!got[0].prompt.startsWith(SAME_SCENARIO_NOTE));
    assert.ok(got[1].prompt.startsWith(`${SAME_SCENARIO_NOTE}\n\n`));
    // The bank's own item is left alone.
    assert.ok(!strata[0].items.some((it) => it.prompt.startsWith(SAME_SCENARIO_NOTE)));
    scenarios.add(got[0].scenario);
  }
  // Both scenarios hold 2, so both turn up.
  assert.deepEqual([...scenarios].sort(), ["s1", "s2"]);
});

test("pickSameScenario only chooses a scenario that holds the whole take, and draws nothing when none does", () => {
  const root = workspace(T1);
  const { strata } = drawn({ draw: { "learning-topics/t1/a-x": same(3) } }, root);
  for (const r of [0, 0.3, 0.6, 0.99]) {
    assert.ok(pickSameScenario(strata[0].items, 3, () => r).every((it) => it.scenario === "s1"));
  }
  assert.deepEqual(pickSameScenario(strata[0].items, 4, () => 0.5), []);
});

test("pickSameScenario covers every goal it can before repeating one", () => {
  // One scenario of five: four on ga and one, the fourth, on gb.
  const goals = ["ga", "ga", "ga", "gb", "ga"];
  const root = workspace({
    "learning-topics/t1/tasks/a-g/s1.md": qs(5),
    "learning-topics/t1/rubrics/a-g/s1.md": goals.map((g, i) => `### q${i + 1}\n\n- **answer:** A.\n- **goal:** ${g}\n`).join("\n"),
  });
  const { strata, problems } = drawn({ draw: { "learning-topics/t1/a-g": same(2) } }, root);
  assert.deepEqual(problems, []);
  const picked = new Set();
  for (let i = 0; i < 40; i++) {
    let x = i / 40;
    const next = () => ((x = (x * 7.31 + 0.17) % 1), x);
    for (const take of [2, 3]) {
      const got = pickSameScenario(strata[0].items, take, next);
      assert.equal(got.length, take);
      assert.ok(got.some((it) => it.goals.includes("gb")), `take ${take} includes the one gb question`);
      const order = strata[0].items.map((it) => it.id);
      assert.deepEqual(got.map((it) => order.indexOf(it.id)), got.map((it) => order.indexOf(it.id)).sort((a, b) => a - b));
      for (const it of got) picked.add(it.id);
    }
  }
  // The ga questions still vary, so the spread does not fix which of them is drawn.
  assert.ok(picked.size >= 4);
});

test("a sameScenario practice draw serves one scenario's questions together", () => {
  const root = workspace(T1);
  const pool = { draw: { "learning-topics/t1/items": 1, "learning-topics/t1/a-x": same(3) } };
  for (const seed of ["a", "b", "c"]) {
    const { items, problems } = drawPractice(pool, root, { seed });
    assert.deepEqual(problems, []);
    assert.equal(items.length, 4);
    assert.deepEqual(items.slice(1).map((i) => i.label), ["a-x/s1/q1", "a-x/s1/q2", "a-x/s1/q3"]);
    assert.ok(items[2].prompt.startsWith(SAME_SCENARIO_NOTE) && items[3].prompt.startsWith(SAME_SCENARIO_NOTE));
  }
});

test("a sameScenario practice draw prefers a scenario the student has not seen", () => {
  const root = workspace({
    ...T1,
    "learning-topics/t1/evidence/attempts.jsonl": JSON.stringify({ at: "2026-09-01T00:00:00Z", label: "a-x/s1/q2" }) + "\n",
  });
  for (const seed of ["a", "b", "c", "d", "e", "f"]) {
    const { items } = drawPractice({ draw: { "learning-topics/t1/a-x": same(2) } }, root, { seed });
    assert.deepEqual(items.map((i) => i.label), ["a-x/s2/q1", "a-x/s2/q2"]);
  }
});

// BACKWARD COMPATIBILITY against the real pools and the real sources: every published pool must
// draw the same strata, sizes and problems as bank.mjs did at BASELINE. The old module is written
// to a temp tree that mirrors its relative import of moves.mjs.
//
// MOVE THE BASELINE WHEN THE POOL FORMAT GROWS, not when this fails. A pool using something the
// baseline cannot read (an exclude naming a qualified folder id, say) differs because the format
// changed, which is a decision, not a regression. The baseline is then the commit that made the
// change, and every pool should still draw the same against it.
const BASELINE = "c14b879";
test(`every real pool draws as it did at ${BASELINE}`, async (t) => {
  const ROOT = process.env.SOURCES_ROOT ?? resolve(REPO, "..");
  let oldSrc;
  try {
    oldSrc = execFileSync("git", ["show", `${BASELINE}:workflows/quiz/tools/lib/bank.mjs`], { cwd: REPO, encoding: "utf8" });
  } catch {
    t.skip(`commit ${BASELINE} is not available`);
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
  let compared = 0;
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".pool.json")).sort()) {
    const pool = JSON.parse(readFileSync(join(dir, name), "utf8"));
    const sources = pool.topic
      ? [join("learning-topics", pool.topic)]
      : Object.keys(pool.draw ?? {}).flatMap(keyParts).map((k) => k.split("/").slice(0, -1).join("/"));
    const missing = sources.filter((s) => !existsSync(join(ROOT, s)));
    if (missing.length) {
      t.diagnostic(`${name}: skipped, ${missing.join(", ")} not under ${ROOT}`);
      continue;
    }
    // Framing problems are new on purpose, and the learning-topics migration clears them.
    const shape = (r) => ({
      strata: r.strata.map((s) => [s.name, s.take, s.items.length]),
      problems: r.problems.filter((p) => !p.endsWith(" (framing rule)")),
    });
    const before = shape(old.applyPool(old.readPoolSources(pool, ROOT), pool));
    const after = shape(applyPool(readPoolSources(pool, ROOT), pool));
    assert.deepEqual(after, before, name);
    t.diagnostic(`${name}: same ${JSON.stringify(after.strata)}, ${after.problems.length} problems`);
    compared++;
  }
  // A run that compared nothing proved nothing, and should say so rather than pass.
  if (!compared) t.skip(`no pool's sources are under ${ROOT}`);
});
