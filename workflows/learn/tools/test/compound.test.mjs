// A compound is served whole: next-item prints its stem and every lettered part in the learner's
// section and each part's key in the key section, and judge-input prints the same text for the
// judge, under the compound's one goal. See lib/item.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { makeTopic, run, CAP_GOAL } from './helpers.mjs';

const RUBRIC_B = 'the Revise step Full for naming Revise; half for describing it without its name.';

function topic() {
  const dir = makeTopic({ goals: CAP_GOAL('c-a'), activities: '### a-x\n- **checks:** c-a\n' });
  const files = {
    'tasks/a-x/s1.md': [
      'The app: Crumbs.',
      '',
      '### q1',
      '',
      'The agent\'s summary says these things about the "Review plan" task.',
      '',
      '#### a',
      '',
      '"It runs only after the plan is written."',
      '',
      '1. True',
      '2. False',
      '',
      '#### b',
      '',
      'Name the element that sends its output back to the author.',
      '',
    ].join('\n'),
    'rubrics/a-x/s1.md': [
      'Review comes before revision.',
      '',
      '### q1',
      '',
      '- **goal:** c-a',
      '- **type:** compound',
      '',
      '#### a',
      '',
      '- **type:** mcq',
      '- **answer:** 1',
      '- **tutor note:** Watch for a learner reading "only" loosely.',
      '',
      '#### b',
      '',
      '- **answer:** the Revise step',
      '- **credit:** full for naming Revise; half for describing it without its name.',
      '- **tutor note:** Revise is the loop back.',
      '',
    ].join('\n'),
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

const LEARNER = [
  'The app: Crumbs.',
  '',
  'The agent\'s summary says these things about the "Review plan" task.',
  '',
  '(a) "It runs only after the plan is written."',
  '1. True',
  '2. False',
  '',
  '(b) Name the element that sends its output back to the author.',
].join('\n');

// The scenario key once, then each part's key, then the lettered tutor notes. Part b's rubric is
// printed without the scenario key the bank prepends to it, since the key already heads the text.
const KEY = [
  'Review comes before revision.',
  '(a) 1. True',
  `(b) ${RUBRIC_B}`,
  '--- tutor note ---',
  '(a) Watch for a learner reading "only" loosely.',
  '(b) Revise is the loop back.',
].join('\n');

test('next-item prints the stem and every part to the learner, and each part key after', () => {
  const r = run('next-item.mjs', [topic(), '--activity', 'a-x', '--key']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /^label: a-x\/s1\/q1$/m);
  assert.match(r.stdout, /^goals: c-a$/m);
  const [before, after] = r.stdout.split('\n--- key ---\n');
  const learner = before.split('--- learner sees ---\n')[1];
  assert.equal(learner, LEARNER);
  for (const hidden of ['the Revise step', 'Watch for', 'loop back']) assert.ok(!before.includes(hidden), hidden);
  assert.equal(after, `${KEY}\n`);
});

test('judge-input prints the same question and rubric under the compound\'s one goal', () => {
  const r = run('judge-input.mjs', [topic(), 'a-x/s1/q1']);
  assert.equal(r.code, 0, r.stderr);
  const [head, ...rest] = r.stdout.split('\n');
  assert.deepEqual(JSON.parse(head), { goal: 'c-a', criterion: 'The thing is done.', label: 'a-x/s1/q1' });
  assert.equal(rest.join('\n'), `--- question ---\n${LEARNER}\n--- rubric ---\n${KEY}\n`);
});
