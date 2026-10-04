// The supply slot is retired and stamped `origin: generated` entries are legacy: an old goals.md
// or activities.md carrying either must still read cleanly and report nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { makeTopic, run, survey, CAP_GOAL } from './helpers.mjs';
import { readGoals, liveActivities } from '../lib/topic.mjs';

const WORD = (id, supply) =>
  `### \`${id}\`\n- **goal:** word ${id}\n- **criterion:** vocabulary\n- **supply:** ${supply}\n` +
  `- **bar:** one production pass\n- **group:** vocabulary\n- **what it names:** a thing\n`;

// The helper topic has no status.jsonl events, which survey reports; that is not what is tested.
const problems = (dir) => survey(dir).problems.filter((p) => !p.includes('status.jsonl'));

const STAMP = (id, word) =>
  `### ${id}\n- **checks:** ${word}\n- **origin:** generated\n`;

for (const value of ['vocabulary', 'nonsense'])
  test(`a supply line (${value}) is ignored: no key, no problem, no payload`, () => {
    const dir = makeTopic({ goals: CAP_GOAL('c-x') + '\n' + WORD('w-a', value), activities: '### a-x\n- **serves:** c-x\n' });
    const goal = readGoals(dir).goals.find((g) => g.id === 'w-a');
    assert.equal('supply' in goal, false);
    assert.equal('supply' in goal.payload, false);
    assert.deepEqual(problems(dir), []);
  });

test('a stamp entry is not live and raises no problem', () => {
  const dir = makeTopic({
    goals: CAP_GOAL('c-x') + '\n' + WORD('w-a', 'vocabulary'),
    activities: '### a-x\n- **serves:** c-x\n\n' + STAMP('a-w-a', 'w-a'),
  });
  assert.deepEqual(liveActivities(dir).map((e) => e.id), ['a-x']);
  assert.deepEqual(problems(dir), []);
});

test('words served only by stamps do not make a topic in curation', () => {
  const dir = makeTopic({
    goals: CAP_GOAL('c-x') + '\n' + WORD('w-a', 'vocabulary'),
    activities: '### a-x\n- **serves:** c-x\n\n' + STAMP('a-w-a', 'w-a'),
  });
  assert.equal(survey(dir).phase, 'studying');
});

test('new-word.mjs writes no supply line', () => {
  const parent = mkdtempSync(join(tmpdir(), 'learn-test-'));
  const dir = join(parent, 'area-1');
  mkdirSync(dir);
  writeFileSync(join(dir, 'goals.md'), '# Topic\n\n## Goals\n\n');
  const r = run('new-word.mjs', ['--dir', parent, 'area', 'a word', 'w-thing']);
  assert.equal(r.code, 0, r.stderr);
  const text = readFileSync(join(dir, 'goals.md'), 'utf8');
  assert.match(text, /w-thing/);
  assert.doesNotMatch(text, /supply/);
});

test('review-due.mjs items carry no supply field', () => {
  const dir = makeTopic({
    goals: CAP_GOAL('c-x') + '\n' + WORD('w-a', 'vocabulary'),
    activities: '### a-x\n- **serves:** c-x\n',
  });
  const at = new Date(Date.now() - 4 * 86400000).toISOString();
  mkdirSync(join(dir, 'evidence'));
  writeFileSync(
    join(dir, 'evidence', 'attempts.jsonl'),
    JSON.stringify({ at, goal: 'w-a', label: 'M: x', tags: ['production'], source: 'test', unaided: 'yes', criterion: 'met' }) + '\n'
  );
  const r = run('review-due.mjs', ['--dir', dirname(dir)]);
  assert.equal(r.code, 0, r.stderr);
  const items = JSON.parse(r.stdout);
  assert.equal(items.length, 1);
  assert.deepEqual(Object.keys(items[0]).sort(), ['adjudicator', 'due', 'goal', 'served', 'topic']);
});
