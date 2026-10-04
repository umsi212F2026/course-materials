// A practice quiz's score rows carry the cases each goal's question exercised, so the skill can
// pass them straight to record-attempt --cases.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../quiz-practice.mjs");

function scored(items, picks) {
  const dir = mkdtempSync(join(tmpdir(), "practice-"));
  const draw = { session: null, date: "2026-10-04", generated: "x", practice: "t", draws: [{ uniqname: "me", canvas_id: null, items }], spares: [] };
  const subs = {
    date: "2026-10-04", exported: "x", state_events: [], spare_claims: [],
    submissions: [{ uniqname: "me", canvas_id: null, version: 1, submitted: "x", answers: picks }],
    drafts: [],
  };
  writeFileSync(join(dir, "draw.json"), JSON.stringify(draw));
  writeFileSync(join(dir, "submissions.json"), JSON.stringify(subs));
  const r = spawnSync(process.execPath, [SCRIPT, "--score", dir], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout).items;
}

const mcq = (id, extra) => ({ id, type: "mcq", prompt: "?", choices: ["a", "b"], answer: 0, topic: "/t", ...extra });

test("a row carries the cases its single goal's question exercised", () => {
  const [row] = scored([mcq("q1", { goal: "c-a", goals: ["c-a"], cases: { "c-a": ["one", "two"] } })], [{ item_id: "q1", text: "0" }]);
  assert.deepEqual(row.cases, ["one", "two"]);
});

test("a multi-goal row carries each goal's cases on its per_goal entry", () => {
  const [row] = scored(
    [mcq("q1", { goals: ["c-a", "c-b"], cases: { "c-a": ["one"] } })],
    [{ item_id: "q1", text: "0" }],
  );
  const by = Object.fromEntries(row.per_goal.map((p) => [p.goal, p.cases]));
  assert.deepEqual(by, { "c-a": ["one"], "c-b": [] });
});
