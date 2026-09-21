#!/usr/bin/env node
//
// Sit a practice quiz on a page, then score it once an agent has ruled the written answers.
//
//   node workflows/quiz/tools/quiz-practice.mjs --list
//   node workflows/quiz/tools/quiz-practice.mjs --session 5
//   node workflows/quiz/tools/quiz-practice.mjs --score tmp/practice-2026-09-20T14-02-11
//
// THE QUESTIONS ARE ANSWERED ON A PAGE, NOT IN A CHAT, and that is the point rather than the
// presentation. An agent serving the questions is an agent holding the rubric while the person
// answering is talking to it: nothing stops a hint being asked for, and `unaided` stops meaning
// anything. A page keeps the same separation the real quiz has. The agent sees the answers
// only once they are given.
//
// THE FILES IT WRITES ARE THE SHAPES THE REAL QUIZ WRITES, so the same grading code reads them
// with no practice-specific branch. That is what makes "you practise against the real grader"
// a fact about the code rather than a claim in a syllabus.
//
// LOCAL, AND BOUND TO 127.0.0.1. No auth, no database, no cluster, and it works on a train.
// The real app needs all of that because it serves forty-eight people a graded assessment;
// none of it is needed to answer four questions for yourself.
//
// TRANSIENT ON PURPOSE. What lasts from a practice run is the attempt recorded in the topic's
// evidence, which is the course's existing record of what happened. The draw and the answers
// are the paperwork that produced it, and they go in tmp/.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drawPractice, loadPool, listPools } from "./quiz-draw.mjs";
import { collectAnswers, buildQueue, mergeGrades, CREDIT_VALUE } from "./lib/grade.mjs";
// THE LEARN WORKFLOW'S READER, not a second one. What a practice quiz leaves behind is an
// attempt in a topic's log, so this tool already lives on the far side of that boundary; a
// private copy of how goals.md parses would be one more thing to keep in step with it.
import { readIds } from "../../learn/tools/lib/topic.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "..", "..", "..");
const ROOT = process.env.SOURCES_ROOT ?? resolve(REPO, "..");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// WHICH MOVES ARE PRODUCTION ONES, from workflows/learn/skills/goal-setting/references/
// vocabulary-moves.md. A word carries `bar: one production pass`, and the tag is the only thing
// that tells the bar whether a move was one, so an item answered here counts toward finishing a
// word exactly as the same move would in study. The table is five rows and has not changed; if
// it grows, it grows there and here together, and a move missing below records no tag rather
// than a wrong one.
const MOVE_TAGS = {
  DEFINE: "reception",
  INTERPRET: "reception",
  DISTINGUISH: "production",
  CATCH: "production",
  APPLY: "production",
};

/** Every goal named by the draw, keyed by id, with the topic it came from.
 *
 *  One read per topic rather than one per item, and a topic that isn't cloned simply
 *  contributes nothing: the draw still serves, the answers are still marked, and what is lost
 *  is the recording. The skill says so out loud, because that is where it can be. */
function goalsFor(items) {
  const byId = new Map();
  for (const dir of new Set(items.map((i) => i.topic).filter(Boolean))) {
    if (!existsSync(dir)) continue;
    for (const [id, goal] of readIds(dir)) byId.set(id, goal);
  }
  return byId;
}

