// migrate-words.mjs moves banked word questions out of legacy single-file banks into
// tasks/a-words/<goal-id>.md and retires the stamps and supply lines that served them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { makeTopic, run, survey, CAP_GOAL } from './helpers.mjs';
import { readFolderBanks } from '../../../quiz/tools/lib/bank.mjs';

const WORD = (id) =>
  `### \`${id}\`\n- **goal:** ${id}-word\n- **criterion:** vocabulary\n- **supply:** vocabulary\n` +
  `- **bar:** one production pass\n- **group:** vocabulary\n- **what it names:** a thing\n`;

const STAMP = (id, word) => `### ${id}\n- **checks:** ${word}\n- **origin:** generated\n\n`;
const CURATED = '### a-c\n- **serves:** c-x\n- **learner does:** things\n';

const TASK = (id, text) => `### ${id}\n\n${text}\n\n`;
const RUB = (id, goal, move) =>
  `### ${id}\n\n- **goal:** ${goal}\n- **move:** ${move}\n- **answer:** answer ${id}\n- **credit:** credit ${id}\n\n`;

function build({ onlyWords = false } = {}) {
  const dir = makeTopic({
    goals: [CAP_GOAL('c-x'), WORD('w-a'), WORD('w-b')].join('\n'),
    activities: '# Activities\n\n' + STAMP('a-w-a', 'w-a') + STAMP('a-w-b', 'w-b') + CURATED,
  });
  mkdirSync(join(dir, 'tasks'));
  mkdirSync(join(dir, 'rubrics'));
  const tasks = [TASK('q1', 'About a one.'), TASK('q2', 'About b.'), TASK('q3', 'About a two.')];
  const rubs = [RUB('q1', 'w-a', 'define'), RUB('q2', 'w-b', 'contrast'), RUB('q3', 'w-a', 'use')];
  if (!onlyWords) {
    tasks.push(TASK('q4', 'Do the thing.'));
    rubs.push(RUB('q4', 'c-x', 'apply'));
  }
  writeFileSync(join(dir, 'tasks/items.md'), '# Items\n\nIntro text.\n\n' + tasks.join(''));
  writeFileSync(join(dir, 'rubrics/items.md'), '# Rubrics\n\nKey text.\n\n' + rubs.join(''));
  return dir;
}

const read = (dir, p) => readFileSync(join(dir, p), 'utf8');
const problems = (dir) => survey(dir).problems;

test('moves each word question to its goal file, in order, and keeps the rest', () => {
  const dir = build();
  const r = run('migrate-words.mjs', [dir]);
  assert.equal(r.code, 0, r.stderr);

  assert.equal(read(dir, 'tasks/a-words/w-a.md'), '# w-a-word\n\n' + TASK('q1', 'About a one.') + TASK('q3', 'About a two.').trimEnd() + '\n');
  assert.equal(read(dir, 'rubrics/a-words/w-a.md'), '# Rubric: w-a-word\n\n' + RUB('q1', 'w-a', 'define') + RUB('q3', 'w-a', 'use').trimEnd() + '\n');
  assert.match(read(dir, 'tasks/a-words/w-b.md'), /^# w-b-word\n\n### q2\n/);
  assert.match(read(dir, 'rubrics/a-words/w-b.md'), /^# Rubric: w-b-word\n\n### q2\n/);

  assert.equal(read(dir, 'tasks/items.md'), '# Items\n\nIntro text.\n\n' + TASK('q4', 'Do the thing.'));
  assert.equal(read(dir, 'rubrics/items.md'), '# Rubrics\n\nKey text.\n\n' + RUB('q4', 'c-x', 'apply'));

  const acts = read(dir, 'activities.md');
  assert.match(acts, /### `a-words`\n\n- \*\*serves:\*\* group vocabulary/);
  assert.doesNotMatch(acts, /a-w-/);
  assert.ok(acts.includes(CURATED));
  assert.doesNotMatch(read(dir, 'goals.md'), /supply/);

  const { items } = readFolderBanks(dir);
  assert.deepEqual(items.map((i) => i.label), ['a-words/w-a/q1', 'a-words/w-a/q3', 'a-words/w-b/q2']);
  assert.deepEqual(items.map((i) => i.goals), [['w-a'], ['w-a'], ['w-b']]);
  assert.deepEqual(items.map((i) => i.move), ['define', 'use', 'contrast']);
});

test('a second run refuses and changes nothing', () => {
  const dir = build();
  run('migrate-words.mjs', [dir]);
  const before = [read(dir, 'tasks/items.md'), read(dir, 'activities.md'), read(dir, 'tasks/a-words/w-a.md')];
  const r = run('migrate-words.mjs', [dir]);
  assert.equal(r.code, 1);
  assert.deepEqual([read(dir, 'tasks/items.md'), read(dir, 'activities.md'), read(dir, 'tasks/a-words/w-a.md')], before);
});

test('--dry-run prints the summary and writes nothing', () => {
  const dir = build();
  const before = read(dir, 'tasks/items.md');
  const r = run('migrate-words.mjs', [dir, '--dry-run']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /w-a/);
  assert.match(r.stdout, /a-words/);
  assert.equal(existsSync(join(dir, 'tasks/a-words')), false);
  assert.equal(read(dir, 'tasks/items.md'), before);
  assert.match(read(dir, 'goals.md'), /supply/);
});

test('a legacy pair holding only word questions is deleted', () => {
  const dir = build({ onlyWords: true });
  const r = run('migrate-words.mjs', [dir]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(existsSync(join(dir, 'tasks/items.md')), false);
  assert.equal(existsSync(join(dir, 'rubrics/items.md')), false);
});

test('a bad flag is refused', () => {
  const r = run('migrate-words.mjs', [build(), '--dry-rn']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /not a flag/);
});

test('survey reports nothing new after migration', () => {
  const dir = build();
  const before = problems(dir);
  run('migrate-words.mjs', [dir]);
  const after = problems(dir);
  for (const p of after) assert.ok(before.includes(p), `new problem: ${p}`);
});
