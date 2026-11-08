// A throwaway assignments repository, for tests that need real git history.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { renderEntry, partHash } from "../lib/record.mjs";

export function git(repo, ...args) {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();
}

export function write(repo, path, text) {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), text);
}

export function remove(repo, path) {
  rmSync(join(repo, path), { recursive: true, force: true });
}

export function commit(repo, message) {
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "--allow-empty", "-m", message);
  return git(repo, "rev-parse", "HEAD");
}

export function emptyRepo() {
  const repo = mkdtempSync(join(tmpdir(), "record-test-"));
  git(repo, "init", "-q");
  git(repo, "config", "user.email", "student@example.com");
  git(repo, "config", "user.name", "Student");
  git(repo, "config", "commit.gpgsign", "false");
  return repo;
}

const attested = (text) => `${text}\n\n<!-- attested 2026-11-18 sha256:${partHash(text)} -->`;

export const FIELDS = {
  changed: "skill extract",
  commit: "abc1234",
  promptedBy: "a run on `examples/e01`",
  whoNoticed: "me",
  whoChose: "me",
  whatChanged: "takes the later deadline",
};

export function entryText(n, { fields = FIELDS, noticed = `noticed ${n}`, why = `why ${n}`, attest = true } = {}) {
  return renderEntry(n, {
    title: `change ${n}`,
    fields,
    parts: attest ? { noticed: attested(noticed), why: attested(why) } : { noticed, why },
  });
}

export function changes(initial, entries) {
  return `# Change record\n\nInitial design: ${initial}\n\n${entries.join("\n")}`;
}

/** Give `repo` a bare remote, push to it and track it, as a student's clone does. */
export function withRemote(repo) {
  const bare = mkdtempSync(join(tmpdir(), "record-remote-"));
  git(bare, "init", "-q", "--bare");
  git(repo, "remote", "add", "origin", bare);
  git(repo, "push", "-q", "-u", "origin", "HEAD");
  return bare;
}

/** A repository that passes every item of check, pushed to its remote.
 *
 *  Returns { repo, initial, commits, entry }: `commits` are the two skill changes after the
 *  initial design, and `entry(n, opts)` renders entry n pointing at commits[n - 1]. */
export function passingRepo() {
  const repo = emptyRepo();
  write(repo, "ps5/CHANGES.md", "# Change record\n\nInitial design: <commit hash>\n");
  write(repo, "ps5/workflow.bpmn", "<definitions/>\n");
  write(repo, "ps5/skills/extract/SKILL.md", "# extract\n");
  const initial = commit(repo, "initial design");
  const commits = [1, 2].map((i) => {
    write(repo, "ps5/skills/extract/SKILL.md", `# extract v${i + 1}\n`);
    return commit(repo, `extract, change ${i}`);
  });
  for (let i = 1; i <= 10; i++) {
    const id = `e${String(i).padStart(2, "0")}`;
    write(repo, `ps5/examples/${id}/input.txt`, `posting ${i}\n`);
    write(repo, `ps5/examples/${id}/output.json`, "{}\n");
  }
  const entry = (n, opts = {}) => entryText(n, { ...opts, fields: { ...FIELDS, commit: commits[n - 1].slice(0, 7), ...opts.fields } });
  write(repo, "ps5/CHANGES.md", changes(initial.slice(0, 7), [entry(1), entry(2)]));
  commit(repo, "examples and record");
  withRemote(repo);
  return { repo, initial, commits, entry };
}
