import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listFiles, readRepoFile, MAX_FILES } from "../lib/files.mjs";

function tree() {
  const root = mkdtempSync(join(tmpdir(), "files-"));
  for (const p of ["a.md", "app/package.json", "app/src/x.js", "app/node_modules/dep/index.js", ".git/HEAD"]) {
    mkdirSync(join(root, p, ".."), { recursive: true });
    writeFileSync(join(root, p), "x");
  }
  symlinkSync("/", join(root, "app", "loop"));
  return root;
}

test("listFiles walks the clone, skipping node_modules, .git and symlinks", () => {
  const root = tree();
  assert.deepEqual(listFiles(root), ["a.md", "app/package.json", "app/src/x.js"]);
  assert.deepEqual(listFiles(root, "."), ["a.md", "app/package.json", "app/src/x.js"]);
  assert.deepEqual(listFiles(root, "app"), ["app/package.json", "app/src/x.js"]);
  assert.deepEqual(listFiles(root, "missing"), []);
});

test("listFiles stops at MAX_FILES", () => {
  const root = mkdtempSync(join(tmpdir(), "files-"));
  for (let i = 0; i < MAX_FILES + 10; i++) writeFileSync(join(root, `f${i}`), "");
  assert.equal(listFiles(root).length, MAX_FILES);
});

test("listFiles lists nothing for a dir that is a symlink, runs through one, or is a file", () => {
  const root = tree();
  const other = mkdtempSync(join(tmpdir(), "files-other-"));
  writeFileSync(join(other, "secret.md"), "x");
  symlinkSync(other, join(root, "linked"));
  assert.deepEqual(listFiles(root, "linked"), []);
  assert.deepEqual(listFiles(root, "app/loop"), []);
  assert.deepEqual(listFiles(root, "a.md"), []);
});

test("listFiles skips virtual environments and their caches", () => {
  const root = mkdtempSync(join(tmpdir(), "files-"));
  for (const p of [".venv/lib/x.py", "venv/y.py", "app/__pycache__/z.pyc", "app/site-packages/w.py", "app/keep.js"]) {
    mkdirSync(join(root, p, ".."), { recursive: true });
    writeFileSync(join(root, p), "x");
  }
  assert.deepEqual(listFiles(root), ["app/keep.js"]);
});

test("readRepoFile reads a regular file, nested or not", () => {
  const root = tree();
  assert.equal(readRepoFile(root, "a.md"), "x");
  assert.equal(readRepoFile(root, "app/src/x.js"), "x");
});

test("readRepoFile returns null for a symlinked file, even to a real file", () => {
  const root = tree();
  const other = mkdtempSync(join(tmpdir(), "files-other-"));
  writeFileSync(join(other, "secret"), "SECRET");
  symlinkSync(join(other, "secret"), join(root, "REFLECTION.md"));
  symlinkSync("a.md", join(root, "inner.md"));
  assert.equal(readRepoFile(root, "REFLECTION.md"), null);
  assert.equal(readRepoFile(root, "inner.md"), null);
});

test("readRepoFile returns null for a path through a symlinked directory", () => {
  const root = tree();
  const other = mkdtempSync(join(tmpdir(), "files-other-"));
  writeFileSync(join(other, "secret.md"), "SECRET");
  symlinkSync(other, join(root, "linked"));
  assert.equal(readRepoFile(root, "linked/secret.md"), null);
});

test("readRepoFile returns null for a directory, a missing file, a file used as a directory", () => {
  const root = tree();
  mkdirSync(join(root, "REFLECTION.md"));
  assert.equal(readRepoFile(root, "REFLECTION.md"), null);
  assert.equal(readRepoFile(root, "app"), null);
  assert.equal(readRepoFile(root, "nope.md"), null);
  assert.equal(readRepoFile(root, "a.md/inside"), null);
});

test("readRepoFile refuses a parent segment or an absolute path", () => {
  const parent = mkdtempSync(join(tmpdir(), "files-parent-"));
  const root = join(parent, "clone");
  mkdirSync(root);
  writeFileSync(join(root, "a.md"), "x");
  writeFileSync(join(parent, "files-outside.txt"), "OUT");
  assert.equal(readRepoFile(root, "../files-outside.txt"), null);
  assert.equal(readRepoFile(root, "app/../a.md"), null);
  assert.equal(readRepoFile(root, join(root, "a.md")), null);
  rmSync(parent, { recursive: true, force: true });
});
