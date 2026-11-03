#!/usr/bin/env node
//
// Save the session you are in as a Markdown file to upload to Canvas for coaching on your
// prompting.
//
//   node workflows/feedback/tools/export-session.mjs
//   node workflows/feedback/tools/export-session.mjs --transcript <path> --out <dir> --question <text>
//
// Prints the path of the file it wrote. On failure prints one line to stderr and exits 1,
// having written nothing.
//
// THE NEWEST TRANSCRIPT IS THE RUNNING ONE. Codex and Claude Code both append to the session's
// file as it goes, and the student's last message was written seconds before this ran, so
// across both stores the session asking for the export is the most recently modified file.
// Working directory is no help: Codex records the folder the session started in, and this runs
// from inside course-materials, which is another folder.
//
// IT WILL NOT GUESS. Nothing written in the last 2 minutes, or two sessions written within 10
// seconds of each other, and it stops and says so. `--transcript` names the file outright.
//
// THE LAST TWO TURNS ARE THE REQUEST TO SUBMIT, and the student's answer to what they would
// like feedback on. They are dropped by position because the request is worded however the
// student likes; there is nothing to match.

import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { codexCandidates, readCodex } from "./lib/codex.mjs";
import { claudeCandidates, readClaude } from "./lib/claude.mjs";
import { redact } from "./lib/redact.mjs";

const FRESH_MS = 120_000;
const AMBIGUOUS_MS = 10_000;
const SUBMIT_TURNS = 2;

const READERS = { Codex: readCodex, "Claude Code": readClaude };

/** The running session among `candidates`, or an Error whose message is the line to print. */
export function findSession(candidates, nowMs) {
  const fresh = candidates.filter((c) => nowMs - c.mtimeMs <= FRESH_MS).sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!fresh.length) throw new Error("No session transcript was written in the last 2 minutes.");
  const [newest, next] = fresh;
  if (next && newest.mtimeMs - next.mtimeMs <= AMBIGUOUS_MS)
    throw new Error(`Two sessions are active: ${newest.path} and ${next.path}. Rerun with --transcript <path>.`);
  return { path: newest.path, harness: newest.harness };
}

/** Entries grouped into numbered turns, each opened by a student entry, less the last `drop`. */
export function toTurns(entries, drop = SUBMIT_TURNS) {
  const turns = [];
  for (const e of entries) {
    if (e.role === "student") turns.push({ n: turns.length + 1, student: [e.text], agent: [] });
    else if (turns.length) turns.at(-1).agent.push(e.text);
  }
  return turns.slice(0, Math.max(0, turns.length - drop));
}

const pad = (n) => String(n).padStart(2, "0");
const day = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const block = (texts) => texts.map((t) => t.trim()).filter(Boolean).join("\n\n");

/** The whole file. */
export function render({ when, harness, question, turns, redactions }) {
  const q = (question ?? "").trim();
  const lines = [
    "# SI 212 session for feedback",
    "",
    `- Date: ${day(when)} ${pad(when.getHours())}:${pad(when.getMinutes())}`,
    `- Harness: ${harness}`,
    `- Turns: ${turns.length}`,
    `- Redactions: ${redactions}`,
    "",
    "## What I'd like feedback on",
    "",
    !q || q.toLowerCase() === "skip" ? "Nothing specific." : q,
    "",
    "## Transcript",
  ];
  for (const t of turns) {
    lines.push("", `### Turn ${t.n} (you)`, "", block(t.student));
    const agent = block(t.agent);
    if (agent) lines.push("", `### Turn ${t.n} (agent)`, "", agent);
  }
  return lines.join("\n") + "\n";
}

/** Which harness wrote the transcript at `path`, from where it lives. */
export const harnessFor = (path) => (/[\\/]\.codex[\\/]/.test(path) ? "Codex" : "Claude Code");

/** Find, read, redact and write. Returns the path written.
 *
 *  THE QUESTION IS READ FROM THE TRANSCRIPT unless one is passed. The student's answer to what
 *  they would like feedback on is their last message, and taking it from there keeps it exact:
 *  passed on a command line, a `$` or a backtick in it would be eaten by the shell. */
export function exportSession({ home = homedir(), now = new Date(), question, out, transcript }) {
  const session = transcript
    ? { path: transcript, harness: harnessFor(transcript) }
    : findSession([...codexCandidates(home), ...claudeCandidates(home)], now.getTime());
  const entries = READERS[session.harness](session.path);
  question ??= entries.findLast((e) => e.role === "student")?.text ?? "";
  let redactions = 0;
  const clean = (text) => {
    const r = redact(text, home);
    redactions += r.count;
    return r.text;
  };
  const turns = toTurns(entries).map((t) => ({
    n: t.n,
    student: t.student.map(clean),
    agent: t.agent.map(clean),
  }));
  const dir = out ?? join(home, "Downloads");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `si212-session-${day(now)}-${pad(now.getHours())}${pad(now.getMinutes())}.md`);
  writeFileSync(path, render({ when: now, harness: session.harness, question: clean(question), turns, redactions }));
  return path;
}

function args(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i].replace(/^--/, "");
    if (!["question", "out", "transcript"].includes(flag)) throw new Error(`Unknown option: ${argv[i]}`);
    opts[flag] = argv[++i] ?? "";
  }
  return opts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(exportSession(args(process.argv.slice(2))));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
