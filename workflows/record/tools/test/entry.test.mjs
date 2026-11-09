import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { addEntry, takeReply } from "../changes.mjs";
import { parseRecord } from "../lib/record.mjs";
import { emptyRepo, write, commit } from "./repo.mjs";
import { codexRollout, meta, userMsg, agentMsg } from "../../../feedback/tools/test/fixtures.mjs";

const TOOL = join(dirname(fileURLToPath(import.meta.url)), "..", "changes.mjs");

function started() {
  const repo = emptyRepo();
  write(repo, "ps5/CHANGES.md", "# Change record\n\nInitial design: abc1234\n");
  commit(repo, "start");
  return repo;
}
const record = (repo) => readFileSync(join(repo, "ps5/CHANGES.md"), "utf8");

const ENTRY = {
  title: "take the later deadline",
  changed: "skill extract",
  commit: "abc1234",
  whoNoticed: "me",
  whoChose: "the agent, from my description",
  whatChanged: "extract takes the last deadline",
};

test("add-entry appends entry 1, then entry 2, with empty own-words parts", () => {
  const repo = started();
  assert.equal(addEntry(repo, ENTRY), 1);
  assert.equal(addEntry(repo, { ...ENTRY, title: "second" }), 2);
  const r = parseRecord(record(repo));
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.entries.map((e) => e.title), ["take the later deadline", "second"]);
  assert.equal(r.entries[1].parts.noticed.text, "");
  assert.equal(r.entries[0].fields.whoChose, "the agent, from my description");
});

test("agent noticed and agent chose is refused, writing nothing", () => {
  const repo = started();
  const before = record(repo);
  assert.throws(() => addEntry(repo, { ...ENTRY, whoNoticed: "the agent", whoChose: "the agent" }), {
    message: "That change was noticed and fixed by the agent, so it does not go in the record.",
  });
  assert.equal(record(repo), before);
});

test("a who value outside the lists is refused, writing nothing", () => {
  const repo = started();
  const before = record(repo);
  assert.throws(() => addEntry(repo, { ...ENTRY, whoNoticed: "my roommate" }), /Who noticed/);
  assert.throws(() => addEntry(repo, { ...ENTRY, whoChose: "nobody" }), /Who chose the fix/);
  assert.equal(record(repo), before);
});

test("a critique change the student did not choose is refused, writing nothing", () => {
  const repo = started();
  const before = record(repo);
  assert.throws(
    () => addEntry(repo, { ...ENTRY, whoNoticed: "a classmate or instructor", whoChose: "the agent, from my description" }),
    /classmate or the instructor noticed/
  );
  assert.equal(record(repo), before);
  assert.equal(addEntry(repo, { ...ENTRY, whoNoticed: "a classmate or instructor", whoChose: "me" }), 1);
});

test("the CLI add-entry prints the new number", () => {
  const repo = started();
  const args = ["add-entry", repo, "--title", "t", "--changed", "diagram", "--commit", "abc1234",
    "--who-noticed", "a classmate or instructor", "--who-chose", "me", "--what-changed", "added a check step"];
  assert.equal(execFileSync(process.execPath, [TOOL, ...args], { encoding: "utf8" }).trim(), "1");
  const refused = spawnSync(process.execPath, [TOOL, ...args.map((a) => (a === "me" ? "the agent" : a))], { encoding: "utf8" });
  assert.equal(refused.status, 1);
});

const REPLY = "The deadline it picked was the *first* one,\nbut `applications` close on the second.\n\n  It also said $HOME.";

function home(...sessions) {
  const h = mkdtempSync(join(tmpdir(), "record-home-"));
  const now = Date.now();
  const paths = sessions.map(({ name, ageMs }) => {
    const p = codexRollout(h, name, [meta("cli"), userMsg("please record this"), agentMsg("In your own words: what did you notice was wrong?"), userMsg(REPLY), agentMsg("ok")]);
    utimesSync(p, (now - ageMs) / 1000, (now - ageMs) / 1000);
    return p;
  });
  return { home: h, now: new Date(now), paths };
}

