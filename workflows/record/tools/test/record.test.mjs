import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRecord, qualifies, partHash, renderEntry, setAttestation } from "../lib/record.mjs";

const NOTICED = "the posting listed two deadlines\nand the agent picked the first one";
const WHY = "I wanted the later one, since that is when applications close.";
const att = (text) => `<!-- attested 2026-11-18 sha256:${partHash(text)} -->`;

const entry = (n, title, who, noticed, why) => `## ${n}. ${title}

- **Changed:** skill extract
- **Commit:** a1b2c3d4
- **Who noticed:** ${who.noticed}
- **Who chose the fix:** ${who.chose}
- **What changed:** extract now takes the last deadline in a posting

### What was wrong (my own words)

${noticed}

${att(noticed)}

### Why this fix (my own words)

${why}

${att(why)}
`;

const SAMPLE = `# Change record

Initial design: a1b2c3d

${entry(1, "take the later deadline", { noticed: "me", chose: "me" }, NOTICED, WHY)}
${entry(2, "drop expired postings", { noticed: "a classmate or instructor", chose: "me" }, "It kept expired ones.", "Nobody wants those.")}`;

const ENTRY = {
  title: "take the later deadline",
  fields: {
    changed: "skill extract",
    commit: "a1b2c3d4",
    whoNoticed: "me",
    whoChose: "the agent, from my description",
    whatChanged: "extract now takes the last deadline",
  },
  parts: { noticed: NOTICED, why: "Because $HOME `ticks` and\n\ntwo paragraphs." },
};

const UNATTESTED = "# Change record\n\nInitial design: a1b2c3d\n\n" + renderEntry(1, ENTRY);

test("parses a well-formed record", () => {
  const r = parseRecord(SAMPLE);
  assert.equal(r.initialDesign, "a1b2c3d");
  assert.equal(r.entries.length, 2);
  assert.equal(r.entries[0].n, 1);
  assert.equal(r.entries[0].title, "take the later deadline");
  assert.equal(r.entries[0].fields.whoNoticed, "me");
  assert.equal(r.entries[0].fields.promptedBy, undefined);
  assert.equal(r.entries[0].parts.noticed.text, NOTICED);
  assert.equal(r.entries[0].parts.noticed.attestation, "fresh");
  assert.equal(r.entries[1].fields.whoNoticed, "a classmate or instructor");
  assert.deepEqual(r.problems, []);
});

test("partHash is twelve hex digits of the trimmed text", () => {
  assert.match(partHash("hello"), /^[0-9a-f]{12}$/);
  assert.equal(partHash("  hello\n"), partHash("hello"));
});

test("placeholder initial design reads as null", () => {
  assert.equal(parseRecord("# Change record\n\nInitial design: <commit hash>\n").initialDesign, null);
});

test("no initial design line reads as null", () => {
  assert.equal(parseRecord("# Change record\n").initialDesign, null);
});

test("a missing field is a problem with a line number, not a throw", () => {
  const r = parseRecord(SAMPLE.replace("- **Who noticed:** me\n", ""));
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0].message, /Who noticed/);
  assert.ok(r.problems[0].line > 0);
});

test("a who value outside the lists is a problem", () => {
  const r = parseRecord(SAMPLE.replace("- **Who noticed:** me\n", "- **Who noticed:** my roommate\n"));
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0].message, /Who noticed/);
});

test("a renamed entry heading and a stray line are each reported, and parsing goes on", () => {
  const r = parseRecord(
    SAMPLE.replace("## 2. drop expired postings", "## Two: drop expired postings").replace(
      "- **Changed:** skill extract\n",
      "- **Changed:** skill extract\nsome stray note\n"
    )
  );
  assert.equal(r.entries.length, 1);
  assert.equal(r.problems.length, 2);
  assert.ok(r.problems.every((p) => p.line > 0));
});

test("a missing own-words heading is a problem", () => {
  const r = parseRecord(SAMPLE.replace("### Why this fix (my own words)", "### Why"));
  assert.ok(r.problems.some((p) => /Why this fix/.test(p.message)));
});

