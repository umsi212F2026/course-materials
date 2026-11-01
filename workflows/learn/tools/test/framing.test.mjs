// A scenario's framing introduces a run of questions, so next-item prints it above the first
// question it serves from that scenario and nowhere else; see next-item.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { makeTopic, run, CAP_GOAL } from './helpers.mjs';

const FRAMING = 'Each question is a separate decision.';

// `served` marks a-x/s1/q1 as already answered (not yet met), so the picker moves on to q2.
function topic({ served = false } = {}) {
  const dir = makeTopic({
    goals: CAP_GOAL('c-a'),
    activities: '### a-x\n- **checks:** c-a\n\n### a-y\n- **checks:** c-a\n\n### a-z\n- **checks:** c-a\n',
  });
  const files = {
    'tasks/a-x/s1.md': `The app: Crumbs.\n\n## Framing\n\n${FRAMING}\n\n### q1\n\nWhat first?\n\n### q2\n\nWhat next?\n`,
    'rubrics/a-x/s1.md': '### q1\n\n- **goal:** c-a\n- **answer:** A.\n\n### q2\n\n- **goal:** c-a\n- **answer:** B.\n',
    'tasks/a-y/plain.md': 'The app: Tally.\n\n### q1\n\nWhat first?\n',
    'rubrics/a-y/plain.md': '### q1\n\n- **goal:** c-a\n- **answer:** A.\n',
    'tasks/a-z/m1.md': `The app: Crumbs.\n\n## Framing\n\n${FRAMING}\n\n### q1\n\nWhich first?\n\n1. Sleep.\n2. Cost.\n`,
    'rubrics/a-z/m1.md': 'Must name cost.\n\n### q1\n\n- **goal:** c-a\n- **type:** mcq\n- **answer:** 2\n- **credit:** full for 2.\n',
    ...(served
      ? { 'evidence/attempts.jsonl': JSON.stringify({ at: '2026-10-01T00:00:00Z', goal: 'c-a', label: 'a-x/s1/q1', unaided: 'yes', criterion: 'not met' }) + '\n' }
      : {}),
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

// What the learner is shown: everything after the marker line, up to any key.
function learnerSees(stdout) {
  return stdout.split('--- learner sees ---\n')[1].split('\n--- key ---')[0];
}

function serve(args, opts) {
  const r = run('next-item.mjs', [topic(opts), ...args]);
  assert.equal(r.code, 0, r.stderr);
  return r.stdout;
}

test('no --after: the framing comes first', () => {
  const out = serve(['--activity', 'a-x']);
  assert.match(out, /^label: a-x\/s1\/q1$/m);
  assert.equal(learnerSees(out), `${FRAMING}\n\nThe app: Crumbs.\n\nWhat first?\n`);
});

test('--after in the same scenario: no framing', () => {
  const out = serve(['--activity', 'a-x', '--after', 'a-x/s1/q1'], { served: true });
  assert.match(out, /^label: a-x\/s1\/q2$/m);
  assert.equal(learnerSees(out), 'The app: Crumbs.\n\nWhat next?\n');
});

test('--after in another scenario: the framing comes first', () => {
  const out = serve(['--activity', 'a-x', '--after', 'a-y/plain/q1']);
  assert.match(out, /^label: a-x\/s1\/q1$/m);
  assert.ok(learnerSees(out).startsWith(`${FRAMING}\n\n`));
});

test('--after with no slash or from another topic: the framing comes first', () => {
  for (const after of ['q1', 'other-topic/x/q1']) {
    const out = serve(['--activity', 'a-x', '--after', after]);
    assert.match(out, /^label: a-x\/s1\/q1$/m, after);
    assert.ok(learnerSees(out).startsWith(`${FRAMING}\n\n`), after);
  }
});

test('--review: no framing', () => {
  const out = serve(['--activity', 'a-x', '--review']);
  assert.match(out, /^label: a-x\/s1\/q[12]$/m);
  assert.ok(!out.includes('separate decision'));
});

test('an unframed scenario prints as before', () => {
  const out = serve(['--activity', 'a-y']);
  assert.match(out, /^label: a-y\/plain\/q1$/m);
  assert.equal(learnerSees(out), 'The app: Tally.\n\nWhat first?\n');
});

test('an mcq: framing, prompt, then numbered choices, then the key', () => {
  const out = serve(['--activity', 'a-z', '--key']);
  assert.match(out, /^label: a-z\/m1\/q1$/m);
  assert.equal(learnerSees(out), `${FRAMING}\n\nThe app: Crumbs.\n\nWhich first?\n1. Sleep.\n2. Cost.`);
  assert.match(out, /--- key ---\nMust name cost\.\n2\. Cost\./);
});