test("take-reply copies the student's last message exactly into the part", () => {
  const repo = started();
  addEntry(repo, ENTRY);
  const s = home({ name: "a", ageMs: 1_000 });
  assert.equal(takeReply(repo, 1, "noticed", { home: s.home, now: s.now }), `recorded your words in entry 1, noticed:\n\n${REPLY.trim()}`);
  const r = parseRecord(record(repo));
  assert.equal(r.entries[0].parts.noticed.text, REPLY.trim());
  assert.equal(r.entries[0].parts.why.text, "");
  assert.deepEqual(r.problems, []);
});

test("take-reply replaces earlier words and their attestation", () => {
  const repo = started();
  addEntry(repo, ENTRY);
  const s = home({ name: "a", ageMs: 1_000 });
  takeReply(repo, 1, "why", { home: s.home, now: s.now });
  takeReply(repo, 1, "why", { home: s.home, now: s.now });
  const text = record(repo);
  assert.equal(text.split(REPLY.trim()).length, 2);
  assert.equal(parseRecord(text).entries[0].parts.why.attestation, "missing");
});

test("two sessions written within ten seconds refuse and name both", () => {
  const repo = started();
  addEntry(repo, ENTRY);
  const before = record(repo);
  const s = home({ name: "a", ageMs: 1_000 }, { name: "b", ageMs: 5_000 });
  assert.throws(() => takeReply(repo, 1, "noticed", { home: s.home, now: s.now }), (e) => s.paths.every((p) => e.message.includes(p)));
  assert.equal(record(repo), before);
});

test("--transcript names the session outright", () => {
  const repo = started();
  addEntry(repo, ENTRY);
  const s = home({ name: "a", ageMs: 1_000 }, { name: "b", ageMs: 5_000 });
  const out = execFileSync(process.execPath, [TOOL, "take-reply", repo, "1", "why", "--transcript", s.paths[1]], { encoding: "utf8" });
  assert.match(out, /entry 1, why/);
  assert.equal(parseRecord(record(repo)).entries[0].parts.why.text, REPLY.trim());
});

test("a reply with a line CHANGES.md would read as a heading is refused", () => {
  const repo = started();
  addEntry(repo, ENTRY);
  const before = record(repo);
  const h = mkdtempSync(join(tmpdir(), "record-home-"));
  const p = codexRollout(h, "x", [meta("cli"), agentMsg("In your own words?"), userMsg("## my answer\nit broke")]);
  assert.throws(() => takeReply(repo, 1, "noticed", { transcript: p }), /heading/);
  assert.equal(record(repo), before);
});

test("take-reply into an entry that does not exist is refused", () => {
  const repo = started();
  const h = mkdtempSync(join(tmpdir(), "record-home-"));
  const p = codexRollout(h, "x", [meta("cli"), agentMsg("In your own words?"), userMsg("words")]);
  assert.throws(() => takeReply(repo, 3, "noticed", { transcript: p }), /entry 3/);
});

function transcript(records) {
  const h = mkdtempSync(join(tmpdir(), "record-home-"));
  return codexRollout(h, "t", [meta("cli"), ...records]);
}

test("a reply to a question that did not ask for their own words is refused", () => {
  const repo = started();
  addEntry(repo, ENTRY);
  const before = record(repo);
  const p = transcript([agentMsg("Who noticed the problem?"), userMsg("a run on examples/e01, 1, 2")]);
  assert.throws(() => takeReply(repo, 1, "noticed", { transcript: p }), /own words/);
  assert.equal(record(repo), before);
});

test("a reply that was dropped, such as one with an image, does not let an older message through", () => {
  const repo = started();
  addEntry(repo, ENTRY);
  const p = transcript([
    agentMsg("Three quick questions."),
    userMsg("a run on examples/e01, 1, 2"),
    agentMsg("In your own words: what did you notice was wrong?"),
    userMsg("see the screenshot", ["user.text", "user.image"]),
  ]);
  assert.throws(() => takeReply(repo, 1, "noticed", { transcript: p }), /own words/);
});

test("an answer sent through the Codex question tool is unwrapped to just the answer", () => {
  const repo = started();
  addEntry(repo, ENTRY);
  const wrapped = `<send_user_message_question_reply>${JSON.stringify([{ questionItemId: "q1", answer: "It took the first deadline." }])}</send_user_message_question_reply>`;
  const p = transcript([agentMsg("In your own words: what did you notice was wrong?"), userMsg(wrapped)]);
  takeReply(repo, 1, "noticed", { transcript: p });
  assert.equal(parseRecord(record(repo)).entries[0].parts.noticed.text, "It took the first deadline.");
});
