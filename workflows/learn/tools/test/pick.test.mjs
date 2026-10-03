import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pick } from '../lib/pick.mjs';
import { makeTopic, run, survey, CAP_GOAL } from './helpers.mjs';

const item = (label, goals = ['g1']) => {
  const [activity, scenario, id] = label.split('/');
  return { activity, scenario, id, label, goals };
};
const seen = (label, at) => ({ at, goal: 'g1', label });

const A1 = item('a-x/s1/q1');
const A2 = item('a-x/s1/q2');
const B1 = item('a-x/s2/q1');

test('nothing served: the first item in bank order, not a repeat', () => {
  const r = pick([A1, A2], [], { goal: 'g1' });
  assert.equal(r.item.label, 'a-x/s1/q1');
  assert.equal(r.repeat, false);
  assert.equal(r.lastServed, null);
});

test('an unserved item beats a served one', () => {
  const r = pick([A1, A2], [seen('a-x/s1/q1', '2026-10-01T10:00:00Z')], { goal: 'g1' });
  assert.equal(r.item.label, 'a-x/s1/q2');
  assert.equal(r.repeat, false);
});

test('all served: the oldest latest-at, a repeat, with that date', () => {
  const log = [
    seen('a-x/s1/q1', '2026-10-03T10:00:00Z'),
    seen('a-x/s1/q2', '2026-10-01T10:00:00Z'),
    seen('a-x/s1/q2', '2026-10-05T10:00:00Z'),
    seen('a-x/s1/q1', '2026-10-02T10:00:00Z'),
  ];
  const r = pick([A1, A2], log, { goal: 'g1' });
  assert.equal(r.item.label, 'a-x/s1/q1');
  assert.equal(r.repeat, true);
  assert.equal(r.lastServed, '2026-10-03T10:00:00Z');
});

test('after prefers an unseen item in the same scenario group', () => {
  const r = pick([A1, B1], [], { goal: 'g1', after: 'a-x/s2/q9' });
  assert.equal(r.item.label, 'a-x/s2/q1');
});

test('goal and activity filters', () => {
  const other = item('b-y/s1/q1', ['g2']);
  assert.equal(pick([other, A1], [], { goal: 'g1' }).item.label, 'a-x/s1/q1');
  assert.equal(pick([A1, other], [], { activity: 'b-y' }).item.label, 'b-y/s1/q1');
});

test('log lines that match no candidate are ignored', () => {
  const r = pick([A1, A2], [{ at: '2026-10-01T10:00:00Z', goal: 'g1', label: 'CATCH: subject/verb agreement' }], { goal: 'g1' });
  assert.equal(r.item.label, 'a-x/s1/q1');
  assert.equal(r.repeat, false);
});

test('no candidates gives null', () => {
  assert.equal(pick([A1], [], { goal: 'nope' }), null);
});

test('a goal-less item ranks after every goal-bearing one under --activity', () => {
  const practice = item('a-x/s1/q0', []);
  const r = pick([practice, A1], [], { activity: 'a-x' });
  assert.equal(r.item.label, 'a-x/s1/q1');
  assert.equal(pick([practice], [], { activity: 'a-x' }).item.label, 'a-x/s1/q0');
});

function bank(dir) {
  const put = (rel, text) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  put('tasks/a-x/crumbs.md', '### v1\n\nName a risk.\n');
  put('rubrics/a-x/crumbs.md', '### v1\n\n- **goal:** g-one\n- **answer:** Cost.\n- **tutor note:** Push on scope.\n');
}

test('CLI prints the label, repeat line and learner view', () => {
  const dir = makeTopic({ goals: CAP_GOAL('g-one') });
  bank(dir);
  const r = run('next-item.mjs', [dir, '--goal', 'g-one']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /label: a-x\/crumbs\/v1/);
  assert.match(r.stdout, /repeat: no/);
  assert.match(r.stdout, /--- learner sees ---\nName a risk\./);
  assert.doesNotMatch(r.stdout, /--- key ---/);
});

test('CLI --key adds the key and the tutor note', () => {
  const dir = makeTopic({ goals: CAP_GOAL('g-one') });
  bank(dir);
  const r = run('next-item.mjs', [dir, '--goal', 'g-one', '--key']);
  assert.match(r.stdout, /--- key ---\nCost\./);
  assert.match(r.stdout, /--- tutor note ---\nPush on scope\./);
});

test('CLI with an unknown goal exits 2 with the message', () => {
  const dir = makeTopic({ goals: CAP_GOAL('g-one') });
  bank(dir);
  const r = run('next-item.mjs', [dir, '--goal', 'nope']);
  assert.equal(r.code, 2);
  assert.match(r.stderr + r.stdout, /no bank questions for nope; run the activity's generator live/);
});

test('CLI never serves a dropped activity or a folder with no entry', () => {
  const dir = makeTopic({
    goals: CAP_GOAL('g-one'),
    activities: '### a-x\n- **checks:** g-one\n- **status:** dropped\n',
  });
  bank(dir);
  assert.equal(run('next-item.mjs', [dir, '--goal', 'g-one']).code, 2);
  const orphan = makeTopic({ goals: CAP_GOAL('g-one'), activities: '### a-other\n- **checks:** g-one\n' });
  bank(orphan);
  assert.equal(run('next-item.mjs', [orphan, '--goal', 'g-one']).code, 2);
});

test('CLI serves a folder whose activity has a live entry', () => {
  const dir = makeTopic({ goals: CAP_GOAL('g-one'), activities: '### a-x\n- **checks:** g-one\n' });
  bank(dir);
  const r = run('next-item.mjs', [dir, '--goal', 'g-one']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /label: a-x\/crumbs\/v1/);
});

test('survey reports a tasks folder with no entry in activities.md, and only folders', () => {
  const dir = makeTopic({ goals: CAP_GOAL('g-one'), activities: '### a-other\n- **checks:** g-one\n' });
  bank(dir);
  writeFileSync(join(dir, 'tasks', 'a-single.md'), '### v1\n\nA single-file bank.\n');
  const { problems } = survey(dir);
  assert.ok(problems.includes('tasks/a-x/ is a bank with no entry in activities.md'), problems.join('\n'));
  assert.ok(!problems.some((p) => p.includes('a-single')), problems.join('\n'));
  const live = makeTopic({ goals: CAP_GOAL('g-one'), activities: '### a-x\n- **checks:** g-one\n' });
  bank(live);
  assert.ok(!survey(live).problems.some((p) => p.includes('no entry in activities.md')));
});

test('CLI --key on an mcq prints the scenario key and the numbered correct choice', () => {
  const dir = makeTopic({ goals: CAP_GOAL('g-one') });
  const put = (rel, text) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  put('tasks/a-x/kettle.md', '# K\n\nA kettle app.\n\n### m1\n\nWhich?\n\n1. Kettle sleeps\n2. Kettle never sleeps\n');
  put('rubrics/a-x/kettle.md', '# K key\n\nMust name: sleep.\n\n### m1\n\n- **goal:** g-one\n- **type:** mcq\n- **answer:** 2\n');
  const r = run('next-item.mjs', [dir, '--goal', 'g-one', '--key']);
  assert.match(r.stdout, /--- key ---\nMust name: sleep\.\n2\. Kettle never sleeps/);
});
