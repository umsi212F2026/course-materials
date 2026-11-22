import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { locatePs5 } from "../ps5/locate.mjs";
import { summarizeDiagram } from "../ps5/bpmn.mjs";
import { evaluateRecord } from "../ps5/record.mjs";
import { materialFor } from "../ps5/material.mjs";
import { buildFixture } from "./fixtures/ps5.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scratch = () => mkdtempSync(join(tmpdir(), "ps5-personal-"));

// ---- locatePs5 ----

const PLACEHOLDER = "# Change record\n\nInitial design: <commit hash>\n";
const STARTER = {
  "AGENTS.md": "agents\n", "INSTRUCTIONS.md": "instructions\n", "README.md": "readme\n",
  "examples/README.md": "examples\n", "skills/README.md": "skills\n", "CHANGES.md": PLACEHOLDER,
};
const under = (folder, files) => Object.fromEntries(Object.entries(files).map(([p, b]) => [`${folder}/${p}`, b]));

function locate(files) {
  const dir = scratch();
  try {
    for (const [p, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), body);
    }
    return locatePs5(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("a ps5/ holding only the starter files is missing", () => {
  assert.match(locate(under("ps5", STARTER)).missing, /^No ps5\/ folder with work of your own was found in your assignments repository\.$/);
});
test("ps5/ with a filled record counts", () => {
  assert.deepEqual(locate(under("ps5", { ...STARTER, "CHANGES.md": "# Change record\n\nInitial design: abc1234\n" })), { folder: "ps5" });
});
test("ps5/ with a diagram counts", () => {
  assert.deepEqual(locate(under("ps5", { ...STARTER, "workflow.bpmn": "<x/>" })), { folder: "ps5" });
});
test("ps5-tracker/ with work is found", () => {
  assert.deepEqual(locate({ ...under("ps5", STARTER), ...under("ps5-tracker", { "workflow.bpmn": "<x/>" }) }), { folder: "ps5-tracker" });
});
test("ps5 comes first, then others alphabetically, ignoring case", () => {
  assert.equal(locate({ "PS5-b/a.js": "x", "ps5-a/a.js": "x" }).folder, "ps5-a");
  assert.equal(locate({ "ps5-a/a.js": "x", "ps5/a.js": "x" }).folder, "ps5");
});
test("a large earlier folder does not push ps5 out of view", () => {
  const files = { "ps5/workflow.bpmn": "<x/>" };
  for (let i = 0; i < 5100; i++) files[`a-big/f${i}.txt`] = "x";
  assert.deepEqual(locate(files), { folder: "ps5" });
});
test("nothing found is missing", () => {
  assert.match(locate({ "ps4/README.md": "x" }).missing, /ps5\//);
});

// ---- summarizeDiagram ----

const fixture = (name) => readFileSync(join(here, "../../../diagram/tools/test/fixtures", name), "utf8");

test("three lanes with their steps", () => {
  const s = summarizeDiagram(fixture("three-lanes-placed.bpmn"));
  assert.deepEqual(s.lanes.map((l) => l.name), ["HUMAN operator", "AI AGENT", "PROGRAM"]);
  assert.deepEqual(s.lanes[1].steps.map((x) => [x.name, x.type]), [["Assess posting", "task"]]);
  assert.deepEqual(s.lanes[2].steps.map((x) => [x.name, x.type]), [["Fetch posting", "serviceTask"]]);
  assert.deepEqual(s.start, [{ name: "posting link saved", trigger: "none" }]);
  assert.match(s.text, /^AI AGENT: Assess posting \(task\)$/m);
  assert.match(s.text, /^Start: posting link saved \(none\)$/m);
  assert.match(s.text, /^Flow: posting link saved -> Fetch posting$/m);
});

test("two pools prefix their lanes with the pool name", () => {
  const s = summarizeDiagram(fixture("two-pools-no-di.bpmn"));
  assert.ok(s.lanes.length > 3);
  assert.ok(s.lanes.every((l) => /^(Capture a posting|Review captured postings) \/ /.test(l.name)));
  assert.ok(s.lanes.some((l) => l.name === "Capture a posting / PROGRAM" && l.steps[0].name === "Save posting"));
});

const small = (inner, lanes = `<bpmn:lane id="l" name="L"><bpmn:flowNodeRef>s</bpmn:flowNodeRef></bpmn:lane>`) =>
  `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="p"><bpmn:laneSet id="ls">${lanes}</bpmn:laneSet>${inner}</bpmn:process></bpmn:definitions>`;

test("a timer start event gives trigger timer", () => {
  const s = summarizeDiagram(small(`<bpmn:startEvent id="s" name="Every morning"><bpmn:timerEventDefinition id="t" /></bpmn:startEvent>`));
  assert.deepEqual(s.start, [{ name: "Every morning", trigger: "timer" }]);
});

test("a line break in a step's name becomes a space, and other numeric references decode", () => {
  const s = summarizeDiagram(small(`<bpmn:serviceTask id="s" name="AI AGENT: Assess postings&#10;assess.md &#x27;daily&#39; &amp;#10;" />`));
  assert.equal(s.lanes[0].steps[0].name, "AI AGENT: Assess postings assess.md 'daily' &#10;");
});

test("a step outside any lane lands in (no lane), with its documentation", () => {
  const s = summarizeDiagram(small(`<bpmn:userTask id="u" name="Look"><bpmn:documentation>by hand</bpmn:documentation></bpmn:userTask>`));
  const l = s.lanes.find((x) => x.name === "(no lane)");
  assert.deepEqual(l.steps, [{ id: "u", name: "Look", type: "userTask", doc: "by hand" }]);
});

test("a task inside a subProcess takes the subProcess's lane", () => {
  const s = summarizeDiagram(
    small(`<bpmn:subProcess id="s" name="Sub"><bpmn:task id="inner" name="Check X" /></bpmn:subProcess>`),
  );
  assert.deepEqual(s.lanes.map((l) => l.name), ["L"]);
  assert.deepEqual(s.lanes[0].steps.map((x) => x.name), ["Sub", "Check X"]);
});

test("a step's documentation follows its line, indented, collapsed and capped", () => {
  const long = "x".repeat(400);
  const s = summarizeDiagram(small(
    `<bpmn:task id="s" name="Rank"><bpmn:documentation>Runs skills/rank/SKILL.md
      on the posting</bpmn:documentation></bpmn:task><bpmn:task id="t" name="Save"><bpmn:documentation>${long}</bpmn:documentation></bpmn:task><bpmn:task id="u" name="Plain" />`,
    `<bpmn:lane id="l" name="L"><bpmn:flowNodeRef>s</bpmn:flowNodeRef><bpmn:flowNodeRef>t</bpmn:flowNodeRef><bpmn:flowNodeRef>u</bpmn:flowNodeRef></bpmn:lane>`,
  ));
  assert.equal(s.text, [
    "L: Rank (task)",
    "  documentation: Runs skills/rank/SKILL.md on the posting",
    "L: Save (task)",
    `  documentation: ${"x".repeat(300)} [cut]`,
    "L: Plain (task)",
  ].join("\n"));
});

test("a subProcess's own start event is not a start of the workflow", () => {
  const s = summarizeDiagram(small(
    `<bpmn:startEvent id="s" name="Begin" /><bpmn:subProcess id="sub" name="Sub"><bpmn:startEvent id="inner" name="Inner start" /><bpmn:task id="x" name="Work" /></bpmn:subProcess>`,
  ));
  assert.deepEqual(s.start, [{ name: "Begin", trigger: "none" }]);
  assert.doesNotMatch(s.text, /Inner start \(none\)$/m);
});

test("an unnamed step is shown by its id", () => {
  const s = summarizeDiagram(small(`<bpmn:serviceTask id="s" />`));
  assert.equal(s.lanes[0].steps[0].name, "s");
  assert.equal(s.text, "L: s (serviceTask)");
});

test("unprefixed and other-prefixed tags are read", () => {
  const s = summarizeDiagram(`<definitions><process id="p"><laneSet><lane name="A"><flowNodeRef>t</flowNodeRef></lane></laneSet><task id="t" name="X"/></process></definitions>`);
  assert.equal(s.text, "A: X (task)");
});

test("garbage never throws", () => {
  for (const bad of ["not xml at all", "", "<<<>>>", null, undefined]) {
    assert.deepEqual(summarizeDiagram(bad), { lanes: [], start: [], text: "(the diagram could not be read)" });
  }
});

test("the fixture's diagram summarizes to exact text", () => {
  const dir = scratch();
  try {
    buildFixture(dir);
    const s = summarizeDiagram(readFileSync(join(dir, "ps5/workflow.bpmn"), "utf8"));
    assert.equal(s.text, "Student: Check the deadline (task)\nStart: Posting arrives (none)");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---- evaluateRecord ----

const evaluate = (opts) => {
  const f = buildFixture(scratch(), opts);
  return { f, ev: evaluateRecord(f.repo, "ps5") };
};
const messages = (e) => e.problems.join("\n");

test("a clean record: the initial design is named, both entries qualify and count", () => {
  const { ev } = evaluate({});
  assert.equal(ev.exists, true);
  assert.equal(ev.initial.named, true);
  assert.equal(ev.initial.diagram, true);
  assert.equal(ev.initial.skill, true);
  assert.equal(ev.entries.length, 2);
  assert.deepEqual(ev.entries.map((e) => e.qualifies), [true, true]);
  assert.deepEqual(ev.counted, [0, 1]);
});

test("a record in the other shapes", () => {
  assert.equal(evaluate({ noInitialLine: true }).ev.initial.named, false);
  assert.equal(evaluate({ placeholder: true }).ev.initial.named, false);
  for (const opts of [{ layoutOnly: true }, { crlf: true }, { abbreviated: true }]) {
    const { ev } = evaluate(opts);
    assert.equal(ev.initial.named, true, JSON.stringify(opts));
    assert.equal(ev.initial.diagram, true, JSON.stringify(opts));
    assert.equal(ev.entries.length, 2, JSON.stringify(opts));
  }
  assert.match(messages(evaluate({ layoutOnly: true }).ev.entries[1]), /layout/);
  assert.deepEqual(evaluate({ crlf: true }).ev.entries.map((e) => e.qualifies), evaluate({}).ev.entries.map((e) => e.qualifies));
});

test("a stale why is marked stale", () => {
  const { ev } = evaluate({ staleWhy: true });
  assert.equal(ev.entries[0].parts.why.attestation, "stale");
  assert.equal(evaluate({}).ev.entries[0].parts.why.attestation, "fresh");
});

test("an unknown initial hash is not named, and its files are not listed", () => {
  const { ev } = evaluate({ unknownHash: true });
  assert.equal(ev.initial.named, false);
  assert.equal(ev.initial.diagram, false);
  assert.equal(ev.initial.hash, "0123456789abcdef0123456789abcdef01234567");
});

test("an entry's commit that touches the wrong file, or precedes the initial design, carries a problem", () => {
  assert.ok(evaluate({ wrongFile: true }).ev.entries[1].problems.length > 0);
  assert.match(messages(evaluate({ beforeInitial: true }).ev.entries[1]), /does not come after/);
});

test("two entries numbered alike each carry the duplicate problem", () => {
  const { ev } = evaluate({ duplicateNumber: true });
  for (const e of ev.entries) assert.match(e.problems.join("\n"), /more than one entry 1/);
});

test("an entry the agent both noticed and chose does not qualify", () => {
  const { ev } = evaluate({ agentAgent: true });
  assert.deepEqual(ev.entries.map((e) => e.qualifies), [true, false]);
});

test("a bad first entry leaves the counted slots to entries 2 and 3", () => {
  const { ev } = evaluate({ threeEntries: true });
  assert.deepEqual(ev.counted, [1, 2]);
});

test("a folder with no CHANGES.md has no record", () => {
  const f = buildFixture(scratch(), {});
  rmSync(join(f.repo, "ps5/CHANGES.md"));
  assert.deepEqual(evaluateRecord(f.repo, "ps5"), { exists: false, initial: { line: "missing", hash: null, named: false, diagram: false, skill: false }, entries: [], problems: [], counted: [] });
});

test("a repository that is not a git clone still evaluates, with no commit named", () => {
  const dir = scratch();
  mkdirSync(join(dir, "ps5"));
  writeFileSync(join(dir, "ps5/CHANGES.md"), "# Change record\n\nInitial design: abcdef1\n");
  const ev = evaluateRecord(dir, "ps5");
  assert.equal(ev.exists, true);
  assert.equal(ev.initial.named, false);
});

// ---- materialFor ----

test("materialFor lists the record, skills, programs and the two generated summaries", () => {
  const f = buildFixture(scratch(), { wrongFile: true });
  const m = materialFor(f.repo);
  assert.equal(m.folder, "ps5");
  // README.md is absent from the fixture, so it is left out.
  assert.deepEqual(m.files.map((x) => x.path), ["ps5/CHANGES.md", "ps5/skills/extract/SKILL.md", "ps5/app.js"]);
  assert.equal(m.files[1].text, "# extract\n\nTake the later deadline.\n");
  assert.equal(m.files[2].text, "console.log('hi');\n");
  assert.deepEqual(m.generated.map((g) => g.path), ["generated/diagram.txt", "generated/entries.txt"]);
  assert.equal(m.generated[0].text, "Student: Check the deadline (task)\nStart: Posting arrives (none)");
  assert.equal(m.generated[1].text, "Entry 1, numbered 1: qualifies\nEntry 2, numbered 2: qualifies");
});

test("materialFor includes a README when there is one, and keeps programs out of examples and big or minified files", () => {
  const f = buildFixture(scratch(), {});
  const put = (p, text) => { mkdirSync(dirname(join(f.repo, p)), { recursive: true }); writeFileSync(join(f.repo, p), text); };
  put("ps5/README.md", "my workflow\n");
  put("ps5/tools/run.py", "print('x')\n");
  put("ps5/examples/e01/helper.js", "x\n");
  put("ps5/min.js", `${"a".repeat(1500)}\n`);
  put("ps5/big.js", "x".repeat(100000));
  const paths = materialFor(f.repo).files.map((x) => x.path);
  assert.deepEqual(paths, ["ps5/CHANGES.md", "ps5/README.md", "ps5/skills/extract/SKILL.md", "ps5/tools/run.py"]);
});

test("materialFor finds a ps5-tracker folder", () => {
  const f = buildFixture(scratch(), {});
  renameSync(join(f.repo, "ps5"), join(f.repo, "ps5-tracker"));
  const m = materialFor(f.repo);
  assert.equal(m.folder, "ps5-tracker");
  assert.ok(m.files.some((x) => x.path === "ps5-tracker/CHANGES.md"));
});

test("materialFor reports missing when no ps5 folder has work", () => {
  const f = buildFixture(scratch(), { noFolder: true });
  assert.match(materialFor(f.repo).missing, /No ps5\/ folder/);
  assert.equal(materialFor(f.repo).files, undefined);
});

test("materialFor leaves out a diagram summary when there is no diagram, and entries when there is no record", () => {
  const f = buildFixture(scratch(), {});
  rmSync(join(f.repo, "ps5/workflow.bpmn"));
  rmSync(join(f.repo, "ps5/CHANGES.md"));
  const m = materialFor(f.repo);
  assert.deepEqual(m.generated, []);
  assert.ok(!m.files.some((x) => x.path.endsWith("CHANGES.md")));
});
