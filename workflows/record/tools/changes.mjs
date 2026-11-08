#!/usr/bin/env node
//
// Read, check and write a student's PS5 change record, ps5/CHANGES.md.
//
//   node workflows/record/tools/changes.mjs parse <repo>
//   node workflows/record/tools/changes.mjs check <repo>
//   node workflows/record/tools/changes.mjs attest <repo> <n> <noticed|why>
//   node workflows/record/tools/changes.mjs candidates <repo>
//   node workflows/record/tools/changes.mjs add-entry <repo> --title <t> --changed <c> --commit <h>
//        --prompted-by <p> --who-noticed <w> --who-chose <w> --what-changed <t>
//   node workflows/record/tools/changes.mjs take-reply <repo> <n> <noticed|why> [--transcript <path>]
//
// <repo> is the student's assignments repository. Results are JSON on stdout, except attest,
// which prints one line. On failure prints one line to stderr and exits 1, having written
// nothing. check exits 0 whether or not its items pass: failing items are its answer, not an
// error.
//
// THE SKILLS NEVER EDIT CHANGES.md THEMSELVES. Every write goes through here, so the format in
// lib/record.mjs is the only one that exists, and the student's own words are never retyped by
// an agent.

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { homedir } from "node:os";
import { parseRecord, qualifies, setAttestation, setPart, renderEntry, unixLines } from "./lib/record.mjs";
import { git, commitExists, filesAt, filesChanged, isAfter } from "./lib/git.mjs";
import { findSession, harnessFor } from "../../feedback/tools/export-session.mjs";
import { codexCandidates, readCodex } from "../../feedback/tools/lib/codex.mjs";
import { claudeCandidates, readClaude } from "../../feedback/tools/lib/claude.mjs";

const RECORD = "ps5/CHANGES.md";
const MIN_EXAMPLES = 10;
const MIN_ENTRIES = 2;

function requireRepo(repo) {
  try {
    git(repo, "rev-parse", "--git-dir");
  } catch {
    throw new Error(`${repo} is not a git repository.`);
  }
}

function readRecord(repo) {
  const path = join(repo, RECORD);
  return existsSync(path) ? unixLines(readFileSync(path, "utf8")) : null;
}

const subdirs = (dir) => (existsSync(dir) ? readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory()).sort() : []);

/** The record in `repo`, parsed. */
export function parse(repo) {
  requireRepo(repo);
  return parseRecord(readRecord(repo) ?? "");
}

