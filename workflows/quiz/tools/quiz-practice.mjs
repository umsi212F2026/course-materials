#!/usr/bin/env node
//
// Sit a practice quiz on a page, then score it once an agent has ruled the written answers.
//
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

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drawPractice, loadPool } from "./quiz-draw.mjs";
import { collectAnswers, settleMcq, buildQueue, mergeGrades, CREDIT_VALUE } from "./lib/grade.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "..", "..", "..");
const ROOT = process.env.SOURCES_ROOT ?? resolve(REPO, "..");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** The page. Every item on one screen, answered cold, submitted once. */
function page(items, source) {
  const body = items
    .map((it, i) => {
      const field =
        it.type === "mcq"
          ? `<ol class=choices>${(it.choices ?? [])
              .map(
                (c, j) =>
                  `<li><label><input type=radio name="${esc(it.id)}" value="${j}"> ${esc(c)}</label></li>`,
              )
              .join("")}</ol>`
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
 ol.choices{margin:0;padding-left:26px} ol.choices li{padding:3px 0}
 ol.choices label{cursor:pointer}
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
  them with you. You can close this tab.</div>
</main>
<script>
 document.getElementById("f").onsubmit = async (e) => {
   e.preventDefault();
   const answers = {};
   for (const [k, v] of new FormData(e.target)) answers[k] = v;
   await fetch("/submit", { method: "POST", headers: { "content-type": "application/json" },
                            body: JSON.stringify({ answers }) });
   e.target.style.display = "none";
   document.getElementById("done").style.display = "block";
 };
</script>`;
}

/** Write the draw, the answers, the settled multiple choice and the work left for the agent,
 *  all in the shapes the real quiz uses. */
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
  const queue = buildQueue(rows);
  writeFileSync(join(dir, "queue.json"), JSON.stringify({ date, items: queue }, null, 2) + "\n");

  // Multiple choice is settled here, in code, exactly as it is for a real quiz. It never
  // reaches the skill, which is why it costs nothing and can never disagree with itself.
  const mcq = rows.filter((r) => r.item.type === "mcq");
  for (const r of mcq) {
    appendFileSync(
      join(dir, "verdicts.jsonl"),
      JSON.stringify({
        item: r.item.id,
        uniqname: "me",
        credit: settleMcq(r.item, r.text),
        missed: "",
        flag: false,
        flag_reason: "",
        at: now,
      }) + "\n",
    );
  }
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

  const byId = new Map(drawFile.draws[0].items.map((it) => [it.id, it]));
  console.log(JSON.stringify({
    source: drawFile.practice,
    score: me.score,
    out_of: me.out_of,
    items: me.items.map((i) => ({
      item: i.item,
      goal: i.goal,
      move: byId.get(i.item)?.move ?? null,
      type: i.type,
      credit: i.credit,
      missed: i.missed,
      flag: i.flag,
    })),
  }, null, 2));
}

function main() {
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
    console.error("Usage: node workflows/quiz/tools/quiz-practice.mjs --session <n> [--port 5300]");
    process.exit(1);
  }
  const pool = loadPool(session);
  if (!pool) {
    console.error(`No published pool for session ${session}.`);
    process.exit(1);
  }
  const source = `session ${pool.session}, the quiz of ${pool.date}`;

  const { items, strata, problems } = drawPractice(pool, ROOT, {
    seed: process.argv.includes("--seed") ? process.argv[process.argv.indexOf("--seed") + 1] : undefined,
  });
  for (const p of problems) console.error(`  ${p}`);
  if (!items.length) {
    console.error(`\nSession ${session}'s pool drew nothing.`);
    process.exit(1);
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

  // 127.0.0.1 rather than every interface: these are your own answers, on your own machine.
  server.listen(port, "127.0.0.1", () => {
    console.log(`${source}: ${items.length} questions`);
    for (const s of strata) console.log(`  ${s.drawn} from ${s.name.split("/").pop()}`);
    console.log(`\n  http://127.0.0.1:${port}\n`);
    console.log(`Answer them there. This waits until you submit.`);
  });
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
