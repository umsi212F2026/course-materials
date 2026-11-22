#!/usr/bin/env node
//
// Read, check and write a student's record of two rounds, ROUNDS.md in the project folder.
//
//   node workflows/rounds/tools/rounds.mjs parse <dir>
//   node workflows/rounds/tools/rounds.mjs candidates <dir>
//   node workflows/rounds/tools/rounds.mjs add-round <dir> --title <t> --spec <path> --plan <path> --commits <x..y>
//   node workflows/rounds/tools/rounds.mjs take-reply <dir> <n> <new|why> [--transcript <path>]
//   node workflows/rounds/tools/rounds.mjs attest <dir> <n> <new|why>
//   node workflows/rounds/tools/rounds.mjs check <dir> --assignments <repo> [--online]
//
// <dir> is the project folder: a repository, or a folder inside one. Results are JSON on stdout,
// except add-round (the new number), take-reply and attest, which print text. On failure prints
// one line to stderr and exits 1, having written nothing. check exits 0 whether or not its items
// pass: failing items are its answer, not an error.
//
// THE SKILLS NEVER EDIT ROUNDS.md THEMSELVES. Every write goes through here, so the format in
// lib/rounds.mjs is the only one that exists, and the student's own words are never retyped by
// an agent.
//
// EVERY GIT QUESTION IS ASKED FROM <dir> AND LIMITED TO IT. The project may sit beside ps1 to ps5
// in one repository, so a plan or a commit elsewhere in it is not this project's. Paths in
// ROUNDS.md are relative to <dir>.

import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, posix, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { homedir } from "node:os";
import { unixLines } from "../../record/tools/lib/record.mjs";
import { git, commitExists, isAfter, pushState } from "../../record/tools/lib/git.mjs";
import { findSession, harnessFor } from "../../feedback/tools/export-session.mjs";
import { codexCandidates, readCodex } from "../../feedback/tools/lib/codex.mjs";
import { claudeCandidates, readClaude } from "../../feedback/tools/lib/claude.mjs";
import { parseRounds, renderRound, setRoundPart, setRoundAttestation, splitCommits } from "./lib/rounds.mjs";
import { studentAnswer } from "./lib/reply.mjs";
import { readSubmit, SUBMIT } from "./lib/submit.mjs";

const RECORD = "ROUNDS.md";
const PLANS = "docs/superpowers/plans";
const SPECS = "docs/superpowers/specs";
const KEYS = ["new", "why"];

function requireDir(dir) {
  try {
    if (!statSync(dir).isDirectory()) throw new Error();
    git(dir, "rev-parse", "--git-dir");
  } catch {
    throw new Error(`${dir} is not a folder in a git repository.`);
  }
}

function readRecord(dir) {
  const path = join(dir, RECORD);
  return existsSync(path) ? unixLines(readFileSync(path, "utf8")) : null;
}

function requireRecord(dir) {
  requireDir(dir);
  const text = readRecord(dir);
  if (text === null) throw new Error(`${RECORD} does not exist.`);
  return text;
}

function requireKey(key) {
  if (!KEYS.includes(key)) throw new Error(`The part must be new or why, not "${key}".`);
}

const short = (h) => h.slice(0, 7);

/** The commit that first added `file` within `dir`, as { hash, date }, or null. */
function addedIn(dir, file) {
  const out = git(dir, "log", "--diff-filter=A", "--format=%H%x1f%cs", "--", file);
  const last = out.split("\n").filter(Boolean).pop();
  if (!last) return null;
  const [hash, date] = last.split("\x1f");
  return { hash, date };
}

/** Whether `file`, a path inside `dir`, exists at HEAD. */
function existsAtHead(dir, file) {
  try {
    git(dir, "cat-file", "-e", `HEAD:./${file}`);
    return true;
  } catch {
    return false;
  }
}

const insideDir = (file) => {
  const n = posix.normalize(file);
  return !isAbsolute(n) && n !== ".." && !n.startsWith("../");
};

