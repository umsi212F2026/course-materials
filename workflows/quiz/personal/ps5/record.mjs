//
// A student's PS5 change record, ps5/CHANGES.md, evaluated with the student tool's own rules.
//
// THE GRADER AND THE STUDENT'S CHECK AGREE BY CONSTRUCTION. Parsing, who-qualifies and the
// commit rules are imported from the record tool in this repository, not copied, so a change to
// the student tool changes this evaluation with it.

import { readRepoFile } from "../lib/files.mjs";
import { parseRecord, qualifies, unixLines } from "../../../record/tools/lib/record.mjs";
import { commitExists, filesAt } from "../../../record/tools/lib/git.mjs";
import { commitProblems } from "../../../record/tools/changes.mjs";

/** The record in `repoDir/<folder>`, parsed and checked against git history. Never throws on a
 *  malformed record.
 *
 *  `counted` is up to two positions in `entries`, never entry numbers, since a record can number
 *  two entries alike: those that qualify with no problems, in record order, then those that
 *  qualify, then those that parse without problems of their own.
 *
 *  CHANGES.md is read only when it is a regular file reached without a symlink, so a record that
 *  links elsewhere on the host reads as no record. */
export function evaluateRecord(repoDir, folder = "ps5") {
  const none = { line: "missing", hash: null, named: false, diagram: false, skill: false };
  const text = readRepoFile(repoDir, `${folder}/CHANGES.md`);
  if (text === null) return { exists: false, initial: none, entries: [], problems: [], counted: [] };

  const r = parseRecord(unixLines(text));
  const hash = r.initialDesign;
  const named = hash !== null && commitExists(repoDir, hash);
  const files = named ? filesAt(repoDir, hash, folder) : [];
  const initial = {
    line: r.initialLine,
    hash,
    named,
    diagram: files.some((f) => f.endsWith(".bpmn")),
    skill: files.some((f) => new RegExp(`^${folder}/skills/[^/]+/SKILL\\.md$`).test(f)),
  };

  const problems = r.problems.map((p) => ({ line: p.line, message: p.message }));
  // A parse problem belongs to the entry it names. Messages name an entry by number, so of two
  // entries numbered alike it goes to the one whose lines it falls in: the last one headed at or
  // above it. A duplicate number concerns every entry that has it.
  const own = r.entries.map((e) => {
    const same = r.entries.filter((x) => x.n === e.n);
    const mine = (p) => same.filter((x) => x.line <= p.line).at(-1) === e;
    return r.problems.filter((p) => {
      const dup = /^There is more than one entry (\d+)\./.exec(p.message);
      if (dup) return Number(dup[1]) === e.n;
      return new RegExp(`^Entry ${e.n}\\b`).test(p.message) && (same.length === 1 || mine(p));
    }).map((p) => p.message);
  });
  const entries = r.entries.map((e, i) => {
    const commit = commitProblems(repoDir, e, named ? hash : null);
    for (const message of commit) problems.push({ line: e.line, message });
    return { ...e, qualifies: qualifies(e), problems: [...commit, ...own[i]] };
  });

  const at = entries.map((_, i) => i);
  const counted = [
    ...at.filter((i) => entries[i].qualifies && !entries[i].problems.length),
    ...at.filter((i) => entries[i].qualifies),
    ...at.filter((i) => !own[i].length),
  ]
    .filter((i, k, all) => all.indexOf(i) === k)
    .slice(0, 2);
  return { exists: true, initial, entries, problems, counted };
}