/** Every item the grader looks for, in order, each with whether it passes and why. */
export function check(repo) {
  requireRepo(repo);
  const text = readRecord(repo);
  const r = parseRecord(text ?? "");
  const items = [];
  const add = (name, ok, detail) => items.push({ name, ok, detail });

  const h = r.initialDesign;
  const named = h !== null && commitExists(repo, h);
  add(
    "initial design named",
    named,
    text === null
      ? `${RECORD} does not exist.`
      : r.initialLine === "missing"
        ? 'CHANGES.md has no "Initial design:" line. Its first line after the heading should read "Initial design: <commit hash>".'
        : h === null
        ? "CHANGES.md does not name an initial design yet."
        : named
          ? `Initial design: ${h}.`
          : `"${h}" is not a commit in this repository.`
  );

  if (named) {
    const files = filesAt(repo, h, "ps5");
    const diagram = files.some((f) => f.endsWith(".bpmn"));
    const skill = files.some((f) => /^ps5\/skills\/[^/]+\/SKILL\.md$/.test(f));
    const missing = [!diagram && "a .bpmn diagram", !skill && "a skills/<name>/SKILL.md"].filter(Boolean);
    add("initial design has a diagram and a skill", !missing.length, missing.length ? `At ${h}, ps5/ has no ${missing.join(" and no ")}.` : `At ${h}, ps5/ has both.`);
  } else add("initial design has a diagram and a skill", false, "There is no initial design to look in.");

  const hasDiagram = existsSync(join(repo, "ps5/workflow.bpmn"));
  add("diagram", hasDiagram, hasDiagram ? "ps5/workflow.bpmn exists." : "There is no ps5/workflow.bpmn.");

  const skills = subdirs(join(repo, "ps5/skills")).filter((d) => existsSync(join(repo, "ps5/skills", d, "SKILL.md")));
  add("skills", skills.length > 0, skills.length ? `Skills: ${skills.join(", ")}.` : "There is no ps5/skills/<name>/SKILL.md.");

  const complete = [];
  const incomplete = [];
  for (const d of subdirs(join(repo, "ps5/examples"))) {
    const files = readdirSync(join(repo, "ps5/examples", d));
    const lacks = ["input", "output"].filter((k) => !files.some((f) => f.startsWith(`${k}.`)));
    if (lacks.length) incomplete.push(`${d} (no ${lacks.join(" or ")})`);
    else complete.push(d);
  }
  add(
    "examples",
    complete.length >= MIN_EXAMPLES,
    `${complete.length} complete example${complete.length === 1 ? "" : "s"}, of at least ${MIN_EXAMPLES}.` +
      (incomplete.length ? ` Incomplete: ${incomplete.join(", ")}.` : "")
  );

  const counted = r.entries.filter(qualifies);
  const problems = r.problems.map((p) => `line ${p.line}: ${p.message}`);
  for (const e of counted) problems.push(...commitProblems(repo, e, named ? h : null));
  add(
    "entries",
    counted.length >= MIN_ENTRIES && !problems.length,
    `${counted.length} qualifying entr${counted.length === 1 ? "y" : "ies"}, of at least ${MIN_ENTRIES}.` + (problems.length ? ` Problems: ${problems.join(" ")}` : "")
  );

  const empty = [];
  const unattested = [];
  for (const e of counted)
    for (const key of ["noticed", "why"]) {
      const p = e.parts[key];
      if (!p.text) empty.push(`entry ${e.n} has no ${key} part`);
      if (p.attestation !== "fresh") unattested.push(`entry ${e.n} ${key} is ${p.attestation}`);
    }
  add("own words", !empty.length, empty.length ? `${empty.join("; ")}.` : "Every qualifying entry has both parts.");
  add("attested", !unattested.length, unattested.length ? `${unattested.join("; ")}.` : "Every part is attested and unchanged since.");

  const pushed = pushState(repo);
  add("pushed", pushed === null, pushed ?? "Everything under ps5/ is committed and pushed.");

  return { ok: items.every((i) => i.ok), items };
}

/** What is wrong with entry `e`'s commit, as the grader checks it: it exists, comes after the
 *  initial design, and changed the diagram or the skill the entry names. */
function commitProblems(repo, e, initial) {
  const c = e.fields.commit;
  if (!c) return [];
  if (!commitExists(repo, c)) return [`entry ${e.n}: its commit, ${c}, is not a commit in this repository.`];
  const out = [];
  if (initial && !isAfter(repo, initial, c)) out.push(`entry ${e.n}: its commit, ${c}, does not come after the initial design.`);
  const changed = e.fields.changed;
  if (changed && !kindsOf(filesChanged(repo, c)).includes(changed))
    out.push(`entry ${e.n}: its commit, ${c}, does not change the ${changed === "diagram" ? "diagram" : `${changed.slice(6)} skill`}.`);
  return out;
}

/** Why the grader would not see this work yet, or null when it would.
 *
 *  GRADING READS WHAT IS ON GITHUB. Work that passes every other item but sits uncommitted, or
 *  committed and never pushed, is work the grader never sees. */
function pushState(repo) {
  const dirty = git(repo, "status", "--porcelain", "--", "ps5");
  if (dirty) return `${dirty.split("\n").length} file(s) under ps5/ are not committed yet. Commit them, then push.`;
  try {
    git(repo, "rev-parse", "--abbrev-ref", "@{u}");
  } catch {
    return "This branch has nowhere to push to yet. Push it with: git push -u origin main";
  }
  const ahead = Number(git(repo, "rev-list", "--count", "@{u}..HEAD"));
  return ahead ? `${ahead} commit${ahead === 1 ? " is" : "s are"} not pushed yet. Run: git push` : null;
}

