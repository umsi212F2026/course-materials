#!/usr/bin/env node
//
// Draw a practice quiz from one session's published pool.
//
//   node workflows/quiz/tools/quiz-draw.mjs --session 5
//   node workflows/quiz/tools/quiz-draw.mjs --session 5 --seed anything
//
// THE SAME LIBRARY THE REAL QUIZ DRAWS FROM. bank.mjs is shared with the instructor's bake,
// so a practice quiz is not a rehearsal of the real thing, it is the real thing with a
// different front end. That is the claim this file exists to make true.
//
// THE SHAPE COMES FROM THE SAME POOL FILE THE REAL QUIZ USED. A pool says how many to draw
// from each bank on one date, and it is published, so this is not a restatement of the quiz's
// shape but the quiz's shape. The shape is a judgment about one session rather than a property
// of the material: a topic examined twice in a term can be drawn two different ways, which is
// why this cannot live in a tasks file.
//
// IT DISCLOSES NOTHING. A pool says how many from where, never which questions, and the draw
// below is random per run. The questions themselves are in repositories students already have.
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

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPoolSources, applyPool, recordLabel } from "./lib/bank.mjs";
import { readLog, readGoals } from "../../learn/tools/lib/topic.mjs";

const here = dirname(fileURLToPath(import.meta.url));
// The workspace root: the folder holding course-materials, learning-topics and assignments.
// A source is named as a path from here, so it means the same thing on every machine.
const REPO = resolve(here, "..", "..", "..");
const ROOT = process.env.SOURCES_ROOT ?? resolve(REPO, "..");
const POOLS = join(REPO, "quiz-bank");

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

/** Which topic folder an item's attempt gets recorded against, as a path.
 *
 *  TWO POOL SHAPES, ONE ANSWER. The single-topic form names the topic once at the top; the
 *  multi-source form spells it into every draw key, `learning-topics/<folder>/<bank file>`, and
 *  the folder is the segment after `learning-topics`. Deriving it rather than asking for it is
 *  the same choice readPoolSources made about the sources themselves: two statements of one
 *  fact are two statements that can disagree.
 *
 *  A SOURCE THAT IS NOT A LEARNING TOPIC HAS NO TOPIC, and null is the honest answer rather
 *  than a guess. An assignment's follow-up questions are the case: nobody set goals for a
 *  problem set, so the item carries no goal either, and there is nothing to record.
 *
 *  It is not checked for existence here. A student who has not cloned the topic gets a draw
 *  and a score either way; what they lose is the attempt, and the skill is where that is
 *  noticed, because that is where it can be said out loud. */
export function topicDir(pool, item, root) {
  if (pool.topic) return join(root, "learning-topics", pool.topic);
  const parts = String(item.bank ?? "").split("/");
  const at = parts.indexOf("learning-topics");
  return at === -1 || !parts[at + 1] ? null : join(root, "learning-topics", parts[at + 1]);
}

/** Drop every item that names a goal which is not a course goal; one problem per dropped item.
 *
 *  ONLY COURSE GOALS ARE EXAMINED. A learner's own goal is theirs to set and theirs to meet,
 *  and a quiz that drew on it would grade something the course never asked for. The practice
 *  quiz applies this, and the instructor's bake must call it too, so the two stay the same
 *  draw.
 *
 *  A QUESTION NAMING ANY GOAL THAT ISN'T COURSE IS DROPPED, not just one naming only such goals:
 *  a two-goal question graded per goal would otherwise score a goal the quiz must not examine.
 *  A question naming no goal is kept, and so is one with no topic: an assignment's follow-up
 *  has nobody's goals to check it against. A goal id the topic does not have reads as not
 *  course, since nothing says the course set it; so a topic with no goals.md (a test fixture
 *  built from bank files alone, say) draws nothing that names a goal. */
