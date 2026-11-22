//
// A throwaway PS5 assignments repository with real git history, for tests of the record and the
// rows built on it. It follows the course-materials record tests' builder (workflows/record/
// tools/test/repo.mjs) so the history has the same shape a student's has.
//
// COMMIT DATES ARE FIXED, so two builds with the same options have the same hashes. That is what
// lets a test compare the CRLF variant to the clean one with a deep equal.
//
// Each option breaks one thing: noInitialLine, placeholder, unknownHash, nineExamples,
// missingOutput, wrongFile, beforeInitial, staleWhy, agentAgent, layoutOnly, crlf, abbreviated,
// noFolder, duplicateNumber (the second entry is numbered 1 too). Three add rather than break:
// twelveExamples, pngInput (e01's input is a PNG), and threeEntries (a third entry, for its own
// skill commit, while entry 1 says it changed the diagram but its commit changed a skill).

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { renderEntry, partHash } from "../../../../record/tools/lib/record.mjs";

// The PNG signature and an IHDR chunk header: enough bytes, with NULs, to be a binary file.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);

const attested = (text) => `${text}\n\n<!-- attested 2026-11-18 sha256:${partHash(text)} -->`;

/** A BPMN file with three lanes and a start event; `tasks` are the steps after the start. */
function bpmn({ tasks, x = 100 }) {
  const lanes = ["Student", "Agent", "Program"];
  const nodes = ["start", ...tasks.map((_, i) => `t${i + 1}`)];
  const refs = nodes.map((n) => `<bpmn:flowNodeRef>${n}</bpmn:flowNodeRef>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="d" exporter="Camunda Modeler" exporterVersion="5.30.0">
  <bpmn:process id="p">
    <bpmn:laneSet id="ls">
${lanes.map((l, i) => `      <bpmn:lane id="lane${i + 1}" name="${l}">${i === 0 ? refs : ""}</bpmn:lane>`).join("\n")}
    </bpmn:laneSet>
    <bpmn:startEvent id="start" name="Posting arrives" />
${tasks.map((t, i) => `    <bpmn:task id="t${i + 1}" name="${t}" />`).join("\n")}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="dia">
    <bpmndi:BPMNPlane id="plane" bpmnElement="p">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start">
        <dc:Bounds x="${x}" y="80" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
}

export function buildFixture(dir, opts = {}) {
  let tick = 0;
  const git = (...args) => {
    const when = new Date(Date.UTC(2026, 10, 1, 12, 0, tick)).toISOString();
    return execFileSync("git", ["-C", dir, ...args], {
      encoding: "utf8",
      env: { ...process.env, GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when },
    }).trim();
  };
  const write = (path, text) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  const commit = (message) => {
    tick += 60;
    git("add", "-A");
    git("commit", "-q", "--allow-empty", "-m", message);
    return git("rev-parse", "HEAD");
  };

  mkdirSync(dir, { recursive: true });
  git("init", "-q");
  git("config", "user.email", "student@example.com");
  git("config", "user.name", "Student");
  git("config", "commit.gpgsign", "false");
  git("config", "core.autocrlf", "false");

  if (opts.noFolder) {
    write("README.md", "# assignments\n");
    commit("readme");
    return { repo: dir, initial: null, skillCommit: null, diagramCommit: null };
  }

  let scratch = null;
  if (opts.beforeInitial) {
    write("ps5/workflow.bpmn", bpmn({ tasks: ["Sketch"] }));
    scratch = commit("sketch the diagram");
  }
  write("ps5/workflow.bpmn", bpmn({ tasks: [] }));
  write("ps5/skills/extract/SKILL.md", "# extract\n");
  const initial = commit("initial design");

  write("ps5/skills/extract/SKILL.md", "# extract\n\nTake the later deadline.\n");
  const skillCommit = commit("extract takes the later deadline");

  write("ps5/workflow.bpmn", opts.layoutOnly ? bpmn({ tasks: [], x: 160 }) : bpmn({ tasks: ["Check the deadline"] }));
  const diagramCommit = commit("add a step to the diagram");

  let thirdCommit = null;
  if (opts.threeEntries) {
    write("ps5/skills/extract/SKILL.md", "# extract\n\nTake the later deadline, and say which.\n");
    thirdCommit = commit("extract says which deadline");
  }

  let appCommit = null;
  if (opts.wrongFile) {
    write("ps5/app.js", "console.log('hi');\n");
    appCommit = commit("app");
  }

  const ids = Array.from({ length: opts.nineExamples ? 9 : opts.twelveExamples ? 12 : 10 }, (_, i) => `e${String(i + 1).padStart(2, "0")}`);
  [ids.slice(0, 4), ids.slice(4, 7), ids.slice(7)].forEach((group, k) => {
    for (const id of group) {
      if (opts.pngInput && id === "e01") write(`ps5/examples/${id}/input.png`, PNG);
      else write(`ps5/examples/${id}/input.txt`, `posting ${id}\n`);
      if (!(opts.missingOutput && id === "e10")) write(`ps5/examples/${id}/output.json`, "{}\n");
    }
    commit(`examples, part ${k + 1}`);
  });

  const short = (h) => (opts.abbreviated ? h.slice(0, 7) : h);
  const base = { whoNoticed: "me", whoChose: "me", whatChanged: "takes the later deadline" };
  const entry = (n, fields, why = `why ${n}`) =>
    renderEntry(n, { title: `change ${n}`, fields: { ...base, ...fields }, parts: { noticed: attested(`noticed ${n}`), why: attested(why) } });
  const one = entry(1, { changed: opts.threeEntries ? "diagram" : "skill extract", commit: short(skillCommit) });
  // Editing the words after they were attested leaves the old hash in the comment.
  const first = opts.staleWhy ? one.replace("why 1\n", "why 1, edited later\n") : one;
  const entry2Commit = opts.wrongFile ? appCommit : opts.beforeInitial ? scratch : diagramCommit;
  const two = entry(opts.duplicateNumber ? 1 : 2, {
    changed: "diagram",
    commit: short(entry2Commit),
    ...(opts.agentAgent ? { whoNoticed: "the agent", whoChose: "the agent" } : {}),
  }, opts.duplicateNumber ? "why the diagram" : undefined);
  const three = opts.threeEntries ? `\n${entry(3, { changed: "skill extract", commit: short(thirdCommit) })}` : "";
  const named = opts.placeholder ? "<commit hash>" : opts.unknownHash ? "0123456789abcdef0123456789abcdef01234567" : short(initial);
  const line = opts.noInitialLine ? "" : `Initial design: ${named}\n\n`;
  const text = `# Change record\n\n${line}${first}\n${two}${three}`;
  write("ps5/CHANGES.md", opts.crlf ? text.replace(/\n/g, "\r\n") : text);
  commit("the record");

  return { repo: dir, initial, skillCommit, diagramCommit, thirdCommit };
}