/** Why round `r` fails the rules, as sentences; empty when it passes. `base` is the Base hash or
 *  null. Duplicates are the caller's business, since they need every round. */
function reasonsFor(dir, r, base) {
  const out = [];
  const baseOk = base !== null && commitExists(dir, base);
  if (base === null) out.push("ROUNDS.md has no usable Base: line.");
  else if (!baseOk) out.push(`The Base, ${base}, is not a commit in this repository.`);

  const added = {};
  for (const [key, label] of [["spec", "spec"], ["plan", "plan"]]) {
    const file = r.fields[key];
    if (!file) {
      out.push(`Round ${r.n} names no ${label}.`);
      continue;
    }
    if (!insideDir(file)) {
      out.push(`The ${label}, ${file}, is outside the project folder.`);
      continue;
    }
    if (!existsAtHead(dir, file)) {
      out.push(`The ${label}, ${file}, does not exist at HEAD.`);
      continue;
    }
    added[key] = addedIn(dir, file);
    if (baseOk && added[key] && !isAfter(dir, base, added[key].hash))
      out.push(`The ${label}, ${file}, is not after the base: it was first added in ${short(added[key].hash)}.`);
  }

  const c = r.fields.commits ? splitCommits(r.fields.commits) : null;
  if (!c) {
    out.push(`The commits, "${r.fields.commits ?? ""}", are not a hash or a first..last range of hashes.`);
    return out;
  }
  const missing = [c.first, c.last].filter((h, i, a) => a.indexOf(h) === i && !commitExists(dir, h));
  for (const h of missing) out.push(`${h} is not a commit in this repository.`);
  if (missing.length) return out;
  if (added.plan && !isAfter(dir, added.plan.hash, c.first))
    out.push(`The first implementing commit, ${c.first}, does not come after the plan's commit, ${short(added.plan.hash)}.`);
  if (git(dir, "rev-parse", `${c.first}^{commit}`) !== git(dir, "rev-parse", `${c.last}^{commit}`) && !isAfter(dir, c.first, c.last))
    out.push(`The last implementing commit, ${c.last}, is not the first, ${c.first}, or after it.`);
  if (!isAncestorOfHead(dir, c.last)) out.push(`The last implementing commit, ${c.last}, is not an ancestor of HEAD.`);
  return out;
}

function isAncestorOfHead(dir, hash) {
  try {
    git(dir, "merge-base", "--is-ancestor", hash, "HEAD");
    return true;
  } catch {
    return false;
  }
}

function judge(dir, parsed) {
  const planCount = {};
  for (const r of parsed.rounds) if (r.fields.plan) planCount[r.fields.plan] = (planCount[r.fields.plan] ?? 0) + 1;
  const numCount = {};
  for (const r of parsed.rounds) numCount[r.n] = (numCount[r.n] ?? 0) + 1;
  return parsed.rounds.map((r) => {
    const reasons = reasonsFor(dir, r, parsed.base);
    if (numCount[r.n] > 1) reasons.push(`There is more than one round ${r.n}.`);
    if (r.fields.plan && planCount[r.fields.plan] > 1) reasons.push(`Another round names the same plan, ${r.fields.plan}.`);
    return { ...r, valid: reasons.length === 0, reasons };
  });
}

/** The record in `dir`, parsed, with whether each round passes the rules and why not. */
export function parse(dir) {
  requireDir(dir);
  const p = parseRounds(readRecord(dir) ?? "");
  return { ...p, rounds: judge(dir, p) };
}

/** Every plan under dir first added after the Base, oldest first, with what the record needs to
 *  name its round: its spec, and the commits that look like its implementation.
 *
 *  A PLAN ELSEWHERE IN THE REPOSITORY IS NOT LISTED. The listing and the history are both limited
 *  to dir, so a plan under ps5/ never appears for a project folder beside it. */