/** What a commit changed that the record counts: the diagram, and each skill by name. */
function kindsOf(files) {
  const kinds = [];
  if (files.some((f) => /^ps5\/[^/]+\.bpmn$/.test(f))) kinds.push("diagram");
  for (const f of files) {
    const m = /^ps5\/skills\/([^/]+)\/SKILL\.md$/.exec(f);
    if (m && !kinds.includes(`skill ${m[1]}`)) kinds.push(`skill ${m[1]}`);
  }
  return kinds;
}

/** Commits since the initial design that changed the diagram or a skill, oldest first.
 *
 *  A COMMIT CAN CHANGE A SKILL AND A PROGRAM TOGETHER, and only the skill counts. Every file it
 *  touched under ps5/ is listed, so the skill asking about it can say which part is in question. */
export function candidates(repo) {
  requireRepo(repo);
  const r = parseRecord(readRecord(repo) ?? "");
  const since = r.initialDesign;
  if (since === null) throw new Error("CHANGES.md does not name an initial design yet.");
  if (!commitExists(repo, since)) throw new Error(`"${since}" is not a commit in this repository.`);
  const recorded = r.entries.map((e) => e.fields.commit).filter(Boolean);
  const log = git(repo, "log", "--reverse", "--name-only", "--format=%x1e%H%x1f%cs%x1f%s", `${since}..HEAD`, "--", "ps5");
  const commits = [];
  for (const chunk of log.split("\x1e").slice(1)) {
    const [head, ...rest] = chunk.split("\n");
    const [hash, date, subject] = head.split("\x1f");
    const files = rest.map((l) => l.trim()).filter(Boolean);
    const kinds = kindsOf(files);
    if (!kinds.length) continue;
    const inRecord = recorded.some((c) => hash.startsWith(c) || c.startsWith(hash));
    commits.push({ hash, date, subject, files, kinds, inRecord });
  }
  return { since, commits };
}

/** Append an entry with both own-words parts empty. Returns its number.
 *
 *  THE TABLE'S LAST ROW IS REFUSED HERE, not only in the skill. A change the agent noticed and
 *  the agent fixed never reaches the file, whatever the agent running the skill decides. */
export function addEntry(repo, { title, changed, commit, promptedBy, whoNoticed, whoChose, whatChanged }) {
  requireRepo(repo);
  const text = readRecord(repo);
  if (text === null) throw new Error(`${RECORD} does not exist.`);
  if (whoNoticed === "the agent" && whoChose === "the agent")
    throw new Error("That change was noticed and fixed by the agent, so it does not go in the record.");
  if (promptedBy === "design critique" && whoChose !== "me")
    throw new Error("A change prompted by design critique goes in the record only when you chose the fix.");
  const before = parseRecord(text);
  const n = Math.max(0, ...before.entries.map((e) => e.n)) + 1;
  const fields = { changed, commit, promptedBy, whoNoticed, whoChose, whatChanged };
  const next = text.replace(/\n*$/, "\n\n") + renderEntry(n, { title: title ?? "", fields, parts: { noticed: "", why: "" } });
  const added = parseRecord(next).problems.filter((p) => !before.problems.some((q) => q.message === p.message));
  if (added.length) throw new Error(added[0].message);
  writeFileSync(join(repo, RECORD), next);
  return n;
}

const READERS = { Codex: readCodex, "Claude Code": readClaude };

/** Copy the student's most recent message, exactly, into entry `n`'s `key` part.
 *
 *  THE WORDS COME FROM THE TRANSCRIPT, never from the agent. Passed on a command line they would
 *  be retyped by the agent and mangled by the shell; read from the session they are what the
 *  student typed. The session is found as export-session finds it, and refuses as it does. */
export function takeReply(repo, n, key, { transcript, home = homedir(), now = new Date() } = {}) {
  requireRepo(repo);
  if (!["noticed", "why"].includes(key)) throw new Error(`The part must be noticed or why, not "${key}".`);
  const text = readRecord(repo);
  if (text === null) throw new Error(`${RECORD} does not exist.`);
  const session = transcript
    ? { path: transcript, harness: harnessFor(transcript) }
    : findSession([...codexCandidates(home), ...claudeCandidates(home)], now.getTime());
  const words = studentAnswer(READERS[session.harness](session.path));
  const next = setPart(text, Number(n), key, words);
  writeFileSync(join(repo, RECORD), next);
  const part = parseRecord(next).entries.find((e) => e.n === Number(n)).parts[key].text;
  return `recorded your words in entry ${n}, ${key}:\n\n${part}`;
}

