import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTopic, run, CAP_GOAL } from './helpers.mjs';

test('declared after a miss meets the bar and schedules review in 3 days', () => {
  const dir = makeTopic({ goals: CAP_GOAL('c-read') });
  run('record-attempt.mjs', [dir, 'c-read', 'a-x/1', '--axes', '{"unaided":"yes","criterion":"not met"}']);
  const r = run('record-attempt.mjs', [dir, 'c-read', 'a-x/1', '--outcome', 'declared']);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /bar met/);
  assert.match(r.stdout, /\(3 days\)/);
});
