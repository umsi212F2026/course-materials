import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { assignmentsDir, preparePersonal, resumePersonal } from "../practice.mjs";
import { buildFixture } from "./fixtures/ps5.mjs";

const scratch = () => mkdtempSync(join(tmpdir(), "ps5-practice-"));
const headOf = (repo) => execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const put = (dir, path, text) => { mkdirSync(join(dir, path, ".."), { recursive: true }); writeFileSync(join(dir, path), text); };

// ---- assignmentsDir ----

test("assignmentsDir reads the Assignments line", () => {
  const f = buildFixture(join(scratch(), "elsewhere"), {});
  const codexHome = scratch();
  writeFileSync(join(codexHome, "AGENTS.md"), `# Me\n\nLearning topics: /nowhere\nassignments:   ${f.repo}  \n`);
  assert.equal(assignmentsDir({ codexHome, materials: join(scratch(), "course-materials") }), f.repo);
});

test("assignmentsDir falls back to the sibling", () => {
  const parent = scratch();
  buildFixture(join(parent, "assignments"), {});
  const codexHome = scratch();
  assert.equal(assignmentsDir({ codexHome, materials: join(parent, "course-materials") }), join(parent, "assignments"));
  // A sibling that is not a git clone is no clone at all.
  const bare = scratch();
  mkdirSync(join(bare, "assignments"));
  assert.equal(assignmentsDir({ codexHome, materials: join(bare, "course-materials") }), null);
  assert.equal(assignmentsDir({ codexHome, materials: join(scratch(), "course-materials") }), null);
});

// ---- preparePersonal ----

