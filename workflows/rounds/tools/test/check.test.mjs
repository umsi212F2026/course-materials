import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { check } from "../rounds.mjs";
import { readSubmit } from "../lib/submit.mjs";
import { passingProject, assignmentsRepo, submitText, write, commit, git, emptyRepo, withRemote } from "./repo.mjs";

const TOOL = join(dirname(fileURLToPath(import.meta.url)), "..", "rounds.mjs");
const item = (result, name) => result.items.find((i) => i.name === name);
const NAMES = ["base named", "base in place", "two rounds", "own words", "attested", "project pushed", "README", "SUBMIT.md", "assignments pushed"];

function fresh(opts) {
  return { p: passingProject(opts), assignments: assignmentsRepo() };
}

test("a complete workflow project passes every item, in order", () => {
  const { p, assignments } = fresh();
  const r = check(p.dir, { assignments });
  assert.deepEqual(r.items.map((i) => i.name), NAMES);
  assert.deepEqual(r.items.filter((i) => !i.ok), []);
  assert.equal(r.ok, true);
});

test("a project in a subfolder passes, and a sibling ps5 does not fail project pushed", () => {
  const p = passingProject({ prefix: "project/" });
  const assignments = assignmentsRepo();
  const r = check(p.dir, { assignments });
  assert.deepEqual(r.items.filter((i) => !i.ok), []);
  write(p.repo, "ps5/CHANGES.md", "# ps5 edited\n");
  assert.equal(item(check(p.dir, { assignments }), "project pushed").ok, true);
  commit(p.repo, "ps5 only");
  const after = check(p.dir, { assignments });
  assert.equal(item(after, "project pushed").ok, true);
  assert.equal(after.ok, true);
  write(p.repo, "project/src/new.js", "x\n");
  assert.equal(item(check(p.dir, { assignments }), "project pushed").ok, false);
});

test("negotiated with Work: project/ passes SUBMIT.md", () => {
  const empty = emptyRepo();
  write(empty, "README.md", "x\n");
  commit(empty, "x");
  const a = assignmentsRepo({ submit: submitText({ kind: "negotiated", work: "project/" }), terms: "# Terms\n" });
  assert.equal(item(check(empty, { assignments: a }), "SUBMIT.md").ok, true);
});

test("base named fails without a usable Base", () => {
  const { p, assignments } = fresh();
  write(p.repo, "ROUNDS.md", "# Rounds\n\nBase: <commit hash>\n");
  commit(p.repo, "reset");
  const r = check(p.dir, { assignments });
  assert.equal(item(r, "base named").ok, false);
  assert.equal(item(r, "base in place").ok, false);
  assert.equal(r.ok, false);
});

test("base named fails for a hash that is not a commit", () => {
  const { p, assignments } = fresh();
  write(p.repo, "ROUNDS.md", "# Rounds\n\nBase: deadbeef\n");
  assert.equal(item(check(p.dir, { assignments }), "base named").ok, false);
});

test("base in place fails when the base lacks examples", () => {
  const { p, assignments } = fresh();
  const r0 = emptyRepo();
  write(r0, "workflow.bpmn", "<definitions/>\n");
  write(r0, "skills/x/SKILL.md", "# x\n");
  write(r0, "examples/e1/input.txt", "x\n");
  write(r0, "examples/e1/output.json", "{}\n");
  write(r0, "examples/e2/input.txt", "x\n");
  const base = commit(r0, "base");
  write(r0, "ROUNDS.md", `# Rounds\n\nBase: ${base.slice(0, 7)}\n`);
  commit(r0, "record");
  withRemote(r0);
  const r = check(r0, { assignments });
  const it = item(r, "base in place");
  assert.equal(it.ok, false);
  assert.match(it.detail, /1 processed/);
  assert.match(it.detail, /\.bpmn|10/);
  assert.equal(item(check(p.dir, { assignments }), "base in place").ok, true);
});

test("base in place counts examples at the base, not at HEAD", () => {
  const { p, assignments } = fresh();
  write(p.repo, "examples/e11/input.txt", "x\n");
  write(p.repo, "examples/e11/output.json", "{}\n");
  commit(p.repo, "later");
  assert.match(item(check(p.dir, { assignments }), "base in place").detail, /10 processed/);
});

