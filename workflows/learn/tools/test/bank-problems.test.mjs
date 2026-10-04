import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { makeTopic, survey, CAP_GOAL } from './helpers.mjs';

const goals = CAP_GOAL('g-one') + '\n' + CAP_GOAL('g-two');

// One folder bank, a-x/s1/q1, with the given task text and rubric entry. makeTopic leaves one
// baseline problem in status.jsonl, so every test asserts on specific messages.
function topic(rubric, task = '### q1\n\nName it.\n') {
  const dir = makeTopic({ goals, activities: '### a-x\n- **checks:** g-one, g-two\n' });
  const put = (rel, text) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  put('tasks/a-x/s1.md', task);
  put('rubrics/a-x/s1.md', rubric);
  return survey(dir).problems;
}

test('a problem readFolderBanks reports reaches survey, verbatim', () => {
  const found = topic('### other\n\n- **goal:** g-one\n- **answer:** Cost.\n');
  assert.ok(found.includes('a-x/s1/q1 is in tasks/a-x/s1.md with no rubric entry, so nothing could grade it'), found.join('\n'));
});

test('a goal id not in goals.md is reported', () => {
  const found = topic('### q1\n\n- **goal:** g-nope\n- **answer:** Cost.\n');
  assert.ok(found.includes('a-x/s1/q1 names goal g-nope, which is not in goals.md'), found.join('\n'));
});

test('a two-goal question with credit for both raises nothing', () => {
  const found = topic('### q1\n\n- **goal:** g-one, g-two\n- **answer:** Cost.\n- **credit:**\n  - `g-one`: names the cost.\n  - `g-two`: names the owner.\n');
  assert.ok(!found.some((p) => p.includes('a-x/s1/q1')), found.join('\n'));
});

test('a two-goal question with credit for one names the goal left out', () => {
  const found = topic('### q1\n\n- **goal:** g-one, g-two\n- **answer:** Cost.\n- **credit:**\n  - `g-one`: names the cost.\n');
  assert.ok(found.includes('a-x/s1/q1 names goals g-one, g-two but its credit has no statement for g-two'), found.join('\n'));
  assert.ok(!found.some((p) => p.includes('no statement for g-one')), found.join('\n'));
});

test('a scenario key naming a goal does not stand in for its missing credit statement', () => {
  const found = topic('`g-two`: the owner matters here.\n\n### q1\n\n- **goal:** g-one, g-two\n- **answer:** Cost.\n- **credit:**\n  - `g-one`: names the cost.\n');
  assert.ok(found.includes('a-x/s1/q1 names goals g-one, g-two but its credit has no statement for g-two'), found.join('\n'));
});

// A LEGACY tasks/<dir>/ (no rubrics/<dir>/ at all) is a study artifact, not a broken bank. With
// an entry it is clean; without one it is still an orphan folder.
function legacy(activities) {
  const dir = makeTopic({ goals, activities });
  mkdirSync(join(dir, 'tasks/a-old'), { recursive: true });
  writeFileSync(join(dir, 'tasks/a-old/notes.md'), '### q1\n\nQ.\n');
  return survey(dir).problems;
}

test('a legacy tasks folder with an entry and no rubrics folder raises nothing', () => {
  const found = legacy('### a-old\n- **checks:** g-one\n');
  assert.ok(!found.some((p) => p.includes('a-old')), found.join('\n'));
});

test('a legacy tasks folder with no entry is still an orphan', () => {
  const found = legacy('### a-x\n- **checks:** g-one\n');
  assert.ok(found.includes('tasks/a-old/ is a bank with no entry in activities.md'), found.join('\n'));
  assert.ok(!found.some((p) => p.includes('rubric')), found.join('\n'));
});

test('a single-goal question with plain credit raises nothing', () => {
  const found = topic('### q1\n\n- **goal:** g-one\n- **answer:** Cost.\n- **credit:** Names the cost.\n');
  assert.ok(!found.some((p) => p.includes('a-x/s1/q1')), found.join('\n'));
});
