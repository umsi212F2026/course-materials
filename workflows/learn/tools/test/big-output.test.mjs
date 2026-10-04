// JSON output past a pipe's buffer must arrive whole. A tool that called process.exit() straight
// after console.log cut its output off at 64 KB when read through a pipe, which is how every agent
// reads it; nine course topics were enough to cross that line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, CAP_GOAL } from './helpers.mjs';

// A learning-topics folder with enough topics and goals that survey's JSON is well past 64 KB.
function bigLearning() {
  const learning = mkdtempSync(join(tmpdir(), 'learn-big-'));
  const goals = Array.from({ length: 30 }, (_, i) => CAP_GOAL(`c-goal-${i}`)).join('\n');
  for (let t = 0; t < 12; t++) {
    const dir = join(learning, `topic-${t}-2026-10`);
    mkdirSync(dir);
    writeFileSync(join(dir, 'goals.md'), `# Topic ${t}\n\n## Goals\n\n${goals}\n`);
    writeFileSync(join(dir, 'status.jsonl'), '');
  }
  return learning;
}

test('survey prints JSON past 64 KB whole through a pipe', () => {
  const r = run('survey.mjs', ['--dir', bigLearning()]);
  assert.doesNotThrow(() => JSON.parse(r.stdout), `cut off at ${r.stdout.length} bytes`);
  assert.equal(JSON.parse(r.stdout).length, 12);
  // The fixture has to cross the line the bug lived at, or this proves nothing.
  assert.ok(r.stdout.length > 65536, `only ${r.stdout.length} bytes; make the fixture bigger`);
});

test('review-due prints its JSON whole through a pipe', () => {
  const r = run('review-due.mjs', ['--dir', bigLearning()]);
  assert.doesNotThrow(() => JSON.parse(r.stdout), r.stdout.slice(-200));
});
