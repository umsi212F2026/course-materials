import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { check, attest } from "../changes.mjs";
import { parseRecord } from "../lib/record.mjs";
import { passingRepo, emptyRepo, write, remove, commit, changes, entryText, FIELDS, bpmn } from "./repo.mjs";

const TOOL = join(dirname(fileURLToPath(import.meta.url)), "..", "changes.mjs");
const NAMES = [
  "initial design named",
  "initial design has a diagram and a skill",
  "diagram",
  "skills",
  "examples",
  "entries",
  "own words",
  "attested",
  "pushed",
];
const item = (r, name) => r.items.find((i) => i.name === name);
// Most tests change the working tree without committing, which `pushed` reports; it has tests
// of its own below.
const failing = (r) => r.items.filter((i) => !i.ok && i.name !== "pushed").map((i) => i.name);

test("a complete repository passes every item, in order", () => {
  const { repo } = passingRepo();
  const r = check(repo);
  assert.deepEqual(r.items.map((i) => i.name), NAMES);
  assert.deepEqual(failing(r), []);
  assert.equal(r.ok, true);
});

test("the placeholder line fails only the items that need an initial design", () => {
  const { repo } = passingRepo();
  const text = readFileSync(join(repo, "ps5/CHANGES.md"), "utf8").replace(/Initial design: .*/, "Initial design: <commit hash>");
  write(repo, "ps5/CHANGES.md", text);
  const r = check(repo);
  assert.deepEqual(failing(r), ["initial design named", "initial design has a diagram and a skill"]);
  assert.match(item(r, "initial design named").detail, /does not name/);
  assert.equal(r.ok, false);
});

test("a hash not in history is named as such", () => {
  const { repo } = passingRepo();
  const text = readFileSync(join(repo, "ps5/CHANGES.md"), "utf8").replace(/Initial design: .*/, "Initial design: deadbee");
  write(repo, "ps5/CHANGES.md", text);
  const r = check(repo);
  assert.equal(item(r, "initial design named").ok, false);
  assert.match(item(r, "initial design named").detail, /deadbee/);
});

test("an initial design with no skill fails that item only", () => {
  const repo = emptyRepo();
  write(repo, "ps5/workflow.bpmn", "<definitions/>\n");
  const initial = commit(repo, "diagram only");
  const commits = [1, 2].map((i) => {
    write(repo, "ps5/skills/extract/SKILL.md", `# extract ${i}\n`);
    return commit(repo, `extract ${i}`);
  });
  for (let i = 1; i <= 10; i++) {
    write(repo, `ps5/examples/e${i}/input.txt`, "x\n");
    write(repo, `ps5/examples/e${i}/output.txt`, "y\n");
  }
  const at = (n) => entryText(n, { fields: { ...FIELDS, commit: commits[n - 1] } });
  write(repo, "ps5/CHANGES.md", changes(initial, [at(1), at(2)]));
  commit(repo, "rest");
  assert.deepEqual(failing(check(repo)), ["initial design has a diagram and a skill"]);
});

test("no diagram now fails diagram", () => {
  const { repo } = passingRepo();
  remove(repo, "ps5/workflow.bpmn");
  assert.deepEqual(failing(check(repo)), ["diagram"]);
});

test("no skills now fails skills", () => {
  const { repo } = passingRepo();
  remove(repo, "ps5/skills");
  assert.deepEqual(failing(check(repo)), ["skills"]);
});

test("nine examples fails examples", () => {
  const { repo } = passingRepo();
  remove(repo, "ps5/examples/e10");
  const r = check(repo);
  assert.deepEqual(failing(r), ["examples"]);
  assert.match(item(r, "examples").detail, /9/);
});

test("an example missing its output fails examples and is named", () => {
  const { repo } = passingRepo();
  remove(repo, "ps5/examples/e03/output.json");
  const r = check(repo);
  assert.deepEqual(failing(r), ["examples"]);
  assert.match(item(r, "examples").detail, /e03/);
});

test("one qualifying entry fails entries", () => {
  const { repo, initial, entry } = passingRepo();
  const agentOnly = { ...FIELDS, whoNoticed: "the agent", whoChose: "the agent" };
  write(repo, "ps5/CHANGES.md", changes(initial, [entry(1), entry(2, { fields: agentOnly })]));
  assert.deepEqual(failing(check(repo)), ["entries"]);
});

test("a problem in the record fails entries and says where", () => {
  const { repo } = passingRepo();
  const text = readFileSync(join(repo, "ps5/CHANGES.md"), "utf8").replace("- **Who noticed:** me\n", "");
  write(repo, "ps5/CHANGES.md", text);
  const r = check(repo);
  assert.deepEqual(failing(r), ["entries"]);
  assert.match(item(r, "entries").detail, /line \d+/);
});

test("an empty own-words part fails own words and attested", () => {
  const { repo, initial, entry } = passingRepo();
  write(repo, "ps5/CHANGES.md", changes(initial, [entry(1), entry(2, { why: "", attest: false })]));
  const r = check(repo);
  assert.deepEqual(failing(r), ["own words", "attested"]);
  assert.match(item(r, "own words").detail, /entry 2/);
});

test("a stale part fails attested and is named", () => {
  const { repo } = passingRepo();
  const text = readFileSync(join(repo, "ps5/CHANGES.md"), "utf8").replace("noticed 2", "noticed 2, edited later");
  write(repo, "ps5/CHANGES.md", text);
  const r = check(repo);
  assert.deepEqual(failing(r), ["attested"]);
  assert.match(item(r, "attested").detail, /entry 2.*stale/);
});