export function courseOnly(items) {
  const origins = new Map();
  const originOf = (topic, goal) => {
    if (!origins.has(topic)) {
      origins.set(topic, new Map(readGoals(topic).goals.map((g) => [g.id, g.origin])));
    }
    return origins.get(topic).get(goal);
  };
  const kept = [];
  const problems = [];
  for (const it of items) {
    const named = it.goals ?? (it.goal ? [it.goal] : []);
    const bad = it.topic ? named.find((g) => originOf(it.topic, g) !== "course") : undefined;
    if (bad === undefined) kept.push(it);
    else problems.push(`${it.id}${it.bank ? ` (${it.bank})` : ""} dropped: ${bad} is not a course goal`);
  }
  return { items: kept, problems };
}

/** One practice quiz from one session's pool: each stratum contributes what the pool asks for.
 *
 *  This is the instructor's bake with the roster taken out and the seed left random. The strata
 *  come from applyPool, which is the same function the bake uses, so "three about reading a
 *  diagram and one about lanes" is as much a guarantee here as it is in class.
 *
 *  UNSEEN FIRST. Within a stratum the seeded shuffle still happens, then a stable sort by when
 *  this student last attempted each question puts never-seen first and then the oldest, so the
 *  shuffle only breaks ties. A question naming no goal comes after every goal-bearing one. A
 *  student who has seen every question in a stratum is still drawn for, least recently seen
 *  first: a short stratum must not run dry because it was practised.
 *  The log is the topic's own (the label a question is recorded under is `recordLabel`), so an
 *  item with no topic has no history and sorts as unseen. `preferUnseen: false` is today's
 *  plain random draw. */
export function drawPractice(pool, root, { seed, preferUnseen = true } = {}) {
  const bank = readPoolSources(pool, root);
  const { strata, problems } = applyPool(bank, pool);
  const next = rng(seed ?? `${Date.now()}:${Math.random()}`);

  // The topic travels with the item for the same reason the goal does: what a practice quiz
  // leaves behind is an attempt in a topic's log, and the two together are the whole address
  // of where it goes. The instructor's bake needs neither and does not carry them.
  const withTopic = strata.map((s) => ({ ...s, items: s.items.map((it) => ({ ...it, topic: topicDir(pool, it, root) })) }));
  const course = courseOnly(withTopic.flatMap((s) => s.items));
  // By identity, not id: single-file ids repeat across topics in a multi-source draw.
  const keep = new Set(course.items);
  // An item sitting in two strata would be reported twice; once says it.
  problems.push(...new Set(course.problems));

  const lastSeen = new Map();
  // As instants, not strings, as pick.mjs does: two offsets or a missing `Z` sort wrongly as text.
  // Never seen, or an unparseable time, is -Infinity, so it sorts first.
  const seenAt = (it) => {
    if (!it.topic) return -Infinity;
    if (!lastSeen.has(it.topic)) {
      const latest = new Map();
      for (const e of readLog(it.topic)) {
        const t = typeof e.at === "string" ? Date.parse(e.at) : NaN;
        if (e.label && !Number.isNaN(t) && t > (latest.get(e.label) ?? -Infinity)) latest.set(e.label, t);
      }
      lastSeen.set(it.topic, latest);
    }
    return lastSeen.get(it.topic).get(recordLabel(it)) ?? -Infinity;
  };
  // GOAL-LESS LAST, as in pick.mjs: a question naming no goal records nothing, so it is served
  // only when no goal-bearing question is left in the stratum.
  const goalless = (it) => ((it.goals ?? (it.goal ? [it.goal] : [])).length === 0 ? 1 : 0);

  const items = [];
  const shape = [];
  for (const s of withTopic) {
    const pickable = s.items.filter((it) => keep.has(it));
    const count = Math.min(s.take, pickable.length);
    // Without preferUnseen only `count` are picked, so later strata consume the same RNG values as before.
    let drawn = pick(pickable, preferUnseen ? pickable.length : count, next);
    if (preferUnseen) {
      drawn = drawn
        .map((it) => [goalless(it), seenAt(it), it])
        .sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
        .map(([, , it]) => it);
    }
    drawn = drawn.slice(0, count);
    shape.push({ name: s.name, take: s.take, drawn: drawn.length, ...(s.bank ? { bank: s.bank } : {}) });
    items.push(...drawn);
  }

  // WHAT WAS ASKED FOR IS THE POOL'S OWN COUNTS, NOT WHAT SURVIVED, and the difference is the
  // whole of this check. A draw key whose bank is missing does not come back from applyPool as
  // an empty stratum; it does not come back at all. Measuring a shortfall against `strata`
  // therefore cannot see the case that costs a student most: a source they have not cloned.
  //
  // A SHORT DRAW IS SERVED, NOT REFUSED. Practising the rest is worth doing. But nobody can
  // count the questions they were never shown, so this is the one thing the draw has to say
  // out loud, and the skill has to pass it on.
  // Summed by name, because a topic-level key comes back as one stratum per bank it spread over.
  const drawnBy = new Map();
  for (const s of shape) drawnBy.set(s.name, (drawnBy.get(s.name) ?? 0) + s.drawn);
  for (const [name, take] of Object.entries(pool.draw ?? {})) {
    const got = drawnBy.get(name) ?? 0;
    if (got < take) problems.push(`${name} drew ${got} of the ${take} asked for`);
  }

  return { items, strata: shape, problems };
}

