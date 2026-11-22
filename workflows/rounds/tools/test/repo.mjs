// A throwaway repository holding a student's project folder, for tests that need real git history.

import { join } from "node:path";
import { emptyRepo, write, commit, git, withRemote } from "../../../record/tools/test/repo.mjs";
import { partHash } from "../../../record/tools/lib/record.mjs";
import { renderRound } from "../lib/rounds.mjs";

export { emptyRepo, write, commit, git, withRemote };

export const ROUNDS_HEAD = (base) => `# Rounds\n\nBase: ${base}\n`;

/** A repository with the project in `prefix` ("" for the root, or "project/").
 *
 *  Returns { repo, dir, p, base, plan1, impl1, plan2, impl2 }: `p(path)` is a path inside the
 *  project, and each name after `base` is the commit that made it. History, oldest first:
 *  base, plan 1 (with its spec), implementation 1 (two commits), plan 2, implementation 2. */
export function roundsRepo(prefix = "") {
  const repo = emptyRepo();
  const p = (path) => `${prefix}${path}`;
  write(repo, "README.md", "# repo\n");
  write(repo, p("ROUNDS.md"), ROUNDS_HEAD("<commit hash>"));
  const base = commit(repo, "base");

  write(repo, p("docs/superpowers/specs/2026-11-20-parser-design.md"), "# spec 1\n");
  write(repo, p("docs/superpowers/plans/2026-11-20-parser.md"), "# plan 1\n");
  const plan1 = commit(repo, "plan 1");
  write(repo, p("src/a.js"), "a\n");
  const impl1a = commit(repo, "implement 1a");
  write(repo, p("src/b.js"), "b\n");
  const impl1 = commit(repo, "implement 1b");

  write(repo, p("docs/superpowers/specs/2026-11-22-exporter-design.md"), "# spec 2\n");
  write(repo, p("docs/superpowers/plans/2026-11-22-exporter.md"), "# plan 2\n");
  const plan2 = commit(repo, "plan 2");
  write(repo, p("src/c.js"), "c\n");
  const impl2 = commit(repo, "implement 2");
  return { repo, dir: join(repo, prefix), p, base, plan1, impl1a, impl1, plan2, impl2 };
}

/** ROUNDS.md text with the Base set. */
export const withBase = (base) => ROUNDS_HEAD(base);

export const ROUND1 = {
  title: "parser",
  spec: "docs/superpowers/specs/2026-11-20-parser-design.md",
  plan: "docs/superpowers/plans/2026-11-20-parser.md",
};
export const ROUND2 = {
  title: "exporter",
  spec: "docs/superpowers/specs/2026-11-22-exporter-design.md",
  plan: "docs/superpowers/plans/2026-11-22-exporter.md",
};

const attested = (text) => `${text}\n\n<!-- attested 2026-11-18 sha256:${partHash(text)} -->`;

/** SUBMIT.md text, every line set unless overridden. */
export const submitText = ({ kind = "workflow", extendsPs = "PS3", work = "https://github.com/me/proj", showcase = "https://github.com/umsi212F2026/student-showcase/pull/7" } = {}) =>
  `# Final project submission\n\nKind: ${kind}\nExtends: ${extendsPs}\nWork: ${work}\nShowcase: ${showcase}\n`;

/** A pushed project repository that passes every offline item of a workflow check: the base holds a
 *  diagram, a skill and ten processed examples, and two attested rounds follow it.
 *  Returns { repo, dir, base }. */
export function passingProject({ readme = "# Project\n\nThe parser and the exporter.\n", prefix = "" } = {}) {
  const repo = emptyRepo();
  const p = (path) => `${prefix}${path}`;
  if (prefix) write(repo, p("ps5/CHANGES.md"), "# ps5\n");
  write(repo, p("README.md"), readme);
  write(repo, p("ROUNDS.md"), ROUNDS_HEAD("<commit hash>"));
  write(repo, p("workflow.bpmn"), "<definitions/>\n");
  write(repo, p("skills/extract/SKILL.md"), "# extract\n");
  for (let i = 1; i <= 10; i++) {
    const id = `e${String(i).padStart(2, "0")}`;
    write(repo, p(`examples/${id}/input.txt`), `posting ${i}\n`);
    write(repo, p(`examples/${id}/output.json`), "{}\n");
  }
  const base = commit(repo, "base");
  const done = [];
  for (const [r, file] of [[ROUND1, "a"], [ROUND2, "b"]]) {
    write(repo, p(r.spec), `# spec ${r.title}\n`);
    write(repo, p(r.plan), `# plan ${r.title}\n`);
    commit(repo, `plan ${r.title}`);
    write(repo, p(`src/${file}.js`), `${file}\n`);
    done.push({ ...r, commits: commit(repo, `implement ${r.title}`).slice(0, 7) });
  }
  const rounds = done.map((r, i) =>
    renderRound(i + 1, { title: r.title, fields: { spec: r.spec, plan: r.plan, commits: r.commits }, parts: { new: attested(`new ${i}`), why: attested(`why ${i}`) } }),
  );
  write(repo, p("ROUNDS.md"), `${ROUNDS_HEAD(base.slice(0, 7))}\n${rounds.join("\n")}`);
  commit(repo, "record");
  withRemote(repo);
  return { repo, dir: join(repo, prefix), base, p };
}

/** A pushed assignments repository whose project/ holds SUBMIT.md (and TERMS.md when given). */
export function assignmentsRepo({ submit = submitText(), terms = null } = {}) {
  const repo = emptyRepo();
  write(repo, "README.md", "# assignments\n");
  if (submit !== null) write(repo, "project/SUBMIT.md", submit);
  if (terms !== null) write(repo, "project/TERMS.md", terms);
  commit(repo, "project");
  withRemote(repo);
  return repo;
}