/** The page. Every item on one screen, answered cold, submitted once. */
function page(items, source) {
  const body = items
    .map((it, i) => {
      const field =
        // NO NUMBERS ON THE CHOICES, because the real quiz has none: its ItemMcq renders a
        // radio and the text, and nothing else. Numbering them here would teach a student to
        // think of "option 3" and then not offer them one on the day. It also put two markers
        // on every row, a list number and a radio, which is what made this look wrong.
        it.type === "mcq"
          ? `<ul class=choices>${(it.choices ?? [])
              .map(
                (c, j) =>
                  `<li><label><input type=radio name="${esc(it.id)}" value="${j}"><span>${esc(c)}</span></label></li>`,
              )
              .join("")}</ul>`
          : `<textarea name="${esc(it.id)}" rows=5 placeholder="Your answer, in your own words"></textarea>`;
      return `<section><h2>Question ${i + 1} of ${items.length}</h2><p class=prompt>${esc(it.prompt)}</p>${field}</section>`;
    })
    .join("");

  return `<!doctype html>
<meta charset="utf-8"><title>Practice quiz</title>
<style>
 :root{color-scheme:light}
 body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fbfbfa;color:#1a1a1a}
 main{max-width:760px;margin:0 auto;padding:28px 22px 80px}
 h1{font-size:20px;margin:0 0 4px} .src{color:#6b6b6b;font-size:13px;margin:0 0 20px;font-family:ui-monospace,Menlo,monospace}
 .cold{background:#fff6e0;border:1px solid #e0c98a;color:#5d4508;padding:11px 14px;font-size:14px;margin:0 0 26px}
 section{background:#fff;border:1px solid #dcdcd8;border-radius:6px;padding:18px 20px;margin:0 0 18px}
 h2{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b6b6b;margin:0 0 10px}
 .prompt{margin:0 0 14px;white-space:pre-wrap}
 textarea{width:100%;box-sizing:border-box;padding:10px;border:1px solid #dcdcd8;border-radius:5px;font:inherit}
 /* A locked answer still has to be readable: WebKit greys disabled text out, and the whole
    point of leaving the page up is that they can read what they wrote while the agent marks
    it. -webkit-text-fill-color is the one that actually wins there; color alone does not. */
 textarea:disabled{color:inherit;-webkit-text-fill-color:currentColor;opacity:1;background:#fbfbfa}
 ul.choices label:has(input:disabled){cursor:default}
 ul.choices label:has(input:disabled):hover{background:none}
 ul.choices input:disabled:checked+span{font-weight:600}
 ul.choices{margin:0;padding:0;list-style:none}
 ul.choices li{margin:0 0 2px}
 /* A flex row so a choice that wraps lines up under its own text rather than under the radio,
    and so the whole row is the click target rather than just the words. */
 ul.choices label{display:flex;gap:11px;align-items:flex-start;cursor:pointer;
   padding:7px 10px;border-radius:5px}
 ul.choices label:hover{background:#f2f4f7}
 ul.choices input{flex:0 0 auto;margin:6px 0 0}
 ul.choices span{flex:1}
 button{padding:11px 26px;border:0;border-radius:6px;background:#2f6bb0;color:#fff;font:inherit;font-weight:600;cursor:pointer}
 #done{display:none;padding:22px;background:#eaf5ee;border:1px solid #a8cfb8;border-radius:6px}
</style>
<main>
 <h1>Practice quiz</h1>
 <p class=src>${esc(source)}</p>
 <p class=cold>Answer these cold, with nothing else open. Nothing here will help you, on
  purpose: an answer you talked your way to does not tell you what you know. Your agent sees
  what you wrote only after you submit.</p>
 <form id=f>${body}
  <button type=submit>Submit</button>
 </form>
 <div id=done><b>Submitted.</b> Go back to your agent, which will mark these and go through
  them with you. Your answers stay on this tab if you want to read them while it does.</div>
</main>
<script>
 document.getElementById("f").onsubmit = async (e) => {
   e.preventDefault();
   const answers = {};
   for (const [k, v] of new FormData(e.target)) answers[k] = v;
   await fetch("/submit", { method: "POST", headers: { "content-type": "application/json" },
                            body: JSON.stringify({ answers }) });
   // THE PAGE IS LEFT STANDING, LOCKED, RATHER THAN REPLACED. The report that comes back names
   // each question and what they wrote, and a student reading it wants to look at the thing
   // itself. Hiding the form made the only copy of their own answers disappear at the moment
   // they became worth re-reading.
   for (const el of e.target.elements) el.disabled = true;
   e.target.querySelector("button[type=submit]").style.display = "none";
   document.getElementById("done").style.display = "block";
 };
</script>`;
}

/** Write the draw, the answers and the work left for the agent, all in the shapes the real
 *  quiz uses. Multiple choice is counted here and written nowhere: scoring settles it again
 *  from the draw. */
