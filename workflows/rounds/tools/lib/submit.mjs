// SUBMIT.md, the hand-in, at project/SUBMIT.md in the student's assignments repository.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { unixLines } from "../../../record/tools/lib/record.mjs";

export const SUBMIT = "project/SUBMIT.md";
export const KINDS = ["deployed", "workflow", "negotiated"];
export const EXTENDS = ["PS1", "PS2", "PS3", "PS4", "PS5", "new"];
const SHOWCASE_RE = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+\/?$/;
const URL_RE = /^https:\/\/\S+$/;

const LINES = [
  ["kind", "Kind"],
  ["extends", "Extends"],
  ["work", "Work"],
  ["showcase", "Showcase"],
];

/** The four lines of SUBMIT.md in `assignmentsRepo`, and what is wrong with them.
 *
 *  A value still in angle brackets is the template's, so it is `null`. `problems` is empty when
 *  every line is set to something that fits it; it does not judge Work against Kind, which the
 *  check does, since only the check knows the kind. */
export function readSubmit(assignmentsRepo) {
  const out = { kind: null, extends: null, work: null, showcase: null, problems: [] };
  const path = join(assignmentsRepo ?? "", SUBMIT);
  if (!assignmentsRepo || !existsSync(path)) {
    out.problems.push(`${SUBMIT} does not exist.`);
    return out;
  }
  const lines = unixLines(readFileSync(path, "utf8")).split("\n");
  for (const [key, label] of LINES) {
    const line = lines.find((l) => l.startsWith(`${label}:`));
    const value = line === undefined ? "" : line.slice(label.length + 1).trim();
    if (line === undefined) out.problems.push(`${SUBMIT} has no ${label}: line.`);
    else if (!value || /^<.*>$/.test(value)) out.problems.push(`${label}: is not filled in.`);
    else out[key] = value;
  }
  if (out.kind !== null && !KINDS.includes(out.kind)) out.problems.push(`Kind: must be ${KINDS.join(", ")}, not "${out.kind}".`);
  if (out.extends !== null && !EXTENDS.includes(out.extends)) out.problems.push(`Extends: must be ${EXTENDS.join(", ")}, not "${out.extends}".`);
  if (out.work !== null && out.work !== "project/" && !URL_RE.test(out.work)) out.problems.push(`Work: must be a repository URL or project/, not "${out.work}".`);
  if (out.showcase !== null && !SHOWCASE_RE.test(out.showcase)) out.problems.push(`Showcase: must be the URL of a pull request, not "${out.showcase}".`);
  return out;
}
