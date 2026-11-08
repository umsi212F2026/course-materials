#!/usr/bin/env node
//
// Read, check and write a student's PS5 change record, ps5/CHANGES.md.
//
//   node workflows/record/tools/changes.mjs parse <repo>
//   node workflows/record/tools/changes.mjs check <repo>
//   node workflows/record/tools/changes.mjs attest <repo> <n> <noticed|why>
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
import { parseRecord, qualifies, setAttestation } from "./lib/record.mjs";
import { git, commitExists, filesAt } from "./lib/git.mjs";

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
  return existsSync(path) ? readFileSync(path, "utf8") : null;
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

  return { ok: items.every((i) => i.ok), items };
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
};

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
