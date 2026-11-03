// A compound is served whole: next-item prints its stem and every lettered part in the learner's
// section and each part's key in the key section, and judge-input prints the same text for the
// judge, under the compound's one goal. See lib/item.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { makeTopic, run, CAP_GOAL } from './helpers.mjs';

const RUBRIC_B = 'the Revise step Full for naming Revise; half for describing it without its name.';

// What next-item --key prints after a compound with an open part: the key, then the criterion and
// the ruling rules. judge-input still prints the bare KEY, so the two are kept apart.
const RULING_BLOCK = [
  '--- criterion ---',
  'c-a: The thing is done.',
  '--- ruling ---',
  'Rule against the criterion as written, not a better one you can see.',
  'Half credit is not met.',
  'unclear is for a genuine tie, in either direction.',
  'Anything that changed what they did is help. Clarifying which question was meant, or repeating it, is not.',
  'Rule on what they wrote, not on how the session went.',
].join('\n');

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
  assert.equal(after, `${KEY}\n${RULING_BLOCK}\n`);
});

test('judge-input prints the same question and rubric under the compound\'s one goal', () => {
  const r = run('judge-input.mjs', [topic(), 'a-x/s1/q1']);
  assert.equal(r.code, 0, r.stderr);
  const [head, ...rest] = r.stdout.split('\n');
  assert.deepEqual(JSON.parse(head), { goal: 'c-a', criterion: 'The thing is done.', label: 'a-x/s1/q1' });
  assert.equal(rest.join('\n'), `--- question ---\n${LEARNER}\n--- rubric ---\n${KEY}\n`);
});

// A topic of one scenario per activity, each file written as given.
function topicOf(files) {
  const ids = [...new Set(Object.keys(files).map((p) => p.split('/')[1]))];
  const dir = makeTopic({ goals: CAP_GOAL('c-a'), activities: ids.map((id) => `### ${id}\n- **checks:** c-a\n`).join('\n') });
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

// No setup, no stem, no scenario key: the text opens on part (a), each free part's rubric is
// printed whole, and a tutor note on the question comes first, unlettered.
const BARE = {
  'tasks/a-y/bare.md': '### q1\n\n#### a\n\nName the first step.\n\n#### b\n\nName the last step.\n',
  'rubrics/a-y/bare.md': [
    '### q1',
    '',
    '- **goal:** c-a',
    '- **type:** compound',
    '- **tutor note:** Both come from the same diagram.',
    '',
    '#### a',
    '',
    '- **answer:** Draft',
    '- **credit:** full for Draft.',
    '',
    '#### b',
    '',
    '- **answer:** Publish',
    '- **tutor note:** Not Review.',
    '',
  ].join('\n'),
};
const BARE_LEARNER = '(a) Name the first step.\n\n(b) Name the last step.';
const BARE_KEY = [
  '(a) Draft Full for Draft.',
  '(b) Publish',
  '--- tutor note ---',
  'Both come from the same diagram.',
  '(b) Not Review.',
].join('\n');

test('a compound with no stem and no scenario key: no leading blank line, rubrics whole, question note first', () => {
  const dir = topicOf(BARE);
  const r = run('next-item.mjs', [dir, '--activity', 'a-y', '--key']);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(r.stdout.includes(`--- learner sees ---\n${BARE_LEARNER}\n--- key ---\n${BARE_KEY}\n${RULING_BLOCK}\n`), r.stdout);
  const j = run('judge-input.mjs', [dir, 'a-y/bare/q1']);
  assert.equal(j.code, 0, j.stderr);
  assert.ok(j.stdout.endsWith(`--- question ---\n${BARE_LEARNER}\n--- rubric ---\n${BARE_KEY}\n`), j.stdout);
});

// The framing heads the first question served from its scenario, above the compound's setup and
// stem, and never reaches the judge.
test('a framed compound: framing once above the stem in next-item, absent from judge-input', () => {
  const framing = 'Each question is a separate decision.';
  const dir = topicOf({
    'tasks/a-z/f.md': `The app: Crumbs.\n\n## Framing\n\n${framing}\n\n### q1\n\nAbout the plan.\n\n#### a\n\nFirst?\n\n#### b\n\nLast?\n`,
    'rubrics/a-z/f.md': '### q1\n\n- **goal:** c-a\n- **type:** compound\n\n#### a\n\n- **answer:** Draft\n\n#### b\n\n- **answer:** Publish\n',
  });
  const r = run('next-item.mjs', [dir, '--activity', 'a-z']);
  assert.equal(r.code, 0, r.stderr);
  const learner = r.stdout.split('--- learner sees ---\n')[1];
  assert.equal(learner, `${framing}\n\nThe app: Crumbs.\n\nAbout the plan.\n\n(a) First?\n\n(b) Last?\n`);
  const j = run('judge-input.mjs', [dir, 'a-z/f/q1']);
  assert.equal(j.code, 0, j.stderr);
  assert.ok(!j.stdout.includes(framing), j.stdout);
  assert.match(j.stdout, /--- question ---\nThe app: Crumbs\.\n\nAbout the plan\.\n\n\(a\) First\?\n\n\(b\) Last\?\n--- rubric ---/);
});