export function candidates(dir) {
  requireDir(dir);
  const r = parseRounds(readRecord(dir) ?? "");
  if (r.base === null) throw new Error("ROUNDS.md has no Base: line with a commit hash yet.");
  if (!commitExists(dir, r.base)) throw new Error(`The Base, ${r.base}, is not a commit in this repository.`);
  const recorded = r.rounds.map((x) => x.fields.plan);

  const listing = (d) => {
    const out = git(dir, "ls-tree", "-r", "--name-only", "HEAD", "--", d);
    return out ? out.split("\n").filter((f) => f.endsWith(".md")) : [];
  };
  const specs = listing(SPECS);
  const plans = listing(PLANS)
    .map((plan) => ({ plan, added: addedIn(dir, plan) }))
    .filter((p) => p.added && isAfter(dir, r.base, p.added.hash));

  // Commits after the base, oldest first, each with the files it touched under dir.
  const log = git(dir, "log", "--reverse", "--relative", "--name-only", "--format=%x1e%H", `${r.base}..HEAD`, "--", ".");
  const commits = log
    .split("\x1e")
    .slice(1)
    .map((chunk) => {
      const [hash, ...files] = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
      return { hash, files };
    });
  const at = (hash) => commits.findIndex((c) => c.hash === hash);
  plans.sort((a, b) => at(a.added.hash) - at(b.added.hash));

  return {
    base: r.base,
    plans: plans.map((p, i) => {
      const stem = posix.basename(p.plan, ".md");
      const spec = specs.find((s) => posix.basename(s, ".md").replace(/-design$/, "") === stem) ?? null;
      const from = at(p.added.hash) + 1;
      const next = plans[i + 1];
      const to = next ? at(next.added.hash) : commits.length;
      const window = commits.slice(from, to);
      const first = window.find((c) => c.files.some((f) => !f.startsWith("docs/")));
      const suggestedCommits = first ? `${short(first.hash)}..${short(window[window.length - 1].hash)}` : null;
      return { plan: p.plan, spec, addedIn: p.added.hash, date: p.added.date, recorded: recorded.includes(p.plan), suggestedCommits };
    }),
  };
}

/** Append a round with both own-words parts empty. Returns its number.
 *
 *  THE RULES ARE ENFORCED HERE, not only in the skill, so a round that would fail the check is
 *  never written. Nothing is written when any of them fails. */
export function addRound(dir, { title, spec, plan, commits }) {
  const text = requireRecord(dir);
  const before = parseRounds(text);
  if (before.base === null) throw new Error("ROUNDS.md has no Base: line with a commit hash yet.");
  if (before.rounds.some((r) => r.fields.plan === plan)) throw new Error(`The plan ${plan} is already recorded as a round.`);
  const n = Math.max(0, ...before.rounds.map((r) => r.n)) + 1;
  const fields = { spec, plan, commits };
  const probe = { n, title: title ?? "", fields };
  const reasons = reasonsFor(dir, probe, before.base);
  if (reasons.length) throw new Error(reasons[0]);
  const next = text.replace(/\n*$/, "\n\n") + renderRound(n, { title: title ?? "", fields, parts: { new: "", why: "" } });
  const added = parseRounds(next).problems.filter((p) => !before.problems.some((q) => q.message === p.message));
  if (added.length) throw new Error(added[0].message);
  writeFileSync(join(dir, RECORD), next);
  return n;
}

const READERS = { Codex: readCodex, "Claude Code": readClaude };

/** Copy the student's most recent message, exactly, into round `n`'s `key` part.
 *
 *  THE WORDS COME FROM THE TRANSCRIPT, never from the agent. Passed on a command line they would
 *  be retyped by the agent and mangled by the shell; read from the session they are what the
 *  student typed. The session is found as export-session finds it, and refuses as it does. */
export function takeReply(dir, n, key, { transcript, home = homedir(), now = new Date() } = {}) {
  requireDir(dir);
  requireKey(key);
  const text = requireRecord(dir);
  const session = transcript
    ? { path: transcript, harness: harnessFor(transcript) }
    : findSession([...codexCandidates(home), ...claudeCandidates(home)], now.getTime());
  const words = studentAnswer(READERS[session.harness](session.path));
  const next = setRoundPart(text, Number(n), key, words);
  writeFileSync(join(dir, RECORD), next);
  const part = parseRounds(next).rounds.find((r) => r.n === Number(n)).parts[key].text;
  return `recorded your words in round ${n}, ${key}:\n\n${part}`;
}

