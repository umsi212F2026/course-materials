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
const MET_LINE = 'Well done: that meets this goal. It comes back for review in about 3 days.';
const MET_NEVER = 'Well done: that meets this goal, and it does not come back for review.';
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
  assert.equal(learner, `${RIGHT}\n\n${MET_LINE}\n\n\`\`\`text\n${text.replace(/\n$/, '')}\n\`\`\`\n`);
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

// --- --next, --review, --concern ------------------------------------------------

const FRAMING = 'Each question is a separate decision.';

// Two framed scenarios of two mcq questions each, one activity, one goal.
function framedTopic() {
  const dir = makeTopic({ goals: CAP_GOAL('c-a'), activities: '### a-x\n- **checks:** c-a\n' });
  const mcq = (n) => `### q${n}\n\nPick ${n}.\n\n1. Yes.\n2. No.\n\n`;
  const rub = (n) => `### q${n}\n\n- **goal:** c-a\n- **type:** mcq\n- **answer:** 1\n\n`;
  const files = {
    'tasks/a-x/s1.md': `The app: Crumbs.\n\n## Framing\n\n${FRAMING}\n\n${mcq(1)}${mcq(2)}`,
    'rubrics/a-x/s1.md': `Key.\n\n${rub(1)}${rub(2)}`,
    'tasks/a-x/s2.md': `The app: Tally.\n\n## Framing\n\nSecond framing.\n\n${mcq(1)}`,
    'rubrics/a-x/s2.md': `Key.\n\n${rub(1)}`,
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

const afterNext = (stdout) => stdout.split('--- learner sees ---\n')[1];

test('--next serves the same header, learner text and key as next-item --after <label> --key', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3', '--next', '--activity', 'a-x');
  assert.equal(r.code, 0, r.stderr);
  const n = run('next-item.mjs', [dir, '--activity', 'a-x', '--after', 'a-x/s1/q1', '--key']);
  assert.equal(n.code, 0, n.stderr);
  const [nHead, nRest] = n.stdout.split('--- learner sees ---\n');
  const [nLearner, nKey] = nRest.split('--- key ---\n');
  const [before, nextPart] = r.stdout.split('--- next ---\n');
  assert.equal(nextPart, nHead + '--- key ---\n' + nKey);
  const learner = before.split('--- learner sees ---\n')[1];
  assert.ok(learner.startsWith(RIGHT), learner);
  assert.ok(learner.endsWith('\n\n' + nLearner), learner);
  assert.ok(!learner.includes('--- key ---'), 'the key is not in the learner block');
});

test('--next after a wrong answer serves nothing: the choices come last and the tutor is told how to serve', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '1', '--next', '--goal', 'c-a');
  assert.equal(r.code, 0, r.stderr);
  assert.equal(attempts(dir).length, 1);
  assert.equal(attempts(dir)[0].criterion, 'not met');
  assert.ok(!r.stdout.includes('--- next ---'), r.stdout);
  assert.ok(!r.stdout.includes('--- key ---'), r.stdout);
  const [tutor, learner] = r.stdout.split('--- learner sees ---\n');
  assert.ok(
    tutor.endsWith(`next: not served after a miss; on choice 1, run next-item.mjs ${dir} --goal c-a --after a-x/s1/q1 --key\n`),
    tutor
  );
  assert.ok(learner.endsWith(NEXT.join('\n') + '\n'), learner);
});

test('--next --activity after a wrong answer names the activity in the tutor line', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '1', '--next', '--activity', 'a-x');
  assert.equal(r.code, 0, r.stderr);
  assert.ok(!r.stdout.includes('--- next ---'), r.stdout);
  assert.ok(r.stdout.includes(`next: not served after a miss; on choice 1, run next-item.mjs ${dir} --activity a-x --after a-x/s1/q1 --key\n--- learner sees ---`), r.stdout);
});

test('--next --goal serves nothing once this answer meets that goal: the congratulation comes last', () => {
  const dir = framedTopic();
  const r = answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '1', '--next', '--goal', 'c-a');
  assert.equal(r.code, 0, r.stderr);
  assert.equal(attempts(dir).length, 1);
  assert.ok(!r.stdout.includes('--- next ---'), r.stdout);
  const [tutor, learner] = r.stdout.split('--- learner sees ---\n');
  assert.ok(tutor.endsWith('next: not served; c-a is met, go back to choosing a goal\n'), tutor);
  assert.ok(!learner.includes('Pick 2.'), learner);
  assert.ok(learner.endsWith('```\n'), learner);
  assert.ok(learner.includes(MET_LINE), learner);
});

