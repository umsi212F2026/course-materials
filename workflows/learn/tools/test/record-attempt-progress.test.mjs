// record-attempt.mjs --progress prints the set line after the ruling, and nothing without it.
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
