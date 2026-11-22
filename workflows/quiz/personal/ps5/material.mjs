//
// What the drafting agent reads for one student's PS5 work: the files, and two generated
// summaries, built from a copy of their assignments repository.
//
// THE LISTING MATCHES THE GRADER'S EXTRACTION EXACTLY, so a question drafted here cites the same
// lines the grader's own extractor would show. The files are the change record, the README, every
// skill, and the programs the student wrote. A file that does not exist is left out. The diagram
// is BPMN XML, which no prompt can quote, so its summary is a generated file whose lines a lane
// question cites instead. Which entries qualify is the record tool's rule, already applied in the
// evaluation, so it is handed over as a generated file rather than restated in extract.md.
//
// IT READS THE COPY ON DISK and runs nothing from it, through the same symlink-refusing readers
// as the rest of this module.

import { listFiles, readRepoFile } from "../lib/files.mjs";
import { locatePs5 } from "./locate.mjs";
import { evaluateRecord } from "./record.mjs";
import { summarizeDiagram } from "./bpmn.mjs";

const CODE = /\.(js|mjs|cjs|ts|py|sh)$/;
const SKIP_DIRS = new Set(["examples", "node_modules", "docs"]);

// The programs the extractor reads, shallowest first: a program the student wrote, not a large or
// minified bundle, which would crowd out the rest and holds nothing to ask about.
const PROGRAM_BYTES = 100000;
const MINIFIED_LINE = 1000;
const PROGRAMS_SHOWN = 20;
function quizPrograms(repoDir, programs) {
  const depth = (p) => p.split("/").length;
  return [...programs].sort((a, b) => depth(a) - depth(b) || a.localeCompare(b)).filter((p) => {
    const text = readRepoFile(repoDir, p);
    if (text == null || Buffer.byteLength(text) >= PROGRAM_BYTES) return false;
    return !text.split("\n", 20).some((l) => l.length > MINIFIED_LINE);
  }).slice(0, PROGRAMS_SHOWN);
}

/** The PS5 material in `repoDir`: `{ folder, files: [{ path, text }], generated: [{ path, text }] }`,
 *  or `{ missing }` when no ps5 folder holds work of the student's own. */
export function materialFor(repoDir) {
  const loc = locatePs5(repoDir);
  if (!loc.folder) return { missing: loc.missing };
  const folder = loc.folder;
  const evaluation = evaluateRecord(repoDir, folder);
  const all = listFiles(repoDir, folder);
  const below = all.map((p) => p.slice(folder.length + 1));
  const bpmn = below.filter((p) => !p.includes("/") && p.endsWith(".bpmn"));
  const diagramFile = bpmn.includes("workflow.bpmn") ? "workflow.bpmn" : bpmn[0] ?? null;
  const xml = diagramFile ? readRepoFile(repoDir, `${folder}/${diagramFile}`) : null;
  const diagram = xml === null ? null : summarizeDiagram(xml);
  const skills = below.map((p) => /^skills\/([^/]+)\/SKILL\.md$/.exec(p)?.[1]).filter(Boolean);
  const programs = all.filter((p) => CODE.test(p) && !below[all.indexOf(p)].split("/").slice(0, -1).some((s) => SKIP_DIRS.has(s)));

  const paths = [`${folder}/CHANGES.md`, `${folder}/README.md`, ...skills.map((s) => `${folder}/skills/${s}/SKILL.md`), ...quizPrograms(repoDir, programs)];
  const files = paths.map((path) => ({ path, text: readRepoFile(repoDir, path) })).filter((f) => f.text != null);

  const generated = [];
  if (diagram?.text) generated.push({ path: "generated/diagram.txt", text: diagram.text });
  const entries = evaluation.entries ?? [];
  if (entries.length) generated.push({ path: "generated/entries.txt", text: entries.map((e, i) => `Entry ${i + 1}, numbered ${e.n}: ${e.qualifies ? "qualifies" : "does not qualify"}`).join("\n") });
  return { folder, files, generated };
}
