// answer.mjs: one call per answer. A program rules the multiple choice, the tutor supplies the
// unaided axis and the criterion for open parts, and the tool records an attempt per goal and
// prints the learner's feedback below `--- learner sees ---`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { makeTopic, run, CAP_GOAL } from './helpers.mjs';

const TASKS = [
  'The app: Crumbs.',
  '',
  '### q1',
  '',
  'What does the start event do?',
  '',
  '1. It is the first step: the human opens the Day 1 page.',
  '2. It sends the output back.',
  '3. It marks what starts a run of the workflow, its trigger.',
  '4. It ends the run.',
  '',
  '### q2',
  '',
  'Name the element that sends output back.',
  '',
  '### q3',
  '',
  'About the review plan.',
  '',
  '#### a',
  '',
  'It runs only after the plan is written.',
  '',
  '1. True',
  '2. False',
  '',
  '#### b',
  '',
  'Which step is it?',
  '',
  '1. Draft',
  '2. Review',
  '3. Publish',
  '',
  '#### c',
  '',
  'Name the element that sends its output back to the author.',
  '',
  '### q4',
  '',
  'True or false: review comes first?',
  '',
  '1. True',
  '2. False',
  '',
  '### q5',
  '',
  'Pick the one that is true.',
  '',
  '1. Alpha is true.',
  '2. Beta is true.',
  '',
].join('\n');

const RUBRICS = [
  'Review comes before revision.',
  '',
  '### q1',
  '',
  '- **goal:** c-a',
  '- **type:** mcq',
  '- **answer:** 3',
  '- **move:** DEFINE',
  '',
  '### q2',
  '',
  '- **goal:** c-a',
  '- **answer:** the Revise step',
  '',
  '### q3',
  '',
  '- **goal:** c-a',
  '- **type:** compound',
  '',
  '#### a',
  '',
  '- **type:** mcq',
  '- **answer:** 1',
  '',
  '#### b',
  '',
  '- **type:** mcq',
  '- **answer:** 2',
  '',
  '#### c',
  '',
  '- **answer:** the Revise step',
  '',
  '### q4',
  '',
  '- **goal:** c-a, c-b',
  '- **type:** mcq',
  '- **answer:** 1',
  '',
  '### q5',
  '',
  '- **goal:** c-k',
  '- **type:** mcq',
  '- **answer:** 2',
  '- **cases:** one',
  '',
].join('\n');

const CASES = '- **cases:**\n  - `one`: first case\n  - `two`: second case\n';

// Two scenarios, so a goal with cases can be given a question that lists none for it.
function topic(extraRubric = '') {
  const dir = makeTopic({
    goals: [CAP_GOAL('c-a'), CAP_GOAL('c-b'), CAP_GOAL('c-k', CASES)].join('\n'),
    activities: '### a-x\n- **checks:** c-a, c-b, c-k\n',
  });
  const files = {
    'tasks/a-x/s1.md': TASKS,
    'rubrics/a-x/s1.md': RUBRICS,
    'tasks/a-x/s2.md': '### q1\n\nPick.\n\n1. Yes.\n2. No.\n',
    'rubrics/a-x/s2.md': '### q1\n\n- **goal:** c-k\n- **type:** mcq\n- **answer:** 1\n' + extraRubric,
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

const attempts = (dir) => {
  const f = join(dir, 'evidence', 'attempts.jsonl');
  return existsSync(f) ? readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
};

const answer = (dir, label, ...rest) => run('answer.mjs', [dir, label, ...rest]);
const refused = (r, dir, pattern) => {
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stderr, pattern);
  assert.deepEqual(attempts(dir), []);
};

const RIGHT = 'Correct: **3**, "It marks what starts a run of the workflow, its trigger."';
const WRONG =
  'Not this time. You chose **1**, "It is the first step: the human opens the Day 1 page." ' +
  'The answer is **3**, "It marks what starts a run of the workflow, its trigger."';
const NEXT = ['What next?', '1. Try again now, with another question.', '2. Come back to it later.', '3. Mark it as learned.'];

test('a right mcq records met and prints the Correct line', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3');
  assert.equal(r.code, 0, r.stderr);
  const [a, ...rest] = attempts(dir);
  assert.equal(rest.length, 0);
  assert.equal(a.goal, 'c-a');
  assert.equal(a.label, 'a-x/s1/q1');
  assert.equal(a.unaided, 'yes');
  assert.equal(a.criterion, 'met');
  assert.equal(a.source, 'study');
  assert.deepEqual(a.tags, ['reception']);
  const learner = r.stdout.split('--- learner sees ---\n')[1];
  assert.ok(learner.startsWith(RIGHT), r.stdout);
  assert.ok(!learner.includes('What next?'), r.stdout);
  assert.ok(r.stdout.startsWith('c-a: '), r.stdout);
});