/** The student's last message, if it answers a question that asked for their own words.
 *
 *  IT MUST ANSWER THAT QUESTION, OR NOTHING IS COPIED. The last message the reader returns is not
 *  always the reply: a message with an image in it is not typed text and is skipped, which would
 *  leave an older answer, to a different question, as the last one. So the agent's last words
 *  before it must be one of the skills' own-words questions, all of which say "own words".
 *
 *  A REPLY THROUGH CODEX'S QUESTION TOOL ARRIVES WRAPPED, as JSON inside a tag, and Claude Code
 *  marks a picked option as `[answered: ...]`. The student's words are the answer inside. */
function studentAnswer(entries) {
  const at = entries.findLastIndex((e) => e.role === "student");
  if (at < 0) throw new Error("There is no message from you in this session to copy.");
  const asked = entries.slice(0, at).findLast((e) => e.role === "agent" && e.text.trim());
  if (!asked || !/own words/i.test(asked.text))
    throw new Error("Your last message doesn't answer a question asking for your own words, so nothing was copied. Ask the question again.");
  let words = entries[at].text;
  const wrapped = /^\s*<send_user_message_question_reply>([\s\S]*)<\/send_user_message_question_reply>\s*$/.exec(words);
  if (wrapped) {
    try {
      words = JSON.parse(wrapped[1]).map((a) => a.answer ?? "").join("\n\n");
    } catch {
      throw new Error("Your answer came through the question tool in a form I can't read. Ask the question again as a plain message.");
    }
  }
  words = words.replace(/^\s*\[answered: ([\s\S]*)\]\s*$/, "$1");
  if (!words.trim()) throw new Error("Your last message is empty, so nothing was copied.");
  return words;
}

const pad = (n) => String(n).padStart(2, "0");
const today = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Attest entry `n`'s `key` part as of `date`. Returns the line to print. */
export function attest(repo, n, key, date = today()) {
  requireRepo(repo);
  if (!["noticed", "why"].includes(key)) throw new Error(`The part must be noticed or why, not "${key}".`);
  const text = readRecord(repo);
  if (text === null) throw new Error(`${RECORD} does not exist.`);
  writeFileSync(join(repo, RECORD), setAttestation(text, Number(n), key, date));
  return `attested entry ${n}, ${key}`;
}

const COMMANDS = {
  parse: (repo) => JSON.stringify(parse(repo), null, 2),
  check: (repo) => JSON.stringify(check(repo), null, 2),
  attest: (repo, n, key) => attest(repo, n, key),
  candidates: (repo) => JSON.stringify(candidates(repo), null, 2),
  "add-entry": (repo, ...rest) => String(addEntry(repo, flags(rest, ENTRY_FLAGS))),
  "take-reply": (repo, n, key, ...rest) => takeReply(repo, n, key, flags(rest, { transcript: "transcript" })),
};

const ENTRY_FLAGS = {
  title: "title",
  changed: "changed",
  commit: "commit",
  "prompted-by": "promptedBy",
  "who-noticed": "whoNoticed",
  "who-chose": "whoChose",
  "what-changed": "whatChanged",
};

function flags(argv, known) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const key = known[argv[i].replace(/^--/, "")];
    if (!argv[i].startsWith("--") || !key) throw new Error(`Unknown option: ${argv[i]}`);
    out[key] = argv[++i] ?? "";
  }
  return out;
}

export function main(argv) {
  const [cmd, repo, ...rest] = argv;
  const run = COMMANDS[cmd];
  if (!run) throw new Error(`Unknown command "${cmd ?? ""}". Use one of: ${Object.keys(COMMANDS).join(", ")}.`);
  if (!repo) throw new Error(`${cmd} needs the path of your assignments repository.`);
  return run(repo, ...rest);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(main(process.argv.slice(2)));
  } catch (e) {
    console.error(e.message.split("\n")[0]);
    process.exit(1);
  }
}
