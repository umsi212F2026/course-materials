import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { parse, candidates, addRound, takeReply, attest } from "../rounds.mjs";
import { parseRounds } from "../lib/rounds.mjs";
import { roundsRepo, write, commit, withBase, ROUND1, ROUND2 } from "./repo.mjs";
import { codexRollout, meta, userMsg, agentMsg } from "../../../feedback/tools/test/fixtures.mjs";

const TOOL = join(dirname(fileURLToPath(import.meta.url)), "..", "rounds.mjs");
const rounds = (r) => readFileSync(join(r.dir, "ROUNDS.md"), "utf8");

function started(prefix = "", baseOf = (r) => r.base.slice(0, 7)) {
  const r = roundsRepo(prefix);
  write(r.repo, r.p("ROUNDS.md"), withBase(baseOf(r)));
  return r;
}

test("add-round then parse", () => {
  const r = started();
  assert.equal(addRound(r.dir, { ...ROUND1, commits: `${r.impl1a.slice(0, 7)}..${r.impl1.slice(0, 7)}` }), 1);
  assert.equal(addRound(r.dir, { ...ROUND2, commits: r.impl2.slice(0, 7) }), 2);
  const text = rounds(r);
  assert.deepEqual(parseRounds(text).problems, []);
  const p = parse(r.dir);
  assert.deepEqual(p.rounds.map((x) => x.title), ["parser", "exporter"]);
  assert.deepEqual(p.rounds.map((x) => x.valid), [true, true]);
  assert.deepEqual(p.rounds[0].reasons, []);
  assert.equal(p.rounds[1].parts.new.text, "");
});

test("refuses a plan added in the base commit", () => {
  const r = roundsRepo();
  write(r.repo, r.p("ROUNDS.md"), withBase(r.plan1.slice(0, 7)));
  const before = rounds(r);
  assert.throws(() => addRound(r.dir, { ...ROUND1, commits: r.impl1.slice(0, 7) }), /not after the base/);
  assert.equal(rounds(r), before);
});

test("refuses a plan recorded twice", () => {
  const r = started();
  addRound(r.dir, { ...ROUND1, commits: r.impl1.slice(0, 7) });
  const before = rounds(r);
  assert.throws(() => addRound(r.dir, { ...ROUND1, title: "again", commits: r.impl1.slice(0, 7) }), /already recorded/);
  assert.equal(rounds(r), before);
});

test("refuses commits that break the rules, naming the reason", () => {
  const r = started();
  const before = rounds(r);
  // first implementing commit is the plan's own commit
  assert.throws(() => addRound(r.dir, { ...ROUND1, commits: `${r.plan1.slice(0, 7)}..${r.impl1.slice(0, 7)}` }), /does not come after the plan/);
  // last before first
  assert.throws(() => addRound(r.dir, { ...ROUND2, commits: `${r.impl2.slice(0, 7)}..${r.plan2.slice(0, 7)}` }), /is not the first/);
  assert.throws(() => addRound(r.dir, { ...ROUND1, commits: `${r.impl1.slice(0, 7)}..${r.impl1a.slice(0, 7)}` }), /is not the first/);
  assert.throws(() => addRound(r.dir, { ...ROUND1, commits: "ffffffff" }), /not a commit/);
  assert.throws(() => addRound(r.dir, { ...ROUND1, spec: "docs/none.md", commits: r.impl1.slice(0, 7) }), /docs\/none\.md/);
  assert.equal(rounds(r), before);
});

test("abbreviated hashes accepted in Base and Commits", () => {
  const r = started("", (x) => x.base.slice(0, 4));
  addRound(r.dir, { ...ROUND1, commits: `${r.impl1a.slice(0, 4)}..${r.impl1.slice(0, 4)}` });
  const p = parse(r.dir);
  assert.equal(p.base, r.base.slice(0, 4));
  assert.deepEqual(p.rounds[0].reasons, []);
  assert.equal(p.rounds[0].valid, true);
});

test("parse names each rule a round fails", () => {
  const r = started();
  addRound(r.dir, { ...ROUND1, commits: r.impl1.slice(0, 7) });
  const text = rounds(r).replace(/(\*\*Commits:\*\* ).*/, `$1${r.impl1.slice(0, 7)}..${r.plan1.slice(0, 7)}`);
  write(r.repo, r.p("ROUNDS.md"), text);
  const x = parse(r.dir).rounds[0];
  assert.equal(x.valid, false);
  assert.ok(x.reasons.length >= 1);
});

test("a duplicated round number or plan makes both rounds invalid", () => {
  const r = started();
  addRound(r.dir, { ...ROUND1, commits: r.impl1.slice(0, 7) });
  const one = rounds(r);
  const body = one.slice(one.indexOf("## 1."));
  write(r.repo, r.p("ROUNDS.md"), one + "\n" + body);
  const p = parse(r.dir);
  assert.equal(p.rounds.length, 2);
  assert.deepEqual(p.rounds.map((x) => x.valid), [false, false]);
  assert.ok(p.rounds.every((x) => x.reasons.some((s) => /more than one round 1/.test(s))));
  assert.ok(p.rounds.every((x) => x.reasons.some((s) => /same plan/.test(s))));
});

