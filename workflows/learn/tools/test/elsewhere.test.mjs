import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTopic, run, survey, CAP_GOAL } from './helpers.mjs';

const MISS = '{"unaided":"yes","criterion":"not met"}';

function lastFor(dir) {
  const s = survey(dir);
  const text = JSON.stringify(s);
  const m = text.match(/"last":"([^"]*)"/);
  return m ? m[1] : text;
}

function setup(outcome, ...note) {
  const dir = makeTopic({ goals: CAP_GOAL('c-read') });
  run('record-attempt.mjs', [dir, 'c-read', 'a-x/1', '--axes', MISS]);
  const r = run('record-attempt.mjs', [dir, 'c-read', 'a-x/1', '--outcome', outcome, ...note]);
  return { dir, r };
}

test('elsewhere meets the bar and schedules review in 3 days', () => {
  const { r } = setup('elsewhere', '--note', 'PS3');
  assert.equal(r.code, 0);
  assert.match(r.stdout, /bar met/);
  assert.match(r.stdout, /\(3 days\)/);
});

test('survey shows done elsewhere with the note', () => {
  const { dir } = setup('elsewhere', '--note', 'PS3');
  assert.match(lastFor(dir), /done elsewhere \(PS3\)/);
});

test('elsewhere with no note shows no parentheses', () => {
  const { dir } = setup('elsewhere');
  assert.match(lastFor(dir), /done elsewhere$/);
});

test('declared now shows as you said so', () => {
  const { dir } = setup('declared');
  assert.match(lastFor(dir), /you said so$/);
});
