// judge-input.mjs prints the judge's inputs from the topic folder, and refuses rather than guess.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { makeTopic, run, CAP_GOAL } from './helpers.mjs';

const CASES = '- **cases:**\n  - `x`: ex\n  - `y`: why\n';

function topic() {
  const dir = makeTopic({
    goals: CAP_GOAL('c-g', CASES) + '\n' + CAP_GOAL('c-h') + '\n' + CAP_GOAL('c-k', CASES),
    activities: '### a-x\n- **checks:** c-g, c-h\n',
  });
  const put = (rel, text) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  put('tasks/a-x/s1.md', '### q1\n\nDo X.\n\n### q2\n\nDo both.\n\n### q3\n\nStale.\n');
  put(
    'rubrics/a-x/s1.md',
    '### q1\n\n- **goal:** c-g\n- **answer:** X done.\n- **cases:** x\n\n' +
      '### q2\n\n- **goal:** c-g, c-h\n- **answer:** Both done.\n- **credit:**\n  - `c-g`: does X.\n  - `c-h`: does H.\n- **cases:** c-g: y\n\n' +
      '### q3\n\n- **goal:** c-k\n- **answer:** Old.\n'
  );
  return dir;
}

const head = (stdout) => JSON.parse(stdout.split('\n')[0]);

test('a one-goal bank question: goal, criterion, cases with their text, question and rubric', () => {
  const r = run('judge-input.mjs', [topic(), 'a-x/s1/q1']);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(head(r.stdout), {
    goal: 'c-g',
    criterion: 'The thing is done.',
    cases: [{ id: 'x', text: 'ex' }],
    label: 'a-x/s1/q1',
  });
  assert.match(r.stdout, /--- question ---\nDo X\.\n--- rubric ---\n[\s\S]*X done\./);
});

test('a multi-goal bank question sends goals, with cases only where the goal has them', () => {
  const r = run('judge-input.mjs', [topic(), 'a-x/s1/q2']);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(head(r.stdout).goals, [
    { goal: 'c-g', criterion: 'The thing is done.', cases: [{ id: 'y', text: 'why' }] },
    { goal: 'c-h', criterion: 'The thing is done.' },
  ]);
});

test('a question set live needs --goal, and --cases when its goal has cases', () => {
  const dir = topic();
  assert.match(run('judge-input.mjs', [dir, 'CATCH: x']).stderr, /not a bank question.*--goal/);
  assert.match(run('judge-input.mjs', [dir, 'CATCH: x', '--goal', 'c-g']).stderr, /--cases c-g:/);
  const r = run('judge-input.mjs', [dir, 'CATCH: x', '--goal', 'c-g', '--cases', 'c-g:x,y']);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(head(r.stdout).cases.map((c) => c.id), ['x', 'y']);
  assert.doesNotMatch(r.stdout, /--- rubric ---/);
});

test('a stale bank question takes --cases for the goal it lists none for, and only that', () => {
  const dir = topic();
  assert.match(run('judge-input.mjs', [dir, 'a-x/s1/q3']).stderr, /nothing says which/);
  assert.equal(run('judge-input.mjs', [dir, 'a-x/s1/q3', '--cases', 'c-k:y']).code, 0);
  assert.match(run('judge-input.mjs', [dir, 'a-x/s1/q1', '--cases', 'c-g:y']).stderr, /already lists/);
});

test('refuses an unknown goal, an unknown case, and --goal on a bank question', () => {
  const dir = topic();
  assert.match(run('judge-input.mjs', [dir, 'live', '--goal', 'c-nope']).stderr, /not in/);
  assert.match(run('judge-input.mjs', [dir, 'live', '--goal', 'c-g', '--cases', 'c-g:z']).stderr, /z is not a case/);
  assert.match(run('judge-input.mjs', [dir, 'a-x/s1/q1', '--goal', 'c-g']).stderr, /names its own goals/);
});

test('record-attempt --progress prints the set line after the ruling; without it, nothing', () => {
  const dir = topic();
  const axes = '{"unaided":"yes","criterion":"met"}';
  const quiet = run('record-attempt.mjs', [dir, 'c-h', 'a-x/s1/q2', '--axes', axes]);
  assert.equal(quiet.code, 0, quiet.stderr);
  assert.doesNotMatch(quiet.stdout, /--- progress ---/);
  const shown = run('record-attempt.mjs', [dir, 'c-g', 'a-x/s1/q1', '--cases', 'x', '--axes', axes, '--progress']);
  assert.equal(shown.code, 0, shown.stderr);
  assert.match(shown.stdout, /--- progress ---\n.*\n  c-g: 1 of 2 cases demonstrated/);
  assert.equal(
    shown.stdout.split('--- progress ---\n')[1].trim(),
    run('progress.mjs', [dir, '--after', 'c-g']).stdout.trim()
  );
});