const pad = (n) => String(n).padStart(2, "0");
const today = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Attest round `n`'s `key` part as of `date`. Returns the line to print. */
export function attest(dir, n, key, date = today()) {
  requireKey(key);
  const text = requireRecord(dir);
  writeFileSync(join(dir, RECORD), setRoundAttestation(text, Number(n), key, date));
  return `attested round ${n}, ${key}`;
}

const MIN_EXAMPLES = 10;
const TERMS = "project/TERMS.md";

/** The `examples/<id>/` folders at `hash` that hold both an input.* and an output.*, and the ids
 *  of those that hold only one, for files under `dir`. */
function examplesAt(dir, hash) {
  const files = git(dir, "ls-tree", "-r", "--name-only", hash, "--", ".").split("\n").filter(Boolean);
  const byId = {};
  for (const f of files) {
    const m = /^examples\/([^/]+)\/([^/]+)$/.exec(f);
    if (m) (byId[m[1]] ??= []).push(m[2]);
  }
  const complete = [];
  const incomplete = [];
  for (const [id, names] of Object.entries(byId)) {
    const both = ["input", "output"].every((k) => names.some((n) => n.startsWith(`${k}.`)));
    (both ? complete : incomplete).push(id);
  }
  return { files, complete, incomplete };
}

/** Every item the grader looks for that can be asked offline, in order, each with whether it passes
 *  and why. `assignments` is the root of the student's assignments repository. The online items
 *  come with `online`, once they exist. */
export function check(dir, { assignments, online = false, fetch } = {}) {
  requireDir(dir);
  const items = [];
  const add = (name, ok, detail) => items.push({ name, ok, detail });
  const submit = readSubmit(assignments);

  if (submit.kind === "negotiated") {
    const has = assignments && existsSync(join(assignments, TERMS));
    add("TERMS.md", Boolean(has), has ? `${TERMS} exists.` : `There is no ${TERMS}. A negotiated project commits the agreed terms there.`);
  } else roundsItems(dir, submit, add);

  const problems = [...submit.problems];
  if (submit.kind !== null && submit.work === "project/" && submit.kind === "workflow")
    problems.push("Work: project/ is only for a deployed project. A workflow lives in a public repository, so give its URL.");
  add("SUBMIT.md", !problems.length, problems.length ? problems.join(" ") : `${SUBMIT} is filled in.`);

  let pushed = `There is no assignments repository to look in. Pass --assignments <repo>.`;
  if (assignments) {
    try {
      pushed = pushState(assignments, "project", { limitAhead: true });
    } catch {
      pushed = `${assignments} is not a git repository.`;
    }
  }
  add("assignments pushed", pushed === null, pushed ?? "Everything under project/ in your assignments repository is committed and pushed.");

  return { ok: items.every((i) => i.ok), items };
}

