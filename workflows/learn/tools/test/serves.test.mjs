// An activity's `serves` may name a whole group, so a word added later is covered without an
// edit to activities.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeTopic, run, CAP_GOAL } from './helpers.mjs';
import { readActivities, idProblems } from '../lib/topic.mjs';

const WORD = (id) => CAP_GOAL(id, '- **group:** vocabulary\n');
const goals = [WORD('w-a'), WORD('w-b'), CAP_GOAL('c-x')].join('\n');
const topic = (serves) => makeTopic({ goals, activities: `### a-x\n- **serves:** ${serves}\n` });

test('serves: group <name> expands to the ids of that group, in goals.md order', () => {
  const [e] = readActivities(topic('group vocabulary'));
  assert.deepEqual(e.serves, ['w-a', 'w-b']);
  assert.deepEqual(e.servesGroups, ['vocabulary']);
});

test('a word added afterwards is covered with no edit to activities.md', () => {
  const dir = topic('group vocabulary');
  appendFileSync(join(dir, 'goals.md'), `\n${WORD('w-c')}`);
  assert.deepEqual(readActivities(dir)[0].serves, ['w-a', 'w-b', 'w-c']);
});

test('ids and a group mix in one serves list', () => {
  assert.deepEqual(readActivities(topic('c-x, group vocabulary'))[0].serves, ['c-x', 'w-a', 'w-b']);
});

test('a group no goal is in is a problem, and its token is not reported as an unknown id', () => {
  const found = idProblems(topic('group nonsense'));
  assert.ok(found.includes('a-x serves group nonsense, which no goal is in'));
  assert.ok(!found.some((p) => p.includes('is not in goals.md')));
});

test('a group that has goals raises no problem', () => {
  assert.ok(!idProblems(topic('group vocabulary')).some((p) => p.startsWith('a-x')));
});

test('a retired goal in the group is still in the expansion', () => {
  const dir = topic('group vocabulary');
  run('record-status.mjs', [dir, 'retired', 'w-a', '--reason', 'x']);
  assert.deepEqual(readActivities(dir)[0].serves, ['w-a', 'w-b']);
});
