import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTopic, run, survey, CAP_GOAL } from './helpers.mjs';

const PASS = '{"unaided":"yes","criterion":"met"}';

// Two required goals and one live activity serving both, so the phase is never `in curation`.
function setup() {
  return makeTopic({
    goals: CAP_GOAL('c-a') + '\n' + CAP_GOAL('c-b'),
    activities: '### a-x\n- **serves:** c-a, c-b\n',
  });
}

const defer = (dir) => run('record-status.mjs', [dir, 'deferred', 'c-b', '--where', 'PS3']);
const pass = (dir, goal) => run('record-attempt.mjs', [dir, goal, 'a-x/1', '--axes', PASS]);
const row = (s, id) => s.groups.flatMap((g) => g.goals).find((g) => g.id === id);

test('a deferred goal is listed after unmet and stays in the fraction', () => {
  const dir = setup();
  defer(dir);
  const s = survey(dir);
  assert.equal(s.phase, 'studying');
  assert.equal(s.groups[0].total, 2);
  assert.equal(s.groups[0].met, 0);
  assert.deepEqual(s.groups[0].goals.map((g) => g.id), ['c-a', 'c-b']);
  assert.equal(row(s, 'c-b').deferred, 'PS3');
});

test('everything else met makes the phase waiting elsewhere', () => {
  const dir = setup();
  defer(dir);
  pass(dir, 'c-a');
  assert.equal(survey(dir).phase, 'waiting elsewhere');
});

test('elsewhere on the deferred goal finishes the topic', () => {
  const dir = setup();
  defer(dir);
  pass(dir, 'c-a');
  run('record-attempt.mjs', [dir, 'c-b', 'elsewhere', '--outcome', 'elsewhere', '--note', 'PS3']);
  const s = survey(dir);
  assert.equal(s.phase, 'nothing pending');
  assert.equal(row(s, 'c-b').deferred, null);
});

test('resumed puts the goal back to studying', () => {
  const dir = setup();
  defer(dir);
  pass(dir, 'c-a');
  run('record-status.mjs', [dir, 'resumed', 'c-b']);
  assert.equal(survey(dir).phase, 'studying');
});

test('a deferred goal later passed shows as met', () => {
  const dir = setup();
  defer(dir);
  pass(dir, 'c-b');
  const c = row(survey(dir), 'c-b');
  assert.equal(c.met, true);
  assert.equal(c.deferred, null);
});

test('retired wins over deferred', () => {
  const dir = setup();
  defer(dir);
  run('record-status.mjs', [dir, 'retired', 'c-b', '--reason', 'x']);
  let s = survey(dir);
  assert.equal(s.groups[0].total, 1);
  assert.equal(row(s, 'c-b').deferred, null);
  pass(dir, 'c-a');
  assert.equal(survey(dir).phase, 'nothing pending');
});

test('report prints the deferral', () => {
  const dir = setup();
  defer(dir);
  const r = run('survey.mjs', ['--dir', dir + '/..', dir, '--report']);
  assert.match(r.stdout, /c-b.*deferred: PS3/);
});
