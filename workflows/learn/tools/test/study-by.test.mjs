// A topic-level `**study by:**` header: the session a course topic prepares for, and its place
// among the topics set for that session.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { survey, CAP_GOAL } from './helpers.mjs';

// makeTopic puts its goals under `## Goals` with no header, so write goals.md directly.
function topicWith(header) {
  const dir = join(mkdtempSync(join(tmpdir(), 'learn-test-')), 'topic');
  mkdirSync(dir);
  writeFileSync(join(dir, 'goals.md'), `# Topic\n\n${header}## Goals\n\n${CAP_GOAL('c-a')}\n`);
  writeFileSync(join(dir, 'status.jsonl'), '');
  return dir;
}

test('a date and a place among that session\'s topics', () => {
  const s = survey(topicWith('**origin:** course\n**study by:** 2026-10-06, 2 of 3\n\n'));
  assert.deepEqual(s.studyBy, { date: '2026-10-06', position: 2, of: 3 });
  assert.ok(!s.problems.some((p) => p.includes('study by')), s.problems.join('\n'));
});

test('a date alone', () => {
  const s = survey(topicWith('**study by:** 2026-10-06\n\n'));
  assert.deepEqual(s.studyBy, { date: '2026-10-06', position: null, of: null });
});

test('no line is no study-by, and no problem', () => {
  const s = survey(topicWith('**origin:** course\n\n'));
  assert.equal(s.studyBy, null);
  assert.ok(!s.problems.some((p) => p.includes('study by')), s.problems.join('\n'));
});

test('a line that does not parse is reported and read as none', () => {
  const s = survey(topicWith('**study by:** next Tuesday\n\n'));
  assert.equal(s.studyBy, null);
  assert.ok(s.problems.some((p) => p.includes('study by') && p.includes('next Tuesday')), s.problems.join('\n'));
});

test('a place past the count is reported', () => {
  const s = survey(topicWith('**study by:** 2026-10-06, 4 of 3\n\n'));
  assert.equal(s.studyBy, null);
  assert.ok(s.problems.some((p) => p.includes('study by')), s.problems.join('\n'));
});

test('a line inside a comment is guidance, not the header', () => {
  const s = survey(topicWith('<!--\n**study by:** 2026-10-06, 1 of 3\n-->\n\n'));
  assert.equal(s.studyBy, null);
  assert.ok(!s.problems.some((p) => p.includes('study by')), s.problems.join('\n'));
});