test("base in place for deployed says checked live", () => {
  const { p } = fresh();
  const assignments = assignmentsRepo({ submit: submitText({ kind: "deployed" }) });
  const it = item(check(p.dir, { assignments }), "base in place");
  assert.equal(it.ok, true);
  assert.equal(it.detail, "checked live");
});

test("two rounds fails with one valid round", () => {
  const { p, assignments } = fresh();
  const text = git(p.repo, "show", "HEAD:ROUNDS.md");
  write(p.repo, "ROUNDS.md", text.replace(/- \*\*Commits:\*\* .*\n(?=[\s\S]*Commits)/, "- **Commits:** deadbeef\n"));
  commit(p.repo, "break round 1");
  const r = check(p.dir, { assignments });
  assert.equal(item(r, "two rounds").ok, false);
  assert.match(item(r, "two rounds").detail, /1 valid/);
});

test("two rounds names plans at the top of the repository for a project in a subfolder", () => {
  const p = passingProject({ prefix: "project/" });
  const assignments = assignmentsRepo();
  assert.doesNotMatch(item(check(p.dir, { assignments }), "two rounds").detail, /top of the repository/);
  write(p.repo, "docs/superpowers/plans/2026-11-24-stray.md", "# stray\n");
  commit(p.repo, "stray plan");
  const detail = item(check(p.dir, { assignments }), "two rounds").detail;
  assert.match(detail, /docs\/superpowers\/plans\/2026-11-24-stray\.md/);
  assert.match(detail, /Move specs and plans into the project folder/);
});

test("own words fails when a part is empty", () => {
  const { p, assignments } = fresh();
  const text = git(p.repo, "show", "HEAD:ROUNDS.md");
  write(p.repo, "ROUNDS.md", text.replace(/new 1\n\n<!-- attested[^\n]*\n/, ""));
  commit(p.repo, "empty part");
  const it = item(check(p.dir, { assignments }), "own words");
  assert.equal(it.ok, false);
  assert.match(it.detail, /round 2/);
});

test("attested fails when a part was edited after attesting", () => {
  const { p, assignments } = fresh();
  const text = git(p.repo, "show", "HEAD:ROUNDS.md");
  write(p.repo, "ROUNDS.md", text.replace("why 0", "why zero"));
  commit(p.repo, "edit");
  const it = item(check(p.dir, { assignments }), "attested");
  assert.equal(it.ok, false);
  assert.match(it.detail, /round 1 why is stale/);
});

test("project pushed fails when uncommitted, and when unpushed", () => {
  const { p, assignments } = fresh();
  write(p.repo, "src/new.js", "x\n");
  const dirty = item(check(p.dir, { assignments }), "project pushed");
  assert.equal(dirty.ok, false);
  assert.match(dirty.detail, /not committed/);
  commit(p.repo, "more");
  const ahead = item(check(p.dir, { assignments }), "project pushed");
  assert.equal(ahead.ok, false);
  assert.match(ahead.detail, /not pushed/);
});

test("README fails when missing, warns when a title is not found", () => {
  const { assignments } = fresh();
  const deployed = assignmentsRepo({ submit: submitText({ kind: "deployed" }) });
  const none = passingProject();
  git(none.repo, "rm", "-q", "README.md");
  commit(none.repo, "no readme");
  const missing = item(check(none.dir, { assignments: deployed }), "README");
  assert.equal(missing.ok, false);

  const partial = passingProject({ readme: "# Project\n\nThe parser.\n" });
  const warned = item(check(partial.dir, { assignments: deployed }), "README");
  assert.equal(warned.ok, true);
  assert.match(warned.detail, /exporter/);
  assert.doesNotMatch(warned.detail, /parser/);

  const full = item(check(passingProject().dir, { assignments: deployed }), "README");
  assert.equal(full.ok, true);
  assert.equal(item(check(none.dir, { assignments }), "README").ok, true);
});

