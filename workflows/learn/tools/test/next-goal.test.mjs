// next-goal.mjs picks a random open goal from the first set that has one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { makeTopic, run } from './helpers.mjs';

const word = (id) => `### \`${id}\`\n- **goal:** x\n- **criterion:** vocabulary\n- **group:** vocabulary\n`;

function topic(ids, sequence) {
  // One activity serving the whole group, so every goal has something live unless a test says not.
  const dir = makeTopic({
    goals: ids.map(word).join('\n'),
    activities: '### `a-words`\n\n- **serves:** group vocabulary\n',
  });
  if (sequence !== undefined) {
    const file = join(dir, 'goals.md');
    writeFileSync(file, readFileSync(file, 'utf8') + `\n## Sequence\n\n${sequence}\n`);
  }
  return dir;
}
const pick = (dir, ...skips) => run('next-goal.mjs', [dir, ...skips.flatMap((id) => ['--skip', id])]);
const goalOf = (r) => r.stdout.match(/^goal: (\S+)$/m)?.[1];
const meet = (dir, id) => {
  const r = run('record-attempt.mjs', [dir, id, 'a-x/1', '--axes', '{"unaided":"yes","criterion":"met"}']);
  assert.equal(r.code, 0, r.stderr);
};
const status = (dir, ...args) => {
  const r = run('record-status.mjs', [dir, ...args]);
  assert.equal(r.code, 0, r.stderr);
};

test('chooses only from the current set, and says which set', () => {
  const dir = topic(['w-a', 'w-b', 'w-c'], '1. w-a, w-b\n2. w-c');
  for (let i = 0; i < 10; i++) {
    const r = pick(dir);
    assert.equal(r.code, 0, r.stderr);
    assert.ok(['w-a', 'w-b'].includes(goalOf(r)), r.stdout);
    assert.match(r.stdout, /^set: 1 of 2$/m);
    assert.doesNotMatch(r.stdout, /not decided/);
  }
});

test('never a met, deferred or retired goal, and reaches every open one', () => {
  const dir = topic(['w-a', 'w-b', 'w-c', 'w-d', 'w-e'], '1. vocabulary');
  meet(dir, 'w-a');
  status(dir, 'deferred', 'w-b', '--where', 'elsewhere');
  status(dir, 'retired', 'w-c', '--reason', 'x');
  const seen = new Set();
  for (let i = 0; i < 50; i++) seen.add(goalOf(pick(dir)));
  assert.deepEqual([...seen].sort(), ['w-d', 'w-e']);
});

test('moves past a set whose open goals are all deferred', () => {
  const dir = topic(['w-a', 'w-b'], '1. w-a\n2. w-b');
  status(dir, 'deferred', 'w-a', '--where', 'elsewhere');
  const r = pick(dir);
  assert.equal(goalOf(r), 'w-b');
  assert.match(r.stdout, /^set: 2 of 2$/m);
});

test('an undecided sequence is said, and still picks', () => {
  const r = pick(topic(['w-a']));
  assert.equal(goalOf(r), 'w-a');
  assert.match(r.stdout, /^sequence: not decided yet$/m);
});

test('exits 2 when nothing is open', () => {
  const dir = topic(['w-a'], '1. vocabulary');
  meet(dir, 'w-a');
  const r = pick(dir);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /nothing open in topic/);
});

test('--skip moves on within a set, and past a set whose only open goal is skipped', () => {
  const dir = topic(['w-a', 'w-b', 'w-c'], '1. w-a, w-b\n2. w-c');
  for (let i = 0; i < 10; i++) assert.equal(goalOf(pick(dir, 'w-a')), 'w-b');
  const r = pick(dir, 'w-a', 'w-b');
  assert.equal(goalOf(r), 'w-c');
  assert.match(r.stdout, /^set: 2 of 2$/m);
  assert.equal(pick(dir, 'w-a', 'w-b', 'w-c').code, 2);
});

test('a goal with nothing live to study is never picked, and its set is passed over', () => {
  const dir = topic(['w-a', 'w-b', 'w-c'], '1. w-a\n2. w-b, w-c');
  writeFileSync(join(dir, 'activities.md'), '### `a-one`\n\n- **serves:** w-b\n');
  const r = pick(dir);
  assert.equal(goalOf(r), 'w-b');
  assert.match(r.stdout, /^set: 2 of 2$/m);
  for (let i = 0; i < 20; i++) assert.equal(goalOf(pick(dir)), 'w-b');
});

test('a group-wide activity or a bank question makes goals live', () => {
  const dir = topic(['w-a', 'w-b'], '1. vocabulary');
  const seen = new Set();
  for (let i = 0; i < 50; i++) seen.add(goalOf(pick(dir)));
  assert.deepEqual([...seen].sort(), ['w-a', 'w-b']);
  const banked = topic(['w-a', 'w-b'], '1. vocabulary');
  rmSync(join(banked, 'activities.md'));
  mkdirSync(join(banked, 'tasks', 'act'), { recursive: true });
  mkdirSync(join(banked, 'rubrics', 'act'), { recursive: true });
  writeFileSync(join(banked, 'tasks', 'act', 's1.md'), '### q1\n\nWhat?\n');
  writeFileSync(join(banked, 'rubrics', 'act', 's1.md'), 'Key.\n\n### q1\n\n- **goal:** w-b\n- **type:** free\n- **answer:** x\n');
  for (let i = 0; i < 10; i++) assert.equal(goalOf(pick(banked)), 'w-b');
});

test('bad arguments are refused', () => {
  assert.equal(run('next-goal.mjs', []).code, 1);
  assert.equal(run('next-goal.mjs', ['--nope', 'x']).code, 1);
  const dir = topic(['w-a'], '1. vocabulary');
  assert.equal(pick(dir, 'w-nope').code, 1);
  assert.equal(run('next-goal.mjs', [dir, '--skip']).code, 1);
});

test('a folder with no goals.md is a usage error, not nothing open', () => {
  const dir = topic(['w-a']);
  rmSync(join(dir, 'goals.md'));
  assert.equal(pick(dir).code, 1);
});