function roundsItems(dir, submit, add) {
  const text = readRecord(dir);
  const p = parse(dir);
  const baseOk = p.base !== null && commitExists(dir, p.base);
  add(
    "base named",
    baseOk,
    text === null
      ? `${RECORD} does not exist.`
      : p.base === null
        ? "ROUNDS.md has no Base: line with a commit hash yet."
        : baseOk
          ? `Base: ${p.base}.`
          : `"${p.base}" is not a commit in this repository.`,
  );

  if (submit.kind === "deployed") add("base in place", true, "checked live");
  else if (!baseOk) add("base in place", false, "There is no base to look in.");
  else {
    const { files, complete, incomplete } = examplesAt(dir, p.base);
    const diagram = files.some((f) => f.endsWith(".bpmn"));
    const skill = files.some((f) => /^skills\/[^/]+\/SKILL\.md$/.test(f));
    const lacks = [!diagram && "a .bpmn diagram", !skill && "a skills/<name>/SKILL.md", complete.length < MIN_EXAMPLES && `at least ${MIN_EXAMPLES} processed inputs`].filter(Boolean);
    add(
      "base in place",
      !lacks.length,
      `At ${p.base}: ${complete.length} processed input${complete.length === 1 ? "" : "s"}, of at least ${MIN_EXAMPLES}.` +
        (incomplete.length ? ` Incomplete: ${incomplete.join(", ")}.` : "") +
        (lacks.length ? ` Missing: ${lacks.join(", ")}.` : ""),
    );
  }

  const valid = p.rounds.filter((r) => r.valid);
  const invalid = p.rounds.filter((r) => !r.valid).map((r) => `round ${r.n}: ${r.reasons[0]}`);
  add("two rounds", valid.length >= 2, `${valid.length} valid round${valid.length === 1 ? "" : "s"}, of at least 2.` + (invalid.length ? ` Problems: ${invalid.join(" ")}` : ""));

  const empty = [];
  const unattested = [];
  for (const r of valid)
    for (const key of ["new", "why"]) {
      const part = r.parts[key];
      if (!part.text) empty.push(`round ${r.n} has no ${key} part`);
      if (part.attestation !== "fresh") unattested.push(`round ${r.n} ${key} is ${part.attestation}`);
    }
  add("own words", !empty.length, empty.length ? `${empty.join("; ")}.` : "Every valid round has both parts.");
  add("attested", !unattested.length, unattested.length ? `${unattested.join("; ")}.` : "Every part is attested and unchanged since.");

  const state = pushState(dir, ".", { limitAhead: true });
  add("project pushed", state === null, state ?? "Everything in the project folder is committed and pushed.");

  if (submit.kind !== "deployed") add("README", true, "Not required for a workflow.");
  else if (!existsSync(join(dir, "README.md"))) add("README", false, "There is no README.md in the project folder.");
  else {
    const readme = readFileSync(join(dir, "README.md"), "utf8").toLowerCase();
    const unfound = valid.map((r) => r.title).filter((t) => !readme.includes(t.toLowerCase()));
    add("README", true, unfound.length ? `Warning: README.md does not mention ${unfound.map((t) => `"${t}"`).join(", ")}.` : "README.md mentions every round.");
  }
}

const ROUND_FLAGS = { title: "title", spec: "spec", plan: "plan", commits: "commits" };

const COMMANDS = {
  parse: (dir) => JSON.stringify(parse(dir), null, 2),
  candidates: (dir) => JSON.stringify(candidates(dir), null, 2),
  attest: (dir, n, key) => attest(dir, n, key),
  "add-round": (dir, ...rest) => String(addRound(dir, flags(rest, ROUND_FLAGS))),
  check: (dir, ...rest) => {
    const { assignments, online } = flags(rest, { assignments: "assignments", online: "online" }, ["online"]);
    return JSON.stringify(check(dir, { assignments, online: online !== undefined }), null, 2);
  },
  "take-reply": (dir, n, key, ...rest) => takeReply(dir, n, key, flags(rest, { transcript: "transcript" })),
};

function flags(argv, known, bare = []) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const key = known[argv[i].replace(/^--/, "")];
    if (!argv[i].startsWith("--") || !key) throw new Error(`Unknown option: ${argv[i]}`);
    out[key] = bare.includes(key) ? true : (argv[++i] ?? "");
  }
  return out;
}

export function main(argv) {
  const [cmd, dir, ...rest] = argv;
  const run = COMMANDS[cmd];
  if (!run) throw new Error(`Unknown command "${cmd ?? ""}". Use one of: ${Object.keys(COMMANDS).join(", ")}.`);
  if (!dir) throw new Error(`${cmd} needs the path of your project folder.`);
  return run(dir, ...rest);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(main(process.argv.slice(2)));
  } catch (e) {
    console.error(e.message.split("\n")[0]);
    process.exit(1);
  }
}