test("SUBMIT.md fails for a template left in place, or a bad Work", () => {
  const p = passingProject();
  const bad = (opts) => item(check(p.dir, { assignments: assignmentsRepo({ submit: submitText(opts) }) }), "SUBMIT.md");
  assert.equal(bad({}).ok, true);
  assert.equal(bad({ showcase: "<https://github.com/umsi212F2026/student-showcase/pull/N>" }).ok, false);
  assert.equal(bad({ kind: "deployed", work: "project/" }).ok, true);
  assert.equal(bad({ extendsPs: "PS9" }).ok, false);
  assert.equal(bad({ showcase: "https://example.com/x" }).ok, false);
});

test("workflow with Work: project/ fails SUBMIT.md", () => {
  const p = passingProject();
  const it = item(check(p.dir, { assignments: assignmentsRepo({ submit: submitText({ work: "project/" }) }) }), "SUBMIT.md");
  assert.equal(it.ok, false);
  assert.match(it.detail, /project\//);
});

test("SUBMIT.md fails when the file is missing", () => {
  const p = passingProject();
  const it = item(check(p.dir, { assignments: assignmentsRepo({ submit: null }) }), "SUBMIT.md");
  assert.equal(it.ok, false);
});

test("assignments pushed fails when project/ is uncommitted or unpushed", () => {
  const p = passingProject();
  const a = assignmentsRepo();
  assert.equal(item(check(p.dir, { assignments: a }), "assignments pushed").ok, true);
  write(a, "project/NOTES.md", "x\n");
  assert.equal(item(check(p.dir, { assignments: a }), "assignments pushed").ok, false);
  commit(a, "notes");
  const it = item(check(p.dir, { assignments: a }), "assignments pushed");
  assert.equal(it.ok, false);
  assert.match(it.detail, /not pushed/);
});

test("negotiated skips the rounds items and needs TERMS.md", () => {
  const empty = emptyRepo();
  write(empty, "README.md", "x\n");
  commit(empty, "x");
  const submit = submitText({ kind: "negotiated" });
  const without = check(empty, { assignments: assignmentsRepo({ submit }) });
  assert.deepEqual(without.items.map((i) => i.name), ["TERMS.md", "SUBMIT.md", "assignments pushed"]);
  assert.equal(item(without, "TERMS.md").ok, false);
  assert.equal(without.ok, false);
  const withTerms = check(empty, { assignments: assignmentsRepo({ submit, terms: "# Terms\n" }) });
  assert.deepEqual(withTerms.items.filter((i) => !i.ok), []);
  assert.equal(withTerms.ok, true);
});

test("check without --assignments reports the SUBMIT items failing", () => {
  const { p } = fresh();
  const r = check(p.dir, {});
  assert.equal(item(r, "SUBMIT.md").ok, false);
  assert.equal(item(r, "assignments pushed").ok, false);
});

test("readSubmit reads the four lines and nulls a placeholder", () => {
  const a = assignmentsRepo({ submit: "# Final project submission\n\nKind: <deployed | workflow | negotiated>\nExtends: PS2\nWork: <https://github.com/you/your-repo | project/>\nShowcase: https://github.com/o/r/pull/3\n" });
  const s = readSubmit(a);
  assert.equal(s.kind, null);
  assert.equal(s.extends, "PS2");
  assert.equal(s.work, null);
  assert.equal(s.showcase, "https://github.com/o/r/pull/3");
  const ok = readSubmit(assignmentsRepo());
  assert.deepEqual(ok, { kind: "workflow", extends: "PS3", work: "https://github.com/me/proj", showcase: "https://github.com/umsi212F2026/student-showcase/pull/7", problems: [] });
  assert.ok(readSubmit(assignmentsRepo({ submit: null })).problems.length);
});

test("the CLI prints the items as JSON and exits 0 even when some fail", () => {
  const { p } = fresh();
  const a = assignmentsRepo({ submit: submitText({ showcase: "<x>" }) });
  const run = spawnSync("node", [TOOL, "check", p.dir, "--assignments", a, "--online"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const out = JSON.parse(run.stdout);
  assert.equal(out.ok, false);
  assert.deepEqual(out.items.slice(0, NAMES.length).map((i) => i.name), NAMES);
  assert.equal(item(out, "showcase pull request").ok, false);
  assert.equal(item(out, "project URL answers").detail, "no showcase card to read the project URL from");
});