function record(dir, source, items, answers) {
  mkdirSync(dir, { recursive: true });
  const now = new Date().toISOString();
  const date = now.slice(0, 10);

  const drawFile = {
    session: null,
    date,
    generated: now,
    practice: source,
    draws: [{ uniqname: "me", canvas_id: null, items }],
    spares: [],
  };
  const given = Object.entries(answers)
    .filter(([, text]) => String(text).trim() !== "")
    .map(([item_id, text]) => ({ item_id, text }));
  const submissionsFile = {
    date,
    exported: now,
    state_events: [],
    spare_claims: [],
    submissions: [{ uniqname: "me", canvas_id: null, version: 1, submitted: now, answers: given }],
    drafts: [],
  };

  writeFileSync(join(dir, "draw.json"), JSON.stringify(drawFile, null, 2) + "\n");
  writeFileSync(join(dir, "submissions.json"), JSON.stringify(submissionsFile, null, 2) + "\n");

  const rows = collectAnswers(drawFile, submissionsFile);
  const goals = goalsFor(items);
  const byId = new Map(items.map((it) => [it.id, it]));

  // WHAT buildQueue RETURNS, PLUS WHAT ONLY THIS SIDE KNOWS. The shared function is the
  // instructor's too, and the batch runner works from a draw file and a submissions file with
  // no learning-topics in reach: it has no criterion to send and no topic to record against.
  // Here both are at hand, so they go in rather than being looked up twice, once by the grade
  // skill and again by the practice skill.
  const queue = buildQueue(rows).map((g) => {
    const it = byId.get(g.item);
    const goal = it?.goal ? goals.get(it.goal) : null;
    return {
      ...g,
      topic: it?.topic ?? null,
      move: it?.move ?? null,
      tags: it?.move ? MOVE_TAGS[it.move] ?? null : null,
      // THE CRITERION, SO THE SKILL CAN SAY WHAT KIND OF ITEM THIS IS. `kind: capability` turns
      // on whether a written answer could establish the goal, and that is a reading of the
      // criterion rather than a slot to look up: `c-describe-app-bug` is met by writing the
      // request, and `c-commit-recovery-point` is not met by describing the act. The `c-`
      // prefix separates them in neither case.
      criterion: goal?.criterionText ?? null,
    };
  });

  // EVERY GOAL THE DRAW EXAMINED, INCLUDING THE ONES WITH NO WRITTEN ANSWER. `items` above is
  // the work to rule on, and multiple choice is deliberately not in it; but whether a goal is
  // met by doing rather than by writing is a fact about the GOAL, and a goal examined only by
  // an mcq needs that answer as much as any other. Without this list it never gets asked, and a
  // capability quietly records as met because somebody picked the right option out of four.
  const examined = [];
  const seenGoal = new Set();
  for (const it of items) {
    if (!it.goal || seenGoal.has(it.goal)) continue;
    seenGoal.add(it.goal);
    examined.push({
      goal: it.goal,
      topic: it.topic ?? null,
      criterion: goals.get(it.goal)?.criterionText ?? null,
    });
  }

  writeFileSync(
    join(dir, "queue.json"),
    JSON.stringify({ date, goals: examined, items: queue }, null, 2) + "\n",
  );

  // MULTIPLE CHOICE IS SETTLED IN CODE AND WRITTEN NOWHERE, exactly as it is for a real quiz.
  // mergeGrades settles it again from the draw and the answer when the run is scored, so a
  // verdict here would be a second copy of a decision nothing reads, and a second copy is the
  // only way the two could ever disagree.
  //
  // It was written here once, and it broke scoring: mergeGrades marks a key used only on the
  // path that consumes a verdict, which multiple choice is not, so every mcq verdict came back
  // as "matches no answered item" and the run refused to score. The instructor's runner never
  // hit it because its verdicts file only ever holds the skill's rulings.
  const mcq = rows.filter((r) => r.item.type === "mcq");
  return { queue, mcq: mcq.length, date };
}

