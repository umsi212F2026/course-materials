import { test } from "node:test";
import assert from "node:assert/strict";
import { partHash } from "../../../record/tools/lib/record.mjs";
import { parseRounds, renderRound, setRoundPart, setRoundAttestation, splitCommits } from "../lib/rounds.mjs";

const NEW1 = "The digest now lists the week's events.\nIt sends on Mondays.";
const WHY1 = "People asked to see it without opening the app.";
const NEW2 = "Digests can be switched off per user.";
const WHY2 = "Nobody wants it forever.";
const att = (text) => `<!-- attested 2026-12-08 sha256:${partHash(text)} -->`;

const round = (n, title, commits, a, b) => `## ${n}. ${title}

- **Spec:** docs/superpowers/specs/2026-11-25-weekly-digest-design.md
- **Plan:** docs/superpowers/plans/2026-11-25-weekly-digest.md
- **Commits:** ${commits}

### What's new (my own words)

${a}

${att(a)}

### Why next (my own words)

${b}

${att(b)}
`;

const SAMPLE = `# Rounds

Base: a1b2c3d

${round(1, "weekly digest", "a1b2c3d..e4f5a6b", NEW1, WHY1)}
${round(2, "opt out", "f1f2f3f", NEW2, WHY2)}`;

test("parses a full record", () => {
  const r = parseRounds(SAMPLE);
  assert.equal(r.base, "a1b2c3d");
  assert.equal(r.baseLine, "set");
  assert.equal(r.rounds.length, 2);
  assert.equal(r.rounds[0].n, 1);
  assert.equal(r.rounds[0].title, "weekly digest");
  assert.equal(r.rounds[0].fields.spec, "docs/superpowers/specs/2026-11-25-weekly-digest-design.md");
  assert.equal(r.rounds[0].fields.commits, "a1b2c3d..e4f5a6b");
  assert.equal(r.rounds[0].parts.new.text, NEW1);
  assert.equal(r.rounds[0].parts.new.attestation, "fresh");
  assert.equal(r.rounds[1].parts.why.text, WHY2);
  assert.equal(r.rounds[1].parts.why.attestation, "fresh");
  assert.deepEqual(r.problems, []);
});

test("base placeholder", () => {
  const r = parseRounds("# Rounds\n\nBase: <commit hash>\n");
  assert.equal(r.baseLine, "placeholder");
  assert.equal(r.base, null);
  assert.equal(parseRounds("# Rounds\n").baseLine, "missing");
});

test("CRLF record parses as LF", () => {
  const r = parseRounds(SAMPLE.replace(/\n/g, "\r\n"));
  assert.deepEqual(r.problems, []);
  assert.equal(r.rounds[0].parts.new.text, NEW1);
  assert.equal(r.rounds[0].parts.new.attestation, "fresh");
});

test("edited part reads stale", () => {
  const r = parseRounds(SAMPLE.replace("Mondays", "Fridays"));
  assert.equal(r.rounds[0].parts.new.attestation, "stale");
  assert.equal(r.rounds[0].parts.why.attestation, "fresh");
});

test("missing field is a problem with a line number", () => {
  const r = parseRounds(SAMPLE.replace(/- \*\*Plan:\*\*.*\n/, ""));
  const p = r.problems.find((x) => /Plan/.test(x.message));
  assert.ok(p);
  assert.equal(typeof p.line, "number");
  assert.equal(p.line, r.rounds[0].line);
});

test("single-hash Commits gives first === last", () => {
  assert.deepEqual(splitCommits("f1f2f3f"), { first: "f1f2f3f", last: "f1f2f3f" });
  assert.deepEqual(splitCommits("a1b2c3d..e4f5a6b"), { first: "a1b2c3d", last: "e4f5a6b" });
  assert.equal(splitCommits(""), null);
  assert.equal(splitCommits("not a hash"), null);
});

test('setRoundPart refuses "## heading" in the words', () => {
  assert.throws(() => setRoundPart(SAMPLE, 1, "new", "fine\n## heading"), /#/);
  assert.throws(() => setRoundPart(SAMPLE, 1, "new", "<!-- attested 2026-12-08 sha256:abcdefabcdef -->"));
});

test("setRoundPart replaces words and drops the attestation; setRoundAttestation restores it", () => {
  const edited = setRoundPart(SAMPLE, 2, "why", "A new reason.");
  let r = parseRounds(edited);
  assert.equal(r.rounds[1].parts.why.text, "A new reason.");
  assert.equal(r.rounds[1].parts.why.attestation, "missing");
  assert.equal(r.rounds[0].parts.why.attestation, "fresh");
  r = parseRounds(setRoundAttestation(edited, 2, "why", "2026-12-09"));
  assert.equal(r.rounds[1].parts.why.attestation, "fresh");
  assert.deepEqual(r.problems, []);
});

test("render then parse round-trips", () => {
  const input = {
    title: "weekly digest",
    fields: { spec: "docs/s.md", plan: "docs/p.md", commits: "a1b2c3d..e4f5a6b" },
    parts: { new: NEW1, why: "Because $HOME `ticks` and\n\ntwo paragraphs." },
  };
  const r = parseRounds("# Rounds\n\nBase: a1b2c3d\n\n" + renderRound(1, input));
  assert.deepEqual(r.problems, []);
  assert.equal(r.rounds[0].title, input.title);
  assert.deepEqual(r.rounds[0].fields, input.fields);
  assert.equal(r.rounds[0].parts.new.text, input.parts.new);
  assert.equal(r.rounds[0].parts.why.text, input.parts.why);
  assert.equal(r.rounds[0].parts.new.attestation, "missing");
});
