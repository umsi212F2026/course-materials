import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { imageResponse, page } from "../quiz-practice.mjs";

const HASH = "a".repeat(64);
const OTHER = "b".repeat(64);
const dir = mkdtempSync(join(tmpdir(), "practice-images-"));
const file = join(dir, "pic.png");
const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
writeFileSync(file, bytes);
const images = { [HASH]: file };

test("a known hash is served as image/png with the file's bytes", () => {
  const r = imageResponse(images, `/api/images/${HASH}.png`);
  assert.equal(r.status, 200);
  assert.equal(r.type, "image/png");
  assert.deepEqual(Buffer.from(r.body), bytes);
});

test("a query string is ignored", () => {
  assert.equal(imageResponse(images, `/api/images/${HASH}.png?v=1`).status, 200);
});

test("a well-formed hash that is not in the draw is 404", () => {
  assert.equal(imageResponse(images, `/api/images/${OTHER}.png`).status, 404);
});

test("a path traversal is 404", () => {
  assert.equal(imageResponse(images, "/api/images/../../etc/passwd").status, 404);
});

test("a malformed name is 404", () => {
  assert.equal(imageResponse(images, "/api/images/ABC.png").status, 404);
  assert.equal(imageResponse(images, `/api/images/${HASH.toUpperCase()}.png`).status, 404);
});

test("a mapped file that has vanished is 404, not a crash", () => {
  const gone = { [HASH]: join(dir, "missing.png") };
  assert.equal(imageResponse(gone, `/api/images/${HASH}.png`).status, 404);
});

test("the page shows figures at natural size, scrolling sideways when wide", () => {
  const html = page([{ id: "q1", type: "free", prompt: "Hello" }], "src");
  assert.ok(html.includes(".figure{overflow-x:auto}"));
  assert.match(html, /\.figure img\{[^}]*max-width:none/);
  assert.match(html, /\.figure img\{[^}]*display:block/);
});