function score(dir) {
  const drawFile = readJson(join(dir, "draw.json"));
  const submissionsFile = readJson(join(dir, "submissions.json"));
  const verdictsPath = join(dir, "verdicts.jsonl");
  const verdicts = existsSync(verdictsPath)
    ? readFileSync(verdictsPath, "utf8").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l))
    : [];

  const rows = collectAnswers(drawFile, submissionsFile);
  const graded = mergeGrades(rows, verdicts, { date: drawFile.date, session: null });
  const me = graded.students[0];

  if (graded.problems.length) {
    console.error("NOT SCORED:");
    for (const p of graded.problems) console.error(`  ${p}`);
    process.exit(1);
  }

  // THE CAPABILITY CALL IS MADE ONCE PER GOAL AND APPLIED HERE, so that it cannot be made
  // twice and differently. The skill reads queue.json's `goals`, decides which of them are met
  // by doing rather than by writing, and writes kinds.json; this is where that answer reaches
  // every item on the goal, multiple choice included. Picking the right option out of four is
  // not evidence that anyone can commit and restore, and nothing in the grading path would
  // have said so: an mcq is settled in code and never reaches the skill at all.
  const kindsPath = join(dir, "kinds.json");
  const kinds = existsSync(kindsPath) ? readJson(kindsPath) : {};
  for (const i of me.items) {
    if (i.goal && kinds[i.goal] === "capability") i.axes = { ...i.axes, criterion: "unchecked" };
  }

  // EVERYTHING ONE record-attempt CALL NEEDS, ON ONE LINE EACH. The skill makes a call per
  // item, and every argument it takes is here: the topic to record in, the goal, the move and
  // its tag for the label, and the axes the verdict settled. Nothing left to derive means
  // nothing left to derive differently on a bad day.
  const byId = new Map(drawFile.draws[0].items.map((it) => [it.id, it]));

  // THE QUESTION AND WHAT THEY WROTE, because a mark on its own teaches nobody anything. The
  // report used to be "2. No credit" followed by a sentence about an answer the student could
  // no longer see: the page is closed by then, and nothing in front of them says which one
  // question 2 was. An mcq's answer is a stored index, so it is resolved back to the choice
  // they picked here rather than left as "2", which is a number about nothing.
  const written = new Map(
    (submissionsFile.submissions[0]?.answers ?? []).map((a) => [a.item_id, a.text]),
  );
  const said = (it) => {
    const raw = written.get(it?.id);
    if (raw === undefined || String(raw).trim() === "") return null;
    if (it.type !== "mcq") return raw;
    const n = Number(raw);
    return it.choices?.[n] ?? String(raw);
  };

  console.log(JSON.stringify({
    source: drawFile.practice,
    score: me.score,
    out_of: me.out_of,
    items: me.items.map((i) => {
      const it = byId.get(i.item);
      return {
        item: i.item,
        goal: i.goal,
        prompt: it?.prompt ?? null,
        answer: said(it),
        topic: it?.topic ?? null,
        move: it?.move ?? null,
        tags: it?.move ? MOVE_TAGS[it.move] ?? null : null,
        type: i.type,
        credit: i.credit,
        missed: i.missed,
        // THE CHOICES TRAVEL WITH AN MCQ ROW, because a report that names a choice the student
        // cannot see is no report. They have closed the page by the time they read this.
        choices: it?.choices ?? null,
        // The model answer, for going over a miss afterwards. Separate from the rubric on
        // purpose: the joined credit line reads as marking instructions, and this reads as an
        // answer, which is what the student is owed when they ask what they should have said.
        //
        // AN MCQ'S `expected` IS AN INDEX IN THE RUBRIC AND MUST NOT LEAVE HERE AS ONE. The
        // rubric stores the answer 1-based, for a person reading it beside the numbered list in
        // tasks/, so passing it through unresolved reports "the correct choice was option 1" to
        // someone holding no list. Resolved here, the same way quiz-comments.mjs resolves it.
        expected:
          it?.type === "mcq"
            ? it.choices?.[it.answer] ?? it.expected ?? null
            : it?.expected ?? null,
        axes: i.axes,
        flag: i.flag,
      };
    }),
  }, null, 2));
}

function listing() {
  const pools = listPools();
  if (!pools.length) {
    console.error("No published pools. Pull course-materials and try again.");
    process.exit(1);
  }
  for (const p of pools) {
    const take = Object.values(p.draw ?? {}).reduce((n, k) => n + k, 0);
    console.log(`  --session ${p.session}   the quiz of ${p.date}, ${take} questions   ${p.topic ?? ""}`.trimEnd());
  }
}