/** The published pool for one session, from the clone this tool lives in. */
export function loadPool(session) {
  const path = join(POOLS, `session-${session}.pool.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Every session with a published pool, oldest first.
 *
 *  Which quizzes exist is a fact about the folder, and reading it here rather than asking the
 *  skill to glob and parse keeps one answer to "what can I practise". A pool appears the moment
 *  the instructor publishes it, so this is also how a student finds out a new one is there.
 *
 *  A POOL WHOSE SOURCES A STUDENT DOES NOT HAVE IS NOT LISTED, because the question this
 *  answers is what they can practise, not what quizzes have happened. Session 3 is the case:
 *  it draws from a topic that is authored in the instructor's clone and deliberately not
 *  published, so its draw comes up empty on every student machine. Offering it and then
 *  failing is worse than not offering it. Naming the session directly still runs, and still
 *  says exactly which banks are missing, which is what an instructor needs and a student does
 *  not.
 *
 *  Drawable means the draw actually produces items, not that the folders exist. That is a few
 *  markdown reads per pool, which is nothing next to being wrong about it. */
export function listPools(root = ROOT) {
  if (!existsSync(POOLS)) return [];
  return readdirSync(POOLS)
    .map((n) => /^session-(\d+)\.pool\.json$/.exec(n))
    .filter(Boolean)
    .map((m) => ({ session: Number(m[1]), ...JSON.parse(readFileSync(join(POOLS, m[0]), "utf8")) }))
    .filter((pool) => {
      try {
        return applyPool(readPoolSources(pool, root), pool).strata.some((s) => s.items.length);
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.session - b.session);
}

function main() {
  const seedAt = process.argv.indexOf("--seed");
  const sessionAt = process.argv.indexOf("--session");
  const session = sessionAt === -1 ? null : process.argv[sessionAt + 1];
  if (!session) {
    console.error("Usage: node workflows/quiz/tools/quiz-draw.mjs --session <n> [--seed <text>]");
    process.exit(1);
  }

  const pool = loadPool(session);
  if (!pool) {
    console.error(`No published pool for session ${session}.`);
    process.exit(1);
  }

  const { items, strata, problems } = drawPractice(pool, ROOT, {
    seed: seedAt === -1 ? undefined : process.argv[seedAt + 1],
  });

  if (problems.length) {
    for (const p of problems) console.error(`  ${p}`);
    console.error("");
  }
  if (!items.length) {
    console.error(`Session ${session}'s pool drew nothing.`);
    process.exit(1);
  }

  process.stdout.write(
    JSON.stringify({ session: pool.session, date: pool.date, drawn: new Date().toISOString(), strata, items }, null, 2) + "\n",
  );
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
