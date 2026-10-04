// A topic-level origin header that goals inherit unless they carry their own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readGoals } from '../lib/topic.mjs';
import { run, survey, CAP_GOAL } from './helpers.mjs';

// makeTopic puts its goals under `## Goals` with no header, so write goals.md directly.
function topicWith(header, goals) {
  const dir = join(mkdtempSync(join(tmpdir(), 'learn-test-')), 'topic');
  mkdirSync(dir);
  writeFileSync(join(dir, 'goals.md'), `# Topic\n\n${header}## Goals\n\n${goals}\n`);
  writeFileSync(join(dir, 'status.jsonl'), '');
  return dir;
}

test('a goal inherits the topic origin', () => {
  const dir = topicWith('**origin:** course\n\n', CAP_GOAL('c-a'));
  const r = readGoals(dir);
  assert.equal(r.origin, 'course');
  assert.equal(r.goals[0].origin, 'course');
});

test('a goal own origin beats the topic one', () => {
  const dir = topicWith('**origin:** course\n\n', CAP_GOAL('c-a', '- **origin:** learner\n'));
  assert.equal(readGoals(dir).goals[0].origin, 'learner');
});

test('a goal origin works with no header', () => {
  const dir = topicWith('', CAP_GOAL('c-a', '- **origin:** course\n'));
  const r = readGoals(dir);
  assert.equal(r.origin, 'learner');
  assert.equal(r.goals[0].origin, 'course');
});

test('no header and no goal origin is learner', () => {
  const r = readGoals(topicWith('', CAP_GOAL('c-a')));
  assert.equal(r.origin, 'learner');
  assert.equal(r.goals[0].origin, 'learner');
});

test('an unknown header value reads as learner and is reported', () => {
  const dir = topicWith('**origin:** instructor\n\n', CAP_GOAL('c-a'));
  assert.equal(readGoals(dir).origin, 'learner');
  const s = survey(dir);
  assert.equal(s.origin, 'learner');
  assert.ok(s.problems.includes('goals.md has origin: instructor, which is not one of: learner, course'));
});

function addWord(header) {
  const dir = topicWith(header, CAP_GOAL('c-a'));
  const parent = join(dir, '..');
  const r = run('new-word.mjs', ['--dir', parent, 'topic', 'a word', 'w-word']);
  assert.equal(r.code, 0, r.stderr);
  return readFileSync(join(dir, 'goals.md'), 'utf8');
}

test('new-word stamps learner on a course topic only', () => {
  assert.ok(addWord('**origin:** course\n\n').includes('- **origin:** learner'));
  assert.ok(!addWord('').includes('- **origin:** learner'));
});

test('an origin line inside an HTML comment is ignored', () => {
  const dir = topicWith('<!--\n**origin:** course\n-->\n\n', CAP_GOAL('c-a'));
  assert.equal(readGoals(dir).origin, 'learner');
  assert.equal(readGoals(dir).goals[0].origin, 'learner');
});

test('an origin line with trailing text is reported and the topic stays learner', () => {
  const dir = topicWith('**origin:** course (shipped)\n\n', CAP_GOAL('c-a'));
  assert.equal(readGoals(dir).origin, 'learner');
  assert.ok(survey(dir).problems.includes('goals.md has an origin line that isn\'t one word: "**origin:** course (shipped)"'));
});