test('a wrong mcq records not met and prints the verdict and the three choices', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '1');
  assert.equal(r.code, 0, r.stderr);
  assert.equal(attempts(dir)[0].criterion, 'not met');
  const learner = r.stdout.split('--- learner sees ---\n')[1];
  assert.ok(learner.startsWith(WRONG + '\n\n'), learner);
  assert.ok(learner.endsWith(NEXT.join('\n') + '\n'), learner);
  assert.ok(!learner.includes('Review comes before revision'), 'the scenario key is not shown');
});

test('a plain mcq with --criterion is refused and writes nothing', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3', '--criterion', 'met'), dir, /--criterion/);
});

test('a plain mcq without --choice is refused', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes'), dir, /--choice/);
});

test('an open question without --criterion is refused', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q2', '--unaided', 'yes'), dir, /--criterion/);
});

test('an open question with --choice is refused', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q2', '--unaided', 'yes', '--choice', '1', '--criterion', 'met'), dir, /--choice/);
});

test('an open question with --criterion met records it and prints no verdict line', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q2', '--unaided', 'yes', '--criterion', 'met');
  assert.equal(r.code, 0, r.stderr);
  assert.equal(attempts(dir)[0].criterion, 'met');
  const learner = r.stdout.split('--- learner sees ---\n')[1];
  assert.ok(!/Correct|Not this time/.test(learner), learner);
});

test('an open question ruled not met shows the three choices', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q2', '--unaided', 'yes', '--criterion', 'not met');
  assert.equal(r.code, 0, r.stderr);
  assert.ok(r.stdout.includes('\n' + NEXT.join('\n')), r.stdout);
});

test('a call without --unaided is refused', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q1', '--choice', '3'), dir, /--unaided/);
});

test('an unknown flag is refused', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choise', '3'), dir, /--choise is not a flag/);
});

test('a compound with every mcq part right and --criterion met is met', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q3', '--unaided', 'yes', '--choice', 'a=1,b=2', '--criterion', 'met');
  assert.equal(r.code, 0, r.stderr);
  assert.equal(attempts(dir)[0].criterion, 'met');
  const [tutor, learner] = r.stdout.split('--- learner sees ---\n');
  assert.ok(tutor.includes('(a) answered 1, key 1, right\n(b) answered 2, key 2, right\n'), tutor);
  assert.ok(learner.startsWith('(a) Correct: **1**, "True".\n(b) Correct: **2**, "Review".'), learner);
});

test("a compound with one mcq part wrong and --criterion met is not met, with that part's lines", () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q3', '--unaided', 'yes', '--choice', 'a=1,b=3', '--criterion', 'met');
  assert.equal(r.code, 0, r.stderr);
  assert.equal(attempts(dir)[0].criterion, 'not met');
  const [tutor, learner] = r.stdout.split('--- learner sees ---\n');
  assert.ok(tutor.includes('(b) answered 3, key 2, wrong\n'), tutor);
  assert.ok(learner.includes('(b) Not this time. You chose **3**, "Publish". The answer is **2**, "Review".'), learner);
  assert.ok(learner.includes(NEXT.join('\n')), learner);
});

test('a compound with right mcq parts takes the tutor criterion', () => {
  const dir = topic();
  answer(dir, 'a-x/s1/q3', '--unaided', 'yes', '--choice', 'a=1,b=2', '--criterion', 'unclear');
  assert.equal(attempts(dir)[0].criterion, 'unclear');
});

test('a compound missing a choice for an mcq part is refused', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q3', '--unaided', 'yes', '--choice', 'a=1', '--criterion', 'met'), dir, /part \(b\)/);
});

test('a compound with an open part and no --criterion is refused', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q3', '--unaided', 'yes', '--choice', 'a=1,b=2'), dir, /--criterion/);
});

test('a whole-number --choice on a compound, or a lettered one on a plain mcq, is refused', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q3', '--unaided', 'yes', '--choice', '1', '--criterion', 'met'), dir, /<letter>=<number>/);
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', 'a=1'), dir, /one number/);
});

test('--choice naming a part the compound lacks, or an open part, is refused', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q3', '--unaided', 'yes', '--choice', 'a=1,b=2,d=1', '--criterion', 'met'), dir, /no part \(d\)/);
  refused(answer(dir, 'a-x/s1/q3', '--unaided', 'yes', '--choice', 'a=1,b=2,c=1', '--criterion', 'met'), dir, /part \(c\) is not multiple choice/);
});

