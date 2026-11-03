import { test } from "node:test";
import assert from "node:assert/strict";
import { redact } from "../lib/redact.mjs";

// Fake keys are built in two pieces so that no whole one appears in this public repository,
// where secret scanning would take it for a real one.

test("each key shape becomes [redacted] and is counted", () => {
  for (const s of [
    "sk-" + "abcdefghijklmnopqrstuvwx",
    "sk-ant-" + "api03-abcdefghijklmnopqrst",
    "ghp_" + "abcdefghijklmnopqrstuvwxyz0123456789",
    "github_pat_" + "11ABCDEFG0123456789_abcdefghij",
    "AKIA" + "ABCDEFGHIJKLMNOP",
    "xoxb-" + "1234567890-abcdefghij",
    "Bearer abc.def.ghi1234567890",
  ]) {
    const r = redact(`key ${s} here`, "/Users/kim");
    assert.equal(r.text, "key [redacted] here", s);
    assert.equal(r.count, 1, s);
  }
});

test("a run of 40+ base64 or hex characters is redacted", () => {
  assert.equal(redact("x " + "a1B2".repeat(10) + " y", "/h").text, "x [redacted] y");
});

test("a 39-character run and ordinary prose are left alone", () => {
  const s = "a".repeat(39) + " skip the sk- prefix talk";
  assert.deepEqual(redact(s, "/h"), { text: s, count: 0 });
});

test("a long path and a long slug are not tokens", () => {
  const s = "workflows/learn/skills/study/references/a2-moves and a-critique-permissions-plan-for-the-crumbs-app-2026";
  assert.deepEqual(redact(s, "/h"), { text: s, count: 0 });
});

test("a rollout filename and talk about bearer headers are not tokens", () => {
  const s = "rollout-2026-10-27T11-48-44-01a17e0c-b42e-7952-86b1-d507d0bb377b.jsonl and `Bearer ...`";
  assert.deepEqual(redact(s, "/h"), { text: s, count: 0 });
});

test("a long segment in a hyphenated run is still a token", () => {
  assert.equal(redact("sk_live_" + "a1B2c3D4e5".repeat(4), "/h").text, "[redacted]");
});

test("keys an agent echoes from .env or a Firebase config are redacted", () => {
  const cases = [
    ['apiKey: "AIza' + 'SyA1b2C3d4E5f6G7h8I9j0KlMnOpQrStUvW"', 'apiKey: "[redacted]"'],
    ["postgresql://postgres:Hunter2pass@db.example.com:5432/app", "postgresql://postgres:[redacted]@db.example.com:5432/app"],
    ["STRIPE_KEY=sk_live_" + "abcdefghijklmnopqrstuvwx", "STRIPE_KEY=[redacted]"],
    ["DB_PASSWORD=correcthorse", "DB_PASSWORD=[redacted]"],
    ['SESSION_SECRET: "s3cr3t-value"', 'SESSION_SECRET: "[redacted]"'],
  ];
  for (const [input, want] of cases) {
    const r = redact(input, "/h");
    assert.equal(r.text, want, input);
    assert.equal(r.count, 1, input);
  }
});

test("a variable named like a key with no value is left alone", () => {
  const s = "Set API_KEY= in your .env, then read process.env.API_KEY";
  assert.deepEqual(redact(s, "/h"), { text: s, count: 0 });
});

test("a Windows home doubled by JSON or with another letter case becomes ~", () => {
  const r = redact('Read {"file_path":"C:\\\\Users\\\\kim\\\\a.js"} and c:\\users\\kim\\b', "C:\\Users\\kim");
  assert.equal(r.text, 'Read {"file_path":"~\\\\a.js"} and ~\\b');
});

test("the home path becomes ~ and is not counted", () => {
  assert.deepEqual(redact("cd /Users/kim/si212", "/Users/kim"), { text: "cd ~/si212", count: 0 });
});

test("a Windows home with either slash becomes ~", () => {
  assert.equal(redact("C:\\Users\\kim\\si212 and C:/Users/kim/x", "C:\\Users\\kim").text, "~\\si212 and ~/x");
});
