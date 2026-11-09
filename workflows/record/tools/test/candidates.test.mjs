import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { candidates } from "../changes.mjs";
import { emptyRepo, write, commit, changes, entryText, FIELDS } from "./repo.mjs";

const TOOL = join(dirname(fileURLToPath(import.meta.url)), "..", "changes.mjs");

/** History: one commit before the initial design, the initial design, then four after. */
function history() {
  const repo = emptyRepo();
  write(repo, "ps5/workflow.bpmn", "<a/>\n");
  const before = commit(repo, "early sketch");
  write(repo, "ps5/skills/extract/SKILL.md", "# extract\n");
  const initial = commit(repo, "initial design");
  write(repo, "ps5/app.js", "1\n");
  const programOnly = commit(repo, "fix a program bug");
  write(repo, "ps5/skills/extract/SKILL.md", "# extract v2\n");
  write(repo, "ps5/app.js", "2\n");
  const both = commit(repo, "skill and program together");
  write(repo, "ps5/workflow.bpmn", "<b/>\n");
  write(repo, "ps5/docs/superpowers/specs/design.md", "spec\n");
  const diagram = commit(repo, "diagram: check the deadline");
  write(repo, "ps5/CHANGES.md", changes(initial.slice(0, 7), [entryText(1, { fields: { ...FIELDS, commit: diagram.slice(0, 7) } })]));
  commit(repo, "record");
  return { repo, before, initial, programOnly, both, diagram };
}

test("lists diagram and skill commits after the initial design, oldest first", () => {
  const h = history();
  const r = candidates(h.repo);
  assert.equal(r.since, h.initial.slice(0, 7));
  assert.deepEqual(r.commits.map((c) => c.hash), [h.both, h.diagram]);
});

test("a commit before the initial design is excluded", () => {
  const h = history();
  assert.ok(!candidates(h.repo).commits.some((c) => c.hash === h.before || c.hash === h.initial));
});

test("a commit touching only a program is excluded", () => {
  const h = history();
  assert.ok(!candidates(h.repo).commits.some((c) => c.hash === h.programOnly));
});

test("a skill and a program together are listed with all their files", () => {
  const h = history();
  const c = candidates(h.repo).commits.find((c) => c.hash === h.both);
  assert.deepEqual(c.files.sort(), ["ps5/app.js", "ps5/skills/extract/SKILL.md"]);
  assert.deepEqual(c.kinds, ["skill extract"]);
  assert.equal(c.subject, "skill and program together");
  assert.match(c.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(c.inRecord, false);
});

test("a diagram commit already in the record is marked", () => {
  const h = history();
  const c = candidates(h.repo).commits.find((c) => c.hash === h.diagram);
  assert.deepEqual(c.kinds, ["diagram"]);
  assert.equal(c.inRecord, true);
});

/** A BPMN file as Camunda saves it: the process, then the layout of its shapes. */
function bpmn({ task = "Extract the deadline", x = 100, version = "5.30.0" } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="d" exporter="Camunda Modeler" exporterVersion="${version}">
  <bpmn:process id="p">
    <bpmn:task id="t1" name="${task}" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="dia">
    <bpmndi:BPMNPlane id="plane" bpmnElement="p">
      <bpmndi:BPMNShape id="t1_di" bpmnElement="t1">
        <dc:Bounds x="${x}" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
}

/** History: the initial design, then a layout-only diagram commit, then a real one. */
function layoutHistory() {
  const repo = emptyRepo();
  write(repo, "ps5/workflow.bpmn", bpmn());
  write(repo, "ps5/skills/extract/SKILL.md", "# extract\n");
  const initial = commit(repo, "initial design");
  write(repo, "ps5/CHANGES.md", changes(initial.slice(0, 7), []));
  commit(repo, "name the initial design");
  write(repo, "ps5/workflow.bpmn", bpmn({ x: 240, version: "5.31.0" }));
  const moved = commit(repo, "tidy the diagram");
  write(repo, "ps5/workflow.bpmn", bpmn({ x: 240, version: "5.31.0", task: "Extract every date" }));
  const real = commit(repo, "diagram: extract every date");
  return { repo, moved, real };
}

test("a diagram commit that only moves shapes or re-saves the file is excluded", () => {
  const h = layoutHistory();
  assert.deepEqual(candidates(h.repo).commits.map((c) => c.hash), [h.real]);
});

test("a layout change in the same commit as a skill change lists only the skill", () => {
  const h = layoutHistory();
  write(h.repo, "ps5/workflow.bpmn", bpmn({ x: 400, version: "5.31.0", task: "Extract every date" }));
  write(h.repo, "ps5/skills/extract/SKILL.md", "# extract v2\n");
  const both = commit(h.repo, "skill, and tidy the diagram");
  assert.deepEqual(candidates(h.repo).commits.find((c) => c.hash === both).kinds, ["skill extract"]);
});

test("no initial design is an error naming the problem", () => {
  const repo = emptyRepo();
  write(repo, "ps5/CHANGES.md", "# Change record\n\nInitial design: <commit hash>\n");
  commit(repo, "start");
  assert.throws(() => candidates(repo), { message: "CHANGES.md does not name an initial design yet." });
  const r = spawnSync(process.execPath, [TOOL, "candidates", repo], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.equal(r.stderr.trim(), "CHANGES.md does not name an initial design yet.");
});
