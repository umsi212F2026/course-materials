// The practice page shows a compound as one question answered part by part, records each part
// under its part key, and scores it as the mean of its parts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { page, record } from "../quiz-practice.mjs";
import { readIds } from "../../../learn/tools/lib/topic.mjs";
import { makeTopic } from "../../../learn/tools/test/helpers.mjs";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../quiz-practice.mjs");

const topic = makeTopic({ goals: "### `c-x`\n- **goal:** x\n- **criterion:** vocabulary\n- **group:** vocabulary\n" });

const compound = {
  id: "c1",
  type: "compound",
  goal: "c-x",
  topic,
  prompt: "Here is the shared stem.",
  parts: [
    { label: "a", type: "mcq", prompt: "Pick one.", choices: ["red", "blue"], answer: 1, expected: "2" },
    { label: "b", type: "free", prompt: "Say why.", rubric: "Mentions blue.", expected: "Because blue.", credit: "full: it names blue" },
  ],
};

test("a compound is one section: the stem once, then each part labelled and named by its part key", () => {
  const html = page([compound], "s");
  assert.equal(html.match(/<section/g).length, 1);
  assert.equal(html.split("Here is the shared stem.").length, 2);
  assert.match(html, />1a</);
  assert.match(html, />1b</);
  assert.equal(html.match(/<input type=radio name="c1#a"/g).length, 2);
  assert.match(html, /<textarea name="c1#b"/);
});

test("a plain question renders as it always did", () => {
  const plain = { id: "q1", type: "free", prompt: "Plain?" };
  assert.match(
    page([plain], "s"),
    /<section><h2>Question 1 of 1<\/h2><div class=prompt><p>Plain\?<\/p>\n?<\/div><textarea name="q1" rows=5 placeholder="Your answer, in your own words"><\/textarea><\/section>/,
  );
});

test("record queues a written part under its part key, with the compound's topic and criterion", () => {
  const dir = mkdtempSync(join(tmpdir(), "practice-"));
  const { queue } = record(dir, "s", [compound], { "c1#a": "0", "c1#b": "x" });
  assert.equal(queue.length, 1);
  assert.equal(queue[0].item, "c1#b");
  assert.equal(queue[0].topic, topic);
  assert.equal(queue[0].criterion, readIds(topic).get("c-x").criterionText);
  assert.ok(queue[0].criterion);
  const onDisk = JSON.parse(readFileSync(join(dir, "queue.json"), "utf8"));
  assert.equal(onDisk.items[0].item, "c1#b");
});

test("--score reports a compound as one row with its parts", () => {
  const dir = mkdtempSync(join(tmpdir(), "practice-"));
  record(dir, "s", [compound], { "c1#a": "0", "c1#b": "x" });
  writeFileSync(join(dir, "verdicts.jsonl"), JSON.stringify({ uniqname: "me", item: "c1#b", credit: "half", missed: "m" }) + "\n");
  const r = spawnSync(process.execPath, [SCRIPT, "--score", dir], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.out_of, 1);
  const [row] = out.items;
  assert.equal(row.credit, "partial");
  assert.equal(row.answer, null);
  assert.equal(row.choices, null);
  assert.equal(row.expected, null);
  assert.deepEqual(row.parts.map((p) => p.label), ["a", "b"]);
  const [a, b] = row.parts;
  assert.equal(a.answer, "red");
  assert.equal(a.expected, "blue");
  assert.deepEqual(a.choices, ["red", "blue"]);
  assert.equal(a.credit, "none");
  assert.equal(b.answer, "x");
  assert.equal(b.credit, "half");
  assert.equal(b.missed, "m");
  assert.equal(b.expected, "Because blue.");
  assert.equal(out.score, 0.25);
});
