import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { resolveImages, sourceDir, taskFile } from "../lib/images.mjs";

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = (tail) => Buffer.concat([SIG, Buffer.from(tail)]);
const sha = (b) => createHash("sha256").update(b).digest("hex");

// A source with tasks/a-x/pic.png and tasks/a-y/copy.png (same bytes), tasks/a-x/bad.png (not a PNG).
function fixture() {
  const src = mkdtempSync(join(tmpdir(), "images-test-"));
  mkdirSync(join(src, "tasks", "a-x"), { recursive: true });
  mkdirSync(join(src, "tasks", "a-y"), { recursive: true });
  const bytes = png("same");
  writeFileSync(join(src, "tasks", "a-x", "pic.png"), bytes);
  writeFileSync(join(src, "tasks", "a-y", "copy.png"), bytes);
  writeFileSync(join(src, "tasks", "a-x", "bad.png"), "not a png at all");
  return { src, bytes, hash: sha(bytes) };
}

const item = (prompt, id = "a-x/s1/q1") => ({ id, bank: "t/a-x", activity: "a-x", scenario: "s1", prompt });

test("rewrites an image line to its hash", () => {
  const { src, hash } = fixture();
  const out = resolveImages([item("Setup.\n\n![d](pic.png)\n\nQ?")], () => src);
  assert.deepEqual(out.problems, []);
  assert.equal(out.items[0].prompt, `Setup.\n\n![d](/api/images/${hash}.png)\n\nQ?`);
  assert.deepEqual(out.images, { [hash]: join(src, "tasks", "a-x", "pic.png") });
});

test("one entry for shared bytes", () => {
  const { src, hash } = fixture();
  const out = resolveImages([item("![d](pic.png)", "i1"), item("![d](../a-y/copy.png)", "i2")], () => src);
  assert.deepEqual(out.problems, []);
  assert.deepEqual(Object.keys(out.images), [hash]);
  assert.equal(out.items.length, 2);
});

test("tolerates CRLF and trailing spaces", () => {
  const { src, hash } = fixture();
  const out = resolveImages([item("Setup.\r\n\r\n![d](pic.png)  \r\n\r\nQ?")], () => src);
  assert.deepEqual(out.problems, []);
  assert.equal(out.items[0].prompt.replace(/\r/g, ""), `Setup.\n\n![d](/api/images/${hash}.png)\n\nQ?`);
});

for (const [name, target] of [
  ["a missing file", "nope.png"],
  ["a file without the PNG signature", "bad.png"],
  ["a path outside the source", "../../../outside.png"],
  ["an absolute path", "/etc/x.png"],
  ["a URL", "https://e.com/x.png"],
  ["a Windows drive path", "C:\\x.png"],
  ["a directory", "."],
]) {
  test(`${name} is a problem and drops the item`, () => {
    const { src } = fixture();
    const out = resolveImages([item(`![d](${target})`, "the-id")], () => src);
    assert.equal(out.items.length, 0);
    assert.deepEqual(out.images, {});
    assert.equal(out.problems.length, 1);
    assert.ok(out.problems[0].includes("the-id"), out.problems[0]);
    assert.ok(out.problems[0].includes(target), out.problems[0]);
  });
}

test("a sibling folder sharing the source's name prefix is outside it", () => {
  const { src, bytes } = fixture();
  mkdirSync(`${src}-other`, { recursive: true });
  writeFileSync(join(`${src}-other`, "x.png"), bytes);
  const target = `../../../${basename(src)}-other/x.png`;
  const out = resolveImages([item(`![d](${target})`, "sib")], () => src);
  assert.equal(out.items.length, 0);
  assert.equal(out.problems.length, 1);
  assert.ok(out.problems[0].includes("sib"));
});

test("a directory named like an image is cannot-be-read, not missing", () => {
  const { src } = fixture();
  mkdirSync(join(src, "tasks", "a-x", "dir.png"));
  const out = resolveImages([item("![d](dir.png)", "dd")], () => src);
  assert.equal(out.items.length, 0);
  assert.match(out.problems[0], /cannot be read/);
});

test("a leftover reference is a problem", () => {
  const { src } = fixture();
  const hex = "a".repeat(64);
  for (const prompt of ["See ![d](pic.png) here.", `![d](/api/images/${hex}.png)`, "See ![a [b]](pic.png) here.", "![a [b]](pic.png)"]) {
    const out = resolveImages([item(prompt, "left")], () => src);
    assert.equal(out.items.length, 0, prompt);
    assert.equal(out.problems.length, 1, prompt);
    assert.ok(out.problems[0].includes("left"));
  }
});

test("an item without images passes through unchanged", () => {
  const { src } = fixture();
  const it = item("Just text.\n\nQ?");
  const out = resolveImages([it], () => src);
  assert.equal(out.items[0].prompt, "Just text.\n\nQ?");
  assert.deepEqual(out.images, {});
  assert.deepEqual(out.problems, []);
});

test("an item with no prompt keeps no prompt", () => {
  const { src } = fixture();
  const { prompt, ...bare } = item("x");
  const out = resolveImages([bare], () => src);
  assert.deepEqual(out.items, [bare]);
  assert.ok(!("prompt" in out.items[0]));
});

test("the input items are not mutated", () => {
  const { src } = fixture();
  const it = item("![d](pic.png)");
  resolveImages([it], () => src);
  assert.equal(it.prompt, "![d](pic.png)");
});

test("sourceDir: topic form and multi-source form", () => {
  assert.equal(sourceDir({ topic: "t1" }, { bank: "words" }, "/r"), join("/r", "learning-topics", "t1"));
  assert.equal(sourceDir({}, { bank: "learning-topics/t1/a-x" }, "/r"), join("/r", "learning-topics", "t1"));
  assert.equal(sourceDir({}, { bank: "assignments/ps1/words" }, "/r"), join("/r", "assignments", "ps1"));
});

test("taskFile: folder item and single-file item", () => {
  assert.equal(taskFile("/s", { bank: "t/a-x", activity: "a-x", scenario: "s1" }), join("/s", "tasks", "a-x", "s1.md"));
  assert.equal(taskFile("/s", { bank: "t/words" }), join("/s", "tasks", "words.md"));
  assert.equal(taskFile("/s", { bank: "words" }), join("/s", "tasks", "words.md"));
});