test("an edited part reads stale", () => {
  const r = parseRecord(SAMPLE.replace("the posting listed two deadlines", "the posting had two dates"));
  assert.equal(r.entries[0].parts.noticed.attestation, "stale");
});

test("a part with no comment reads missing", () => {
  assert.equal(parseRecord(UNATTESTED).entries[0].parts.noticed.attestation, "missing");
});

test("agent noticed and agent chose does not qualify", () => {
  assert.equal(qualifies({ fields: { whoNoticed: "the agent", whoChose: "the agent" } }), false);
  assert.equal(qualifies({ fields: { whoNoticed: "the agent", whoChose: "me, from options the agent gave" } }), true);
  assert.equal(qualifies({ fields: { whoNoticed: "me", whoChose: "the agent" } }), true);
});

test("a critique entry qualifies only when the student chose the fix", () => {
  const critique = (whoChose) => qualifies({ fields: { whoNoticed: "a classmate or instructor", whoChose } });
  assert.equal(critique("me"), true);
  assert.equal(critique("me, from options the agent gave"), true);
  assert.equal(critique("the agent, from my description"), false);
  assert.equal(critique("the agent"), false);
});

test("render then parse round-trips", () => {
  const r = parseRecord(UNATTESTED);
  assert.deepEqual(r.problems, []);
  assert.equal(r.entries[0].parts.why.text, ENTRY.parts.why);
  assert.equal(r.entries[0].parts.noticed.text, NOTICED);
  assert.deepEqual(r.entries[0].fields, ENTRY.fields);
});

test("an entry rendered with empty parts parses with empty text", () => {
  const text = "# Change record\n\nInitial design: a1b2c3d\n\n" + renderEntry(1, { ...ENTRY, parts: { noticed: "", why: "" } });
  const r = parseRecord(text);
  assert.deepEqual(r.problems, []);
  assert.equal(r.entries[0].parts.noticed.text, "");
  assert.equal(r.entries[0].parts.noticed.attestation, "missing");
});

test("setAttestation writes a fresh comment and replaces an old one", () => {
  const once = setAttestation(UNATTESTED, 1, "why", "2026-11-18");
  assert.equal(parseRecord(once).entries[0].parts.why.attestation, "fresh");
  assert.equal(parseRecord(once).entries[0].parts.noticed.attestation, "missing");
  const twice = setAttestation(once, 1, "why", "2026-11-19");
  assert.equal(twice.match(/attested/g).length, once.match(/attested/g).length);
  assert.match(twice, /attested 2026-11-19/);
  assert.equal(parseRecord(twice).entries[0].parts.why.text, ENTRY.parts.why);
});

test("setAttestation on an entry that does not exist throws", () => {
  assert.throws(() => setAttestation(UNATTESTED, 7, "why", "2026-11-18"), /entry 7/);
});

test("Windows line endings parse the same as Unix ones", () => {
  const r = parseRecord(SAMPLE.replace(/\n/g, "\r\n"));
  assert.deepEqual(r.problems, []);
  assert.equal(r.entries.length, 2);
  assert.equal(r.entries[0].parts.noticed.text, NOTICED);
  assert.equal(r.entries[0].parts.noticed.attestation, "fresh");
});

test("setAttestation on a file with Windows line endings writes a fresh comment", () => {
  const once = setAttestation(UNATTESTED.replace(/\n/g, "\r\n"), 1, "why", "2026-11-18");
  assert.equal(parseRecord(once).entries[0].parts.why.attestation, "fresh");
});

test("a duplicate entry number is a problem", () => {
  const r = parseRecord(SAMPLE.replace("## 2. drop expired postings", "## 1. drop expired postings"));
  assert.ok(r.problems.some((p) => /more than one entry 1/.test(p.message)));
});

test("the file keeps its final newline after a write", () => {
  assert.ok(setAttestation(UNATTESTED, 1, "why", "2026-11-18").endsWith("\n"));
});