test('a choice out of range or not a number is refused', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '5'), dir, /choice 5/);
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '0'), dir, /choice 0/);
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', 'x'), dir, /not a choice number/);
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '2.5'), dir, /not a choice number/);
  refused(answer(dir, 'a-x/s1/q3', '--unaided', 'yes', '--choice', 'a=9,b=2', '--criterion', 'met'), dir, /part \(a\) choice 9/);
});

test('a label not in the bank is refused and names record-attempt.mjs', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q99', '--unaided', 'yes', '--choice', '1'), dir, /record-attempt\.mjs/);
});

test('a question crediting two goals records two attempts with the same label and tags', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q4', '--unaided', 'yes', '--choice', '1');
  assert.equal(r.code, 0, r.stderr);
  const [a, b, ...rest] = attempts(dir);
  assert.equal(rest.length, 0);
  assert.deepEqual([a.goal, b.goal], ['c-a', 'c-b']);
  assert.equal(a.label, b.label);
  assert.deepEqual(a.tags, b.tags);
  assert.ok(r.stdout.indexOf('c-a: ') < r.stdout.indexOf('c-b: '), r.stdout);
});

test('cases come from the bank', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q5', '--unaided', 'yes', '--choice', '2');
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(attempts(dir)[0].cases, ['one']);
});

test('a goal with cases the question lists none for is refused', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s2/q1', '--unaided', 'yes', '--choice', '1'), dir, /record-attempt\.mjs/);
});

test('--unaided no with a right choice records unaided no, criterion met, and the bar is not met', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q1', '--unaided', 'no', '--choice', '3');
  assert.equal(r.code, 0, r.stderr);
  const a = attempts(dir)[0];
  assert.equal(a.unaided, 'no');
  assert.equal(a.criterion, 'met');
  assert.match(r.stdout, /bar not met/);
});

test('on a goal with cases the third choice counts this question', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q5', '--unaided', 'yes', '--choice', '1');
  assert.equal(r.code, 0, r.stderr);
  const learner = r.stdout.split('--- learner sees ---\n')[1];
  assert.ok(learner.includes('\n3. Count this one as right and go on to the next question.'), learner);
  assert.ok(!learner.includes('Mark it as learned'), learner);
});

test('the progress block is fenced and matches record-attempt --progress for the same state', () => {
  const a = topic();
  const b = topic();
  const r = answer(a, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3');
  const s = run('record-attempt.mjs', [b, 'c-a', 'a-x/s1/q1', '--axes', '{"unaided":"yes","criterion":"met"}', '--tags', 'reception', '--progress']);
  assert.equal(r.code, 0, r.stderr);
  const text = s.stdout.split('--- progress ---\n')[1];
  assert.ok(text, s.stdout);
  const learner = r.stdout.split('--- learner sees ---\n')[1];
  assert.equal(learner, `${RIGHT}\n\n\`\`\`text\n${text.replace(/\n$/, '')}\n\`\`\`\n`);
});

test('a refusal on the second goal writes no attempt for the first', () => {
  // c-b is not defined with a cases slot here, so make the second goal one the question lists no cases for.
  const dir = makeTopic({
    goals: [CAP_GOAL('c-a'), CAP_GOAL('c-k', CASES)].join('\n'),
    activities: '### a-x\n- **checks:** c-a, c-k\n',
  });
  mkdirSync(join(dir, 'tasks', 'a-x'), { recursive: true });
  mkdirSync(join(dir, 'rubrics', 'a-x'), { recursive: true });
  writeFileSync(join(dir, 'tasks/a-x/s1.md'), '### q1\n\nPick.\n\n1. Yes.\n2. No.\n');
  writeFileSync(join(dir, 'rubrics/a-x/s1.md'), '### q1\n\n- **goal:** c-a, c-k\n- **type:** mcq\n- **answer:** 1\n');
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '1'), dir, /c-k has cases/);
});

test('a full stop follows the closing quote unless the choice text already ends a sentence', () => {
  const dir = topic();
  // q1's choices end in "."; q4's ("False") do not.
  const stopped = answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3');
  assert.ok(stopped.stdout.includes('its trigger."\n'), stopped.stdout);
  assert.ok(!stopped.stdout.includes('trigger.".'), stopped.stdout);
  const added = answer(dir, 'a-x/s1/q4', '--unaided', 'yes', '--choice', '2');
  assert.ok(added.stdout.includes('You chose **2**, "False". The answer is **1**, "True".\n'), added.stdout);
});
