// A capability slug groups part-goals; survey reports them under it with a fraction.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTopic, run, survey, CAP_GOAL } from './helpers.mjs';

const PASS = '{"unaided":"yes","criterion":"met"}';
const CAP = '- **capability:** weigh-hosting-plans\n';

// Three parts of one capability and one plain goal, with the first part passed.
function setup() {
  const dir = makeTopic({
    goals: [
      CAP_GOAL('c-plain'),
      CAP_GOAL('c-p1', CAP),
      CAP_GOAL('c-p2', CAP),
      CAP_GOAL('c-p3', CAP),
    ].join('\n'),
    activities: '### a-x\n- **serves:** all\n',
  });
  run('record-attempt.mjs', [dir, 'c-p1', 'a-x/1', '--axes', PASS]);
  return dir;
}

test('a capability is counted in the group and every goal stays listed', () => {
  const s = survey(setup());
  const g = s.groups[0];
  assert.deepEqual(g.capabilities, [{ slug: 'weigh-hosting-plans', met: 1, total: 3 }]);
  assert.equal(g.goals.length, 4);
  assert.equal(g.goals.find((x) => x.id === 'c-plain').capability, '');
});

test('a retired part leaves both halves of the capability fraction', () => {
  const dir = setup();
  run('record-status.mjs', [dir, 'retired', 'c-p3', '--reason', 'x']);
  const g = survey(dir).groups[0];
  assert.deepEqual(g.capabilities, [{ slug: 'weigh-hosting-plans', met: 1, total: 2 }]);
  assert.equal(g.goals.length, 4);
});

test('--report prints the parts under their capability line', () => {
  const dir = setup();
  const r = run('survey.mjs', ['--dir', dir + '/..', dir, '--report']);
  const lines = r.stdout.split('\n');
  const head = lines.findIndex((l) => l.includes('weigh-hosting-plans 1/3'));
  assert.ok(head > 0, r.stdout);
  assert.ok(lines.findIndex((l) => l.includes('c-plain')) < head);
  for (const id of ['c-p1', 'c-p2', 'c-p3'])
    assert.ok(lines.findIndex((l) => l.includes(id)) > head, id);
});

test('a malformed slug is reported', () => {
  const dir = makeTopic({
    goals: CAP_GOAL('c-a', '- **capability:** Weigh_Plans\n') + '\n' +
      CAP_GOAL('c-b', '- **capability:** Weigh_Plans\n'),
  });
  assert.ok(
    survey(dir).problems.includes(
      "c-a has capability Weigh_Plans, which isn't a slug (two to four lower-case words with hyphens)"
    )
  );
});

test('a capability on one goal is reported as having one part', () => {
  const dir = makeTopic({ goals: CAP_GOAL('c-a', CAP) });
  assert.ok(survey(dir).problems.includes('capability weigh-hosting-plans has only one part (c-a)'));
});