test("preparePersonal writes material from HEAD, not the working tree", () => {
  const f = buildFixture(scratch(), {});
  // Two lines added above the committed ones would shift every line number below them.
  put(f.repo, "ps5/skills/extract/SKILL.md", "# extract\n\nAsk the poster.\nThen ask again.\n\nTake the later deadline.\n");
  const out = scratch();
  const r = preparePersonal({ assignments: f.repo, out, ps: "ps5" });
  assert.equal(r.material, join(out, "personal-material.md"));
  assert.equal(r.sha, headOf(f.repo));
  const text = readFileSync(r.material, "utf8");
  assert.match(text, /1: # extract\n2: \n3: Take the later deadline\./);
  assert.ok(!text.includes("Ask the poster."));
  assert.ok(text.includes(r.sha));
  assert.ok(text.includes("p-ps5-practice-<kind>"));
  assert.ok(text.includes(join(out, "personal-candidates.json")));
  assert.ok(text.includes('"addressed"'), "the schema is in the material");
  assert.ok(text.includes("# Drafting personal questions"));
  assert.ok(text.includes("# PS5: what to ask a student about their own workflow"));
  assert.match(text, /1: Student: Check the deadline \(task\)/);
  assert.match(text, /1: Entry 1, numbered 1: qualifies/);
  assert.equal(readFileSync(join(out, "head/ps5/skills/extract/SKILL.md"), "utf8"), "# extract\n\nTake the later deadline.\n");
});

test("preparePersonal flags uncommitted PS5 changes", () => {
  const f = buildFixture(scratch(), {});
  assert.equal(preparePersonal({ assignments: f.repo, out: scratch(), ps: "ps5" }).uncommitted, false);
  // A change outside the PS5 folder is not PS5's.
  put(f.repo, "notes.txt", "x\n");
  assert.equal(preparePersonal({ assignments: f.repo, out: scratch(), ps: "ps5" }).uncommitted, false);
  put(f.repo, "ps5/README.md", "my workflow\n");
  assert.equal(preparePersonal({ assignments: f.repo, out: scratch(), ps: "ps5" }).uncommitted, true);
});

test("preparePersonal is short when HEAD has no ps5 work but the working tree does", () => {
  const f = buildFixture(scratch(), { noFolder: true });
  put(f.repo, "ps5/CHANGES.md", "# Change record\n\nInitial design: abcdef1\n");
  put(f.repo, "ps5/workflow.bpmn", "<bpmn/>\n");
  const r = preparePersonal({ assignments: f.repo, out: scratch(), ps: "ps5" });
  assert.equal(r.short, "no PS5 work in your last commit, so no personal questions could be drafted");
  assert.equal(r.uncommitted, true);
});

test("preparePersonal is short when there is no clone", () => {
  assert.deepEqual(preparePersonal({ assignments: null, out: scratch(), ps: "ps5" }), {
    short: "no assignments clone was found, so no personal questions could be drafted",
  });
});

// ---- resumePersonal ----

function prepared(edit) {
  const f = buildFixture(scratch(), {});
  if (edit) edit(f.repo);
  const out = scratch();
  const { sha } = preparePersonal({ assignments: f.repo, out, ps: "ps5" });
  return { repo: f.repo, out, sha };
}

const ALT_PROMPT = "From `ps5/skills/extract/SKILL.md`:\n\n> 3: Take the later deadline.\n\nIs that better than asking the poster?";
const INJ_PROMPT = "From `generated/diagram.txt`:\n\n> 1: Student: Check the deadline (task)\n\nIs it safe?";

const cand = (sha, id, extra = {}) => ({
  id, type: "free", prompt: ALT_PROMPT, expected: "An answer.", rubric: "Full credit for a trade-off.",
  evidence: [{ file: "ps5/skills/extract/SKILL.md", lines: "3", sha }], ...extra,
});
const injection = (sha, id = "p-ps5-practice-injection") =>
  cand(sha, id, { prompt: INJ_PROMPT, evidence: [{ file: "generated/diagram.txt", lines: "1", sha }] });

const writeCandidates = (out, candidates) =>
  writeFileSync(join(out, "personal-candidates.json"), JSON.stringify({ candidates, addressed: "" }));

test("resumePersonal drops a candidate quoting a line not in HEAD, naming the line", () => {
  const p = prepared((repo) => put(repo, "ps5/skills/extract/SKILL.md", "# extract\n\nTake the later deadline.\nAsk the poster.\n"));
  writeCandidates(p.out, [
    cand(p.sha, "p-ps5-practice-alt-1", { prompt: "> 4: Ask the poster.\n\nWhy?", evidence: [{ file: "ps5/skills/extract/SKILL.md", lines: "4", sha: p.sha }] }),
    injection(p.sha),
  ]);
  const r = resumePersonal({ assignments: p.repo, out: p.out, sha: p.sha, ps: "ps5", seed: "s" });
  assert.deepEqual(r.dropped, [{ id: "p-ps5-practice-alt-1", reason: `ps5/skills/extract/SKILL.md has no such lines 4 at ${p.sha.slice(0, 7)}` }]);
  assert.deepEqual(r.items.map((i) => i.id), ["p-ps5-practice-injection"]);
  assert.equal(r.short, "only 1 of your drafted personal questions passed the check");
});

test('resumePersonal drops a misspelled id with "id must be p-ps5-practice-<kind>"', () => {
  const p = prepared();
  writeCandidates(p.out, [cand(p.sha, "p-ps5-practise-alt-1"), cand(p.sha, "p-ps5-practice-alternative"), injection(p.sha)]);
  const r = resumePersonal({ assignments: p.repo, out: p.out, sha: p.sha, ps: "ps5", seed: "s" });
  assert.deepEqual(r.dropped, [
    { id: "p-ps5-practise-alt-1", reason: "id must be p-ps5-practice-<kind>" },
    { id: "p-ps5-practice-alternative", reason: "id must be p-ps5-practice-<kind>" },
  ]);
  assert.equal(r.items.length, 1);
});

test("resumePersonal gives one alt and one injection from two alts and an injection", () => {
  const p = prepared();
  writeCandidates(p.out, [cand(p.sha, "p-ps5-practice-alt-1"), cand(p.sha, "p-ps5-practice-alt-2"), injection(p.sha)]);
  const r = resumePersonal({ assignments: p.repo, out: p.out, sha: p.sha, ps: "ps5", seed: "s" });
  assert.deepEqual(r.dropped, []);
  assert.equal(r.short, null);
  assert.equal(r.items.length, 2);
  assert.match(r.items[0].id, /^p-ps5-practice-alt-[12]$/);
  assert.equal(r.items[1].id, "p-ps5-practice-injection");
  assert.deepEqual(Object.keys(r.items[0]).sort(), ["expected", "id", "prompt", "rubric", "type"]);
});

test("resumePersonal names a missing or malformed candidates file", () => {
  const p = prepared();
  const file = join(p.out, "personal-candidates.json");
  const resume = () => resumePersonal({ assignments: p.repo, out: p.out, sha: p.sha, ps: "ps5", seed: "s" });
  assert.throws(resume, (e) => e.message.includes(file) && /was not found/.test(e.message));
  writeFileSync(file, "{ candidates: [");
  assert.throws(resume, (e) => e.message.includes(file) && /is not valid JSON/.test(e.message));
  writeFileSync(file, JSON.stringify({ candidate: [] }));
  assert.throws(resume, (e) => e.message.includes(file) && /has no "candidates" list/.test(e.message));
  // A candidate that is not an object is dropped, not crashed on.
  writeCandidates(p.out, [null, "x", cand(p.sha, "p-ps5-practice-lane", { evidence: [null] }), cand(p.sha, "p-ps5-practice-alt-1"), injection(p.sha)]);
  const r = resume();
  assert.deepEqual(r.dropped, [
    { id: null, reason: "candidate 1 is not an object" },
    { id: null, reason: "candidate 2 is not an object" },
    { id: "p-ps5-practice-lane", reason: "evidence must be a list of { file, lines, sha }" },
  ]);
  assert.equal(r.items.length, 2);
});

test("resumePersonal drops a second candidate with an id already used", () => {
  const p = prepared();
  writeCandidates(p.out, [cand(p.sha, "p-ps5-practice-alt-1"), cand(p.sha, "p-ps5-practice-alt-1"), injection(p.sha)]);
  const r = resumePersonal({ assignments: p.repo, out: p.out, sha: p.sha, ps: "ps5", seed: "s" });
  assert.deepEqual(r.dropped, [{ id: "p-ps5-practice-alt-1", reason: "id p-ps5-practice-alt-1 is used by an earlier candidate" }]);
});

test("the line-number prefix is stripped from served prompts", () => {
  const p = prepared();
  writeCandidates(p.out, [cand(p.sha, "p-ps5-practice-alt-1"), injection(p.sha)]);
  const r = resumePersonal({ assignments: p.repo, out: p.out, sha: p.sha, ps: "ps5", seed: "s" });
  assert.equal(r.items[0].prompt, "From `ps5/skills/extract/SKILL.md`:\n\n> Take the later deadline.\n\nIs that better than asking the poster?");
  assert.equal(r.items[1].prompt, "From `generated/diagram.txt`:\n\n> Student: Check the deadline (task)\n\nIs it safe?");
});
