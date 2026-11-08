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

/** Every file under `dir` at commit `hash`, as repository paths. */
export function filesAt(repo, hash, dir) {
  const out = git(repo, "ls-tree", "-r", "--name-only", hash, "--", dir);
  return out ? out.split("\n") : [];
}