test("candidates in a subfolder ignore plans elsewhere in the repository", () => {
  const r = roundsRepo("project/");
  write(r.repo, "ps5/docs/superpowers/plans/2026-11-21-other.md", "# other\n");
  commit(r.repo, "ps5 plan");
  write(r.repo, r.p("ROUNDS.md"), withBase(r.base.slice(0, 7)));
  const c = candidates(r.dir);
  assert.deepEqual(c.plans.map((x) => x.plan), [ROUND1.plan, ROUND2.plan]);
  assert.equal(c.base, r.base.slice(0, 7));
  assert.equal(c.plans[0].spec, ROUND1.spec);
  assert.equal(c.plans[0].recorded, false);
  assert.match(c.plans[0].date, /^\d{4}-\d\d-\d\d$/);
  assert.equal(c.plans[0].addedIn, r.plan1);
});

test("a subfolder project records and validates rounds with paths relative to it", () => {
  const r = started("project/");
  addRound(r.dir, { ...ROUND1, commits: `${r.impl1a.slice(0, 7)}..${r.impl1.slice(0, 7)}` });
  assert.equal(parse(r.dir).rounds[0].valid, true);
});

test("candidates suggests the commit range between two plans", () => {
  const r = started();
  const c = candidates(r.dir);
  assert.equal(c.plans[0].suggestedCommits, `${r.impl1a.slice(0, 7)}..${r.impl1.slice(0, 7)}`);
  assert.equal(c.plans[1].suggestedCommits, `${r.impl2.slice(0, 7)}..${r.impl2.slice(0, 7)}`);
  addRound(r.dir, { ...ROUND1, commits: r.impl1.slice(0, 7) });
  assert.equal(candidates(r.dir).plans[0].recorded, true);
});

test("candidates refuses without a Base, and a plan with no work after it has no suggestion", () => {
  const r = roundsRepo();
  assert.throws(() => candidates(r.dir), /Base/);
  write(r.repo, r.p("ROUNDS.md"), withBase(r.base.slice(0, 7)));
  write(r.repo, r.p("docs/superpowers/plans/2026-11-25-late.md"), "# late\n");
  commit(r.repo, "late plan");
  const late = candidates(r.dir).plans.find((x) => x.plan.endsWith("late.md"));
  assert.equal(late.suggestedCommits, null);
  assert.equal(late.spec, null);
});

const REPLY = "It could read\nthe *whole* file now.";

function transcript(records) {
  const h = mkdtempSync(join(tmpdir(), "rounds-home-"));
  return codexRollout(h, "t", [meta("cli"), ...records]);
}

test("take-reply copies the student's words into round 1 new", () => {
  const r = started();
  addRound(r.dir, { ...ROUND1, commits: r.impl1.slice(0, 7) });
  const p = transcript([agentMsg("In your own words: what is new?"), userMsg(REPLY)]);
  assert.equal(takeReply(r.dir, 1, "new", { transcript: p }), `recorded your words in round 1, new:\n\n${REPLY}`);
  const round = parse(r.dir).rounds[0];
  assert.equal(round.parts.new.text, REPLY);
  assert.equal(round.parts.why.text, "");
  assert.throws(() => takeReply(r.dir, 1, "noticed", { transcript: p }), /new or why/);
  assert.throws(() => takeReply(r.dir, 4, "new", { transcript: p }), /4/);
});

test("take-reply refuses a reply to a question that did not ask for their own words", () => {
  const r = started();
  addRound(r.dir, { ...ROUND1, commits: r.impl1.slice(0, 7) });
  const before = rounds(r);
  const p = transcript([agentMsg("Which plan?"), userMsg("the first")]);
  assert.throws(() => takeReply(r.dir, 1, "new", { transcript: p }), /own words/);
  assert.equal(rounds(r), before);
});

test("attest then edit reads stale", () => {
  const r = started();
  addRound(r.dir, { ...ROUND1, commits: r.impl1.slice(0, 7) });
  takeReply(r.dir, 1, "why", { transcript: transcript([agentMsg("In your own words: why?"), userMsg("because")]) });
  assert.equal(attest(r.dir, 1, "why", "2026-11-30"), "attested round 1, why");
  assert.equal(parse(r.dir).rounds[0].parts.why.attestation, "fresh");
  write(r.repo, r.p("ROUNDS.md"), rounds(r).replace("because", "because I said so"));
  assert.equal(parse(r.dir).rounds[0].parts.why.attestation, "stale");
  assert.throws(() => attest(r.dir, 1, "noticed", "2026-11-30"), /new or why/);
});

test("the CLI prints JSON, and one line on stderr with exit 1 on failure", () => {
  const r = started();
  const args = ["add-round", r.dir, "--title", "t", "--spec", ROUND1.spec, "--plan", ROUND1.plan, "--commits", r.impl1.slice(0, 7)];
  assert.equal(execFileSync(process.execPath, [TOOL, ...args], { encoding: "utf8" }).trim(), "1");
  const out = JSON.parse(execFileSync(process.execPath, [TOOL, "parse", r.dir], { encoding: "utf8" }));
  assert.equal(out.rounds[0].valid, true);
  const c = JSON.parse(execFileSync(process.execPath, [TOOL, "candidates", r.dir], { encoding: "utf8" }));
  assert.equal(c.plans.length, 2);
  const before = rounds(r);
  const bad = spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.equal(bad.stderr.trim().split("\n").length, 1);
  assert.equal(rounds(r), before);
  const tr = transcript([agentMsg("In your own words?"), userMsg("hello")]);
  const taken = execFileSync(process.execPath, [TOOL, "take-reply", r.dir, "1", "new", "--transcript", tr], { encoding: "utf8" });
  assert.match(taken, /round 1, new/);
});