test('--next --activity still serves when this answer meets a goal', () => {
  const dir = framedTopic();
  const r = answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '1', '--next', '--activity', 'a-x');
  assert.equal(r.code, 0, r.stderr);
  assert.ok(afterNext(r.stdout).includes(MET_LINE), r.stdout);
  assert.match(r.stdout, /^label: a-x\/s1\/q2$/m);
  assert.ok(!r.stdout.includes('next: not served'), r.stdout);
});

test('--next --goal still serves after a right answer that does not meet the bar', () => {
  const dir = framedTopic();
  const r = answer(dir, 'a-x/s1/q1', '--unaided', 'no', '--choice', '1', '--next', '--goal', 'c-a');
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /bar not met/);
  assert.match(r.stdout, /^label: a-x\/s1\/q2$/m);
  assert.ok(afterNext(r.stdout).split('--- next ---')[0].includes('Pick 2.'), r.stdout);
  assert.ok(!r.stdout.includes('next: not served'), r.stdout);
});

test('--next across a scenario boundary carries the new scenario\'s framing, and within one it does not', () => {
  const dir = framedTopic();
  const first = answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '1', '--next', '--activity', 'a-x');
  assert.equal(first.code, 0, first.stderr);
  assert.match(first.stdout, /^label: a-x\/s1\/q2$/m);
  assert.ok(!afterNext(first.stdout).includes(FRAMING), first.stdout);
  const second = answer(dir, 'a-x/s1/q2', '--unaided', 'yes', '--choice', '1', '--next', '--activity', 'a-x');
  assert.equal(second.code, 0, second.stderr);
  assert.match(second.stdout, /^label: a-x\/s2\/q1$/m);
  assert.ok(afterNext(second.stdout).includes('Second framing.'), second.stdout);
});

test('--next with nothing left records the attempt, prints the learner block and exits 2', () => {
  const dir = framedTopic();
  // An activity with no banked questions leaves the picker nothing to serve.
  const r = answer(dir, 'a-x/s2/q1', '--unaided', 'yes', '--choice', '1', '--next', '--activity', 'a-none');
  assert.equal(r.code, 2, r.stderr);
  assert.match(r.stderr, /no bank questions for a-none; run the activity's generator live/);
  assert.equal(attempts(dir).length, 1);
  assert.ok(afterNext(r.stdout).startsWith('Correct: **1**'), r.stdout);
  assert.ok(!r.stdout.includes('--- next ---'), r.stdout);
});

test('--next without --goal or --activity, or with both, is refused; --goal without --next is refused', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3', '--next'), dir, /exactly one of --goal and --activity/);
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3', '--next', '--goal', 'c-a', '--activity', 'a-x'), dir, /exactly one/);
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3', '--goal', 'c-a'), dir, /only go with --next/);
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3', '--activity', 'a-x'), dir, /only go with --next/);
});

// q1 credits c-a and c-b and is open, so the ruling is the tutor's.
function twoGoalTopic() {
  const dir = makeTopic({
    goals: [CAP_GOAL('c-a'), CAP_GOAL('c-b')].join('\n'),
    activities: '### a-x\n- **checks:** c-a, c-b\n',
  });
  mkdirSync(join(dir, 'tasks', 'a-x'), { recursive: true });
  mkdirSync(join(dir, 'rubrics', 'a-x'), { recursive: true });
  writeFileSync(join(dir, 'tasks/a-x/s1.md'), '### q1\n\nName it.\n');
  writeFileSync(join(dir, 'rubrics/a-x/s1.md'), '### q1\n\n- **goal:** c-a, c-b\n- **answer:** It.\n');
  return dir;
}
const sources = (dir) => Object.fromEntries(attempts(dir).map((a) => [a.goal, a.source]));

test('--review on a two-goal question: the named goal is review on a pass and a miss; the other only on a miss', () => {
  const pass = twoGoalTopic();
  assert.equal(answer(pass, 'a-x/s1/q1', '--unaided', 'yes', '--criterion', 'met', '--review', 'c-a').code, 0);
  assert.deepEqual(sources(pass), { 'c-a': 'review', 'c-b': 'study' });
  const miss = twoGoalTopic();
  assert.equal(answer(miss, 'a-x/s1/q1', '--unaided', 'yes', '--criterion', 'not met', '--review', 'c-a').code, 0);
  assert.deepEqual(sources(miss), { 'c-a': 'review', 'c-b': 'review' });
  const helped = twoGoalTopic();
  assert.equal(answer(helped, 'a-x/s1/q1', '--unaided', 'no', '--criterion', 'met', '--review', 'c-a').code, 0);
  assert.deepEqual(sources(helped), { 'c-a': 'review', 'c-b': 'review' });
});

