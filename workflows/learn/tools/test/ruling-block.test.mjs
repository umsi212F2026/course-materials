// next-item --key on a question with an open part prints the criterion and the ruling rules after
// the key, so the tutor can rule the answer itself. A question with only multiple choice parts
// prints neither, and without --key neither is printed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { makeTopic, run, CAP_GOAL } from './helpers.mjs';

const RULING = [
  '--- ruling ---',
  'Rule against the criterion as written, not a better one you can see.',
  'Half credit is not met.',
  'unclear is for a genuine tie, in either direction.',
  'Anything that changed what they did is help. Clarifying which question was meant, or repeating it, is not.',
  'Rule on what they wrote, not on how the session went.',
].join('\n');

function topicOf(goals, files) {
  const dir = makeTopic({ goals, activities: '### a-x\n- **checks:** c-a\n' });
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

const OPEN = {
  'tasks/a-x/s1.md': '### q1\n\nName the step.\n',
  'rubrics/a-x/s1.md': '### q1\n\n- **goal:** c-a\n- **answer:** Revise.\n',
};

const key = (dir) => {
  const r = run('next-item.mjs', [dir, '--activity', 'a-x', '--key']);
  assert.equal(r.code, 0, r.stderr);
  return r.stdout.split('\n--- key ---\n')[1];
};

test('next-item --key on an open question prints the criterion and the ruling block', () => {
  const k = key(topicOf(CAP_GOAL('c-a'), OPEN));
  assert.ok(k.endsWith(`--- criterion ---\nc-a: The thing is done.\n${RULING}\n`), k);
});

test('next-item --key on a compound with an open part prints both sections', () => {
  const k = key(
    topicOf(CAP_GOAL('c-a'), {
      'tasks/a-x/s1.md': '### q1\n\nAbout it.\n\n#### a\n\nTrue?\n\n1. True\n2. False\n\n#### b\n\nName it.\n',
      'rubrics/a-x/s1.md':
        '### q1\n\n- **goal:** c-a\n- **type:** compound\n\n#### a\n\n- **type:** mcq\n- **answer:** 1\n\n#### b\n\n- **answer:** Revise\n',
    })
  );
  assert.ok(k.endsWith(`--- criterion ---\nc-a: The thing is done.\n${RULING}\n`), k);
});

test('next-item --key on a plain mcq prints neither', () => {
  const k = key(
    topicOf(CAP_GOAL('c-a'), {
      'tasks/a-x/s1.md': '### q1\n\nTrue?\n\n1. True\n2. False\n',
      'rubrics/a-x/s1.md': '### q1\n\n- **goal:** c-a\n- **type:** mcq\n- **answer:** 1\n',
    })
  );
  assert.ok(!k.includes('--- criterion ---'), k);
  assert.ok(!k.includes('--- ruling ---'), k);
});

test('the criterion section lists the cases the question exercises, with their texts', () => {
  const goals = CAP_GOAL('c-a', '- **cases:**\n  - `one`: first case\n  - `two`: second case\n  - `three`: third case\n');
  const k = key(
    topicOf(goals, {
      'tasks/a-x/s1.md': OPEN['tasks/a-x/s1.md'],
      'rubrics/a-x/s1.md': '### q1\n\n- **goal:** c-a\n- **answer:** Revise.\n- **cases:** one, three\n',
    })
  );
  assert.ok(
    k.includes('--- criterion ---\nc-a: The thing is done.\n  case one: first case\n  case three: third case\n--- ruling ---\n'),
    k
  );
  assert.ok(!k.includes('second case'), k);
});

test('a goal with a goals.md problem says it cannot be ruled', () => {
  const k = key(topicOf(CAP_GOAL('c-a', '- **cases:** a, b\n'), OPEN));
  assert.ok(k.includes("--- criterion ---\nc-a: can't be ruled until its goals.md entry is fixed\n--- ruling ---\n"), k);
});

test('without --key neither section is printed', () => {
  const r = run('next-item.mjs', [topicOf(CAP_GOAL('c-a'), OPEN), '--activity', 'a-x']);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(!r.stdout.includes('--- criterion ---'), r.stdout);
  assert.ok(!r.stdout.includes('--- ruling ---'), r.stdout);
});