function main() {
  if (process.argv.includes("--list")) return listing();

  if (process.argv.includes("--score")) {
    const dir = process.argv[process.argv.indexOf("--score") + 1];
    if (!dir || !existsSync(join(dir, "draw.json"))) {
      console.error("Usage: node workflows/quiz/tools/quiz-practice.mjs --score <dir>");
      process.exit(1);
    }
    return score(dir);
  }

  const portAt = process.argv.indexOf("--port");
  const port = Number(portAt === -1 ? 5300 : process.argv[portAt + 1]);
  const sessionAt = process.argv.indexOf("--session");
  const session = sessionAt === -1 ? null : process.argv[sessionAt + 1];
  if (!session) {
    console.error("Usage: node workflows/quiz/tools/quiz-practice.mjs --session <n> [--port 5300]\n");
    console.error("Published pools:");
    listing();
    process.exit(1);
  }
  const pool = loadPool(session);
  if (!pool) {
    console.error(`No published pool for session ${session}. Published pools:`);
    listing();
    process.exit(1);
  }
  const source = `session ${pool.session}, the quiz of ${pool.date}`;

  const { items, strata, problems } = drawPractice(pool, ROOT, {
    seed: process.argv.includes("--seed") ? process.argv[process.argv.indexOf("--seed") + 1] : undefined,
  });
  if (problems.length) {
    console.error(`\nPROBLEMS in session ${session}'s pool:`);
    for (const p of problems) console.error(`  ${p}`);
  }
  if (!items.length) {
    console.error(`\nSession ${session}'s pool drew nothing.`);
    process.exit(1);
  }
  // SAID IN ONE LINE, BECAUSE ONE LINE IS WHAT GETS PASSED ON. The problems above name each
  // short stratum and are what a person debugging wants; this is the sentence the student has
  // to hear, and the skill quotes it into the message that hands over the URL.
  const asked = Object.values(pool.draw ?? {}).reduce((n, k) => n + k, 0);
  if (asked && items.length < asked) {
    console.error(
      `\nSHORT: this draw has ${items.length} questions, not the ${asked} this quiz asks for.`,
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const out = join(REPO, "tmp", `practice-${stamp}`);
  const html = page(items, source);

  const server = createServer(async (req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(html);
    }
    if (req.url === "/favicon.ico") {
      res.writeHead(204);
      return res.end();
    }
    if (req.url === "/submit" && req.method === "POST") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const { answers } = JSON.parse(raw || "{}");
        const { queue, mcq } = record(out, source, items, answers);
        res.writeHead(200, { "content-type": "application/json" });
        res.end('{"ok":true}');
        const free = queue.reduce((t, g) => t + g.answers.length, 0);
        console.log(`\nsubmitted: ${free} written answers to rule on, ${mcq} multiple choice settled in code`);
        console.log(`\n  ${out}\n`);
        console.log(`Rule each answer in queue.json against its rubric, following`);
        console.log(`workflows/quiz/skills/quiz/grade/SKILL.md, append the verdicts to`);
        console.log(`verdicts.jsonl, then:\n`);
        console.log(`  node workflows/quiz/tools/quiz-practice.mjs --score ${out}\n`);
        setTimeout(() => server.close(() => process.exit(0)), 250);
      });
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });

  // A PORT ALREADY IN USE IS THE ORDINARY SECOND RUN, not an exception. Without this the
  // process dies on an unhandled 'error' event and the stack trace is the only thing anyone
  // sees, which reads like the tool is broken rather than like a page is already open.
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use, probably by a practice quiz still waiting.`);
      console.error(`Finish that one at http://127.0.0.1:${port}, or start this one on another port:`);
      console.error(`\n  node workflows/quiz/tools/quiz-practice.mjs --session ${session} --port ${port + 1}\n`);
      process.exit(1);
    }
    // A SANDBOX REFUSING THE BIND IS THE OTHER ORDINARY CASE, and it came out as a raw Node
    // stack trace the first time a student's agent met it: EPERM on a listen, thrown from the
    // line above. The agent read this whole file trying to work out what it had done wrong,
    // and it had done nothing wrong. Nothing about the message said "ask for permission",
    // which is the entire fix and takes one retry.
    if (err.code === "EPERM" || err.code === "EACCES") {
      console.error(`Not allowed to open 127.0.0.1:${port}. That is the sandbox, not this tool.`);
      console.error(`The page is local only: nothing is served off this machine and no network`);
      console.error(`request leaves it. Re-run this same command with escalated permissions.\n`);
      process.exit(1);
    }
    throw err;
  });

  // 127.0.0.1 rather than every interface: these are your own answers, on your own machine.
  server.listen(port, "127.0.0.1", () => {
    console.log(`${source}: ${items.length} questions`);
    for (const s of strata) console.log(`  ${s.drawn} from ${s.name.split("/").pop()}`);
    console.log(`\n  http://127.0.0.1:${port}\n`);
    console.log(`Answer them there. This waits until you submit.`);
  });
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