test('--review with an unclear ruling leaves the other goal as study', () => {
  const dir = twoGoalTopic();
  assert.equal(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--criterion', 'unclear', '--review', 'c-a').code, 0);
  assert.deepEqual(sources(dir), { 'c-a': 'review', 'c-b': 'study' });
});

test('--review naming a goal the question does not credit is refused; with --next is refused', () => {
  const dir = topic();
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3', '--review', 'c-b'), dir, /does not credit/);
  refused(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3', '--review', 'c-a', '--next', '--activity', 'a-x'), dir, /--review and --next/);
  refused(answer(dir, 'a-x/s1/q4', '--unaided', 'yes', '--choice', '1', '--review', 'c-a,c-z'), dir, /c-z/);
});

test('--review prints no progress block and no three choices', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '1', '--review', 'c-a');
  assert.equal(r.code, 0, r.stderr);
  assert.equal(attempts(dir)[0].source, 'review');
  const learner = afterNext(r.stdout);
  assert.equal(learner, WRONG + '\n');
});

test('--concern writes one blocked line per goal to status.jsonl', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q4', '--unaided', 'yes', '--choice', '1', '--concern', 'the key looks wrong');
  assert.equal(r.code, 0, r.stderr);
  const lines = readFileSync(join(dir, 'status.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((e) => e.kind === 'blocked');
  assert.deepEqual(lines.map((e) => [e.goal, e.needs, e.why]), [
    ['c-a', 'curation', 'the key looks wrong'],
    ['c-b', 'curation', 'the key looks wrong'],
  ]);
  const tutor = r.stdout.split('--- learner sees ---')[0];
  assert.ok(tutor.includes('queued: blocked c-a --needs curation\nqueued: blocked c-b --needs curation\n'), tutor);
  assert.ok(!afterNext(r.stdout).includes('queued'), r.stdout);
});

// --- a bar met for the first time -----------------------------------------------

const metLines = (stdout) => afterNext(stdout).split('\n').filter((l) => l.startsWith('Well done:'));

test('a bar met for the first time adds the well done line after the verdict, before the progress block', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3');
  assert.equal(r.code, 0, r.stderr);
  assert.ok(afterNext(r.stdout).startsWith(`${RIGHT}\n\n${MET_LINE}\n\n\`\`\`text\n`), r.stdout);
});

test('no well done line on a miss, on a helped pass, or on a second pass', () => {
  const dir = topic();
  assert.deepEqual(metLines(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '1').stdout), []);
  assert.deepEqual(metLines(answer(dir, 'a-x/s1/q1', '--unaided', 'no', '--choice', '3').stdout), []);
  assert.deepEqual(metLines(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3').stdout), [MET_LINE]);
  assert.deepEqual(metLines(answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3').stdout), []);
});

test('no well done line with --review', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '3', '--review', 'c-a');
  assert.equal(r.code, 0, r.stderr);
  assert.equal(afterNext(r.stdout), RIGHT + '\n');
});

test('two goals met at once print the line once', () => {
  const dir = topic();
  const r = answer(dir, 'a-x/s1/q4', '--unaided', 'yes', '--choice', '1');
  assert.equal(r.code, 0, r.stderr);
  assert.equal(attempts(dir).length, 2);
  assert.deepEqual(metLines(r.stdout), [MET_LINE]);
});

test('a goal that does not recur says it does not come back', () => {
  const dir = makeTopic({
    goals: CAP_GOAL('c-n', '- **recurrence:** never\n'),
    activities: '### a-x\n- **checks:** c-n\n',
  });
  mkdirSync(join(dir, 'tasks', 'a-x'), { recursive: true });
  mkdirSync(join(dir, 'rubrics', 'a-x'), { recursive: true });
  writeFileSync(join(dir, 'tasks/a-x/s1.md'), '### q1\n\nPick.\n\n1. Yes.\n2. No.\n');
  writeFileSync(join(dir, 'rubrics/a-x/s1.md'), '### q1\n\n- **goal:** c-n\n- **type:** mcq\n- **answer:** 1\n');
  const r = answer(dir, 'a-x/s1/q1', '--unaided', 'yes', '--choice', '1');
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(metLines(r.stdout), [MET_NEVER]);
});
