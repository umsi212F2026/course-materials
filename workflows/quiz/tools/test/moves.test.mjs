import { test } from "node:test";
import assert from "node:assert/strict";
import { tagsForMove } from "../../../learn/tools/lib/moves.mjs";

test("a production move is tagged production", () => {
  assert.deepEqual(tagsForMove("CATCH"), ["production"]);
});

test("a reception move is tagged reception", () => {
  assert.deepEqual(tagsForMove("DEFINE"), ["reception"]);
});

test("a missing or unknown move carries no tag", () => {
  assert.deepEqual(tagsForMove(undefined), []);
  assert.deepEqual(tagsForMove("NOPE"), []);
});

test("an inherited object key is not a move", () => {
  assert.deepEqual(tagsForMove("toString"), []);
});
