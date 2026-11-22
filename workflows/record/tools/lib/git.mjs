// The few git questions the record tool asks of a student's assignments repository.

import { execFileSync } from "node:child_process";

/** Output of `git -C <repo> <args>`, trimmed. Throws on a nonzero exit. */
export function git(repo, ...args) {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** Whether `hash`, full or abbreviated, names a commit in `repo`. */
export function commitExists(repo, hash) {
  try {
    git(repo, "cat-file", "-e", `${hash}^{commit}`);
    return true;
  } catch {
    return false;
  }
}

/** The files commit `hash` changed, as repository paths, unquoted even when not ASCII. */
export function filesChanged(repo, hash) {
  const out = git(repo, "-c", "core.quotepath=off", "show", "--name-only", "--format=", hash);
  return out ? out.split("\n").filter(Boolean) : [];
}

/** Whether commit `hash` comes after commit `base`: `base` is an ancestor of it, and not it. */
export function isAfter(repo, base, hash) {
  if (git(repo, "rev-parse", `${base}^{commit}`) === git(repo, "rev-parse", `${hash}^{commit}`)) return false;
  try {
    git(repo, "merge-base", "--is-ancestor", base, hash);
    return true;
  } catch {
    return false;
  }
}

/** Every file under `dir` at commit `hash`, as repository paths. */
export function filesAt(repo, hash, dir) {
  const out = git(repo, "ls-tree", "-r", "--name-only", hash, "--", dir);
  return out ? out.split("\n") : [];
}

/** Why the grader would not see the work under `path` in `repo` yet, or null when it would.
 *  `path` is relative to `repo`; "." is the whole of it. The uncommitted check is always limited
 *  to `path`; the unpushed-commit count is too only with `limitAhead`, otherwise it counts every
 *  commit in the repository.
 *
 *  GRADING READS WHAT IS ON GITHUB. Work that passes every other item but sits uncommitted, or
 *  committed and never pushed, is work the grader never sees. */
export function pushState(repo, path, { limitAhead = false } = {}) {
  const where = path === "." ? "the project folder" : `${path}/`;
  const dirty = git(repo, "status", "--porcelain", "--", path);
  if (dirty) return `${dirty.split("\n").length} file(s) under ${where} are not committed yet. Commit them, then push.`;
  try {
    git(repo, "rev-parse", "--abbrev-ref", "@{u}");
  } catch {
    return "This branch has nowhere to push to yet. Push it with: git push -u origin main";
  }
  const ahead = Number(git(repo, "rev-list", "--count", "@{u}..HEAD", ...(limitAhead ? ["--", path] : [])));
  return ahead ? `${ahead} commit${ahead === 1 ? " is" : "s are"} not pushed yet. Run: git push` : null;
}
