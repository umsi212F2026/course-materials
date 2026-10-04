// next-goal.mjs picks a random open goal from the first set that has one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeTopic, run } from './helpers.mjs';

const word = (id) => `### \`${id}\`\n- **goal:** x\n- **criterion:** vocabulary\n- **group:** vocabulary\n`;

function topic(ids, sequence) {
  const dir = makeTopic({ goals: ids.map(word).join('\n') });
  if (sequence !== undefined) {
    const file = join(dir, 'goals.md');
    writeFileSync(file, readFileSync(file, 'utf8') + `\n## Sequence\n\n${sequence}\n`);
  }
  return dir;
}
const pick = (dir) => run('next-goal.mjs', [dir]);
const goalOf = (r) => r.stdout.match(/^goal: (\S+)$/m)?.[1];
const meet = (dir, id) =>
  run('record-attempt.mjs', [dir, id, 'a-x/1', '--axes', '{"unaided":"yes","criterion":"met"}']);

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
  run('record-status.mjs', [dir, 'deferred', 'w-b', '--where', 'elsewhere']);
  run('record-status.mjs', [dir, 'retired', 'w-c', '--reason', 'x']);
  const seen = new Set();
  for (let i = 0; i < 50; i++) seen.add(goalOf(pick(dir)));
  assert.deepEqual([...seen].sort(), ['w-d', 'w-e']);
});

test('moves past a set whose open goals are all deferred', () => {
  const dir = topic(['w-a', 'w-b'], '1. w-a\n2. w-b');
  run('record-status.mjs', [dir, 'deferred', 'w-a', '--where', 'elsewhere']);
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

test('bad arguments are refused', () => {
  assert.equal(run('next-goal.mjs', []).code, 1);
  assert.equal(run('next-goal.mjs', ['--nope', 'x']).code, 1);
});
