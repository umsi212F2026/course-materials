#!/usr/bin/env node
//
// Draw a practice quiz from one source, for a student practising on their own machine.
//
//   node workflows/quiz/tools/quiz-draw.mjs learning-topics/commits-and-history-2026-09
//   node workflows/quiz/tools/quiz-draw.mjs assignments/ps1-data-analysis --seed anything
//
// THE SAME LIBRARY THE REAL QUIZ DRAWS FROM. bank.mjs is shared with the instructor's bake,
// so a practice quiz is not a rehearsal of the real thing, it is the real thing with a
// different front end. That is the claim this file exists to make true.
//
// THE SHAPE COMES FROM THE SOURCE, NOT FROM A POOL. Which questions are fair on a given date
// is a judgment about one session and lives in the instructor's clone, where no student can
// see it. So each tasks file declares its own practice shape in its intro, and that is what is
// drawn here: the same strata a real quiz uses, without publishing the selection.
//
// RANDOM EVERY TIME, on purpose. The instructor's bake is seeded from the date and the
// uniqname so that fixing a typo and re-baking does not reshuffle anyone's quiz. Practice has
// the opposite requirement: a second attempt that served the same four questions would be
// testing recall of this morning rather than of the material. `--seed` exists for tests.
//
// THE RUBRICS COME WITH THE DRAW, and that is not a leak. They live in the topic, which
// students already have, and the whole design is that studying the material and studying for
// the quiz are the same act. Not showing them until the answer is given is a discipline the
// skill keeps, not a secret this file protects.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readBank } from "./lib/bank.mjs";

const here = dirname(fileURLToPath(import.meta.url));
// The workspace root: the folder holding course-materials, learning-topics and assignments.
// A source is named as a path from here, so it means the same thing on every machine.
const ROOT = process.env.SOURCES_ROOT ?? resolve(here, "..", "..", "..", "..");

/** mulberry32, seeded from a string, so a test can ask for the same draw twice. */
function rng(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(items, count, next) {
  const pool = [...items];
  const out = [];
  while (out.length < count && pool.length) {
    out.push(...pool.splice(Math.floor(next() * pool.length), 1));
  }
  return out;
}

/** One practice quiz: every bank in the source contributes the number it declares.
 *
 *  A bank that declares nothing contributes nothing, and says so. Guessing a number would
 *  make the practice quiz a different shape from the real one, which is the one thing it is
 *  supposed to share. */
export function drawPractice(bank, { seed } = {}) {
  const next = rng(seed ?? `${Date.now()}:${Math.random()}`);
  const byBank = new Map();
  for (const item of bank.items) {
    if (!byBank.has(item.bank)) byBank.set(item.bank, []);
    byBank.get(item.bank).push(item);
  }

  const problems = [...bank.problems];
  const items = [];
  const strata = [];
  for (const [name, available] of [...byBank].sort()) {
    const take = available[0].practice;
    if (take == null) {
      problems.push(`${name} does not say how many a practice quiz should draw, so it contributed none. Add "**Practice draw:** <n>" to its intro.`);
      continue;
    }
    if (available.length < take) {
      problems.push(`${name} asks for ${take} but has only ${available.length}, so all of them were drawn`);
    }
    const drawn = pick(available, Math.min(take, available.length), next);
    strata.push({ name, take, drawn: drawn.length });
    items.push(...drawn);
  }
  return { items, strata, problems };
}

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const seedAt = process.argv.indexOf("--seed");
  const source = args[0];
  if (!source) {
    console.error("Usage: node workflows/quiz/tools/quiz-draw.mjs <source> [--seed <text>]");
    console.error("  e.g. learning-topics/commits-and-history-2026-09");
    process.exit(1);
  }

  const dir = join(ROOT, source);
  if (!existsSync(dir)) {
    console.error(`No ${source} under ${ROOT}. Name it as a path from your workspace root.`);
    process.exit(1);
  }

  const bank = readBank(dir, source);
  const { items, strata, problems } = drawPractice(bank, {
    seed: seedAt === -1 ? undefined : process.argv[seedAt + 1],
  });

  if (problems.length) {
    for (const p of problems) console.error(`  ${p}`);
    console.error("");
  }
  if (!items.length) {
    console.error(`${source} has no practice quiz to draw. Its banks declare no practice shape.`);
    process.exit(1);
  }

  process.stdout.write(
    JSON.stringify({ source, drawn: new Date().toISOString(), strata, items }, null, 2) + "\n",
  );
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
