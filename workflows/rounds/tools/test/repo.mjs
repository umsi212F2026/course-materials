// A throwaway repository holding a student's project folder, for tests that need real git history.

import { join } from "node:path";
import { emptyRepo, write, commit, git } from "../../../record/tools/test/repo.mjs";

export { emptyRepo, write, commit, git };

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