test("no CHANGES.md at all fails, without throwing", () => {
  const { repo } = passingRepo();
  remove(repo, "ps5/CHANGES.md");
  const r = check(repo);
  assert.equal(r.ok, false);
  assert.equal(item(r, "initial design named").ok, false);
});

test("attest makes a part fresh", () => {
  const { repo, initial, entry } = passingRepo();
  write(repo, "ps5/CHANGES.md", changes(initial, [entry(1), entry(2, { attest: false })]));
  assert.equal(attest(repo, 2, "noticed", "2026-11-18"), "attested entry 2, noticed");
  const r = parseRecord(readFileSync(join(repo, "ps5/CHANGES.md"), "utf8"));
  assert.equal(r.entries[1].parts.noticed.attestation, "fresh");
  assert.equal(r.entries[1].parts.why.attestation, "missing");
});

test("the CLI prints check as JSON and exits 0 even when items fail", () => {
  const { repo } = passingRepo();
  remove(repo, "ps5/workflow.bpmn");
  const out = execFileSync(process.execPath, [TOOL, "check", repo], { encoding: "utf8" });
  assert.equal(JSON.parse(out).ok, false);
});

test("the CLI exits 1 with one line when it cannot run", () => {
  const r = spawnSync(process.execPath, [TOOL, "check", "/no/such/repo"], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.equal(r.stderr.trim().split("\n").length, 1);
  const bad = spawnSync(process.execPath, [TOOL, "frobnicate"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
});

test("the CLI parse command prints the parsed record", () => {
  const { repo } = passingRepo();
  const out = JSON.parse(execFileSync(process.execPath, [TOOL, "parse", repo], { encoding: "utf8" }));
  assert.equal(out.entries.length, 2);
});

test("an entry whose commit is not in history fails entries and names it", () => {
  const { repo, initial, entry } = passingRepo();
  write(repo, "ps5/CHANGES.md", changes(initial, [entry(1), entry(2, { fields: { commit: "deadbee" } })]));
  const r = check(repo);
  assert.deepEqual(failing(r), ["entries"]);
  assert.match(item(r, "entries").detail, /entry 2.*deadbee/);
});

test("an entry whose commit does not touch what it names fails entries", () => {
  const { repo, initial, entry } = passingRepo();
  write(repo, "ps5/CHANGES.md", changes(initial, [entry(1), entry(2, { fields: { changed: "diagram" } })]));
  const r = check(repo);
  assert.deepEqual(failing(r), ["entries"]);
  assert.match(item(r, "entries").detail, /entry 2.*diagram/);
});

test("a diagram entry whose commit only changes the layout fails entries", () => {
  const { repo, initial, entry } = passingRepo();
  write(repo, "ps5/workflow.bpmn", bpmn());
  commit(repo, "diagram: extract the deadline");
  write(repo, "ps5/workflow.bpmn", bpmn({ x: 300, version: "5.31.0" }));
  const moved = commit(repo, "tidy the diagram");
  write(repo, "ps5/CHANGES.md", changes(initial, [entry(1), entry(2, { fields: { commit: moved.slice(0, 7), changed: "diagram" } })]));
  assert.match(item(check(repo), "entries").detail, /entry 2.*only.*layout/);
});

test("an entry whose commit is the initial design or before it fails entries", () => {
  const { repo, initial, entry } = passingRepo();
  write(repo, "ps5/CHANGES.md", changes(initial, [entry(1), entry(2, { fields: { commit: initial.slice(0, 7), changed: "diagram" } })]));
  const r = check(repo);
  assert.deepEqual(failing(r), ["entries"]);
  assert.match(item(r, "entries").detail, /entry 2.*after the initial design/);
});

test("a complete, pushed repository passes pushed", () => {
  const { repo } = passingRepo();
  assert.equal(item(check(repo), "pushed").ok, true);
});

test("uncommitted work under ps5 fails pushed", () => {
  const { repo } = passingRepo();
  write(repo, "ps5/examples/e11/input.txt", "new\n");
  const r = check(repo);
  assert.equal(item(r, "pushed").ok, false);
  assert.match(item(r, "pushed").detail, /not committed/);
});

test("commits not yet pushed fail pushed", () => {
  const { repo } = passingRepo();
  write(repo, "ps5/examples/e11/input.txt", "new\n");
  commit(repo, "one more");
  const r = check(repo);
  assert.equal(item(r, "pushed").ok, false);
  assert.match(item(r, "pushed").detail, /1 commit.*not pushed/);
});

test("a repository with no remote fails pushed", () => {
  const { repo } = passingRepo();
  execFileSync("git", ["-C", repo, "remote", "remove", "origin"]);
  assert.match(item(check(repo), "pushed").detail, /push/);
  assert.equal(item(check(repo), "pushed").ok, false);
});

test("a record with Windows line endings checks the same", () => {
  const { repo } = passingRepo();
  const text = readFileSync(join(repo, "ps5/CHANGES.md"), "utf8").replace(/\n/g, "\r\n");
  write(repo, "ps5/CHANGES.md", text);
  assert.deepEqual(failing(check(repo)), []);
});

test("a missing initial design line is told apart from the placeholder", () => {
  const { repo } = passingRepo();
  const text = readFileSync(join(repo, "ps5/CHANGES.md"), "utf8").replace(/Initial design: .*\n/, "");
  write(repo, "ps5/CHANGES.md", text);
  assert.match(item(check(repo), "initial design named").detail, /no "Initial design:" line/);
});
