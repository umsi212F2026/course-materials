// The adjudicator slot is retired: the tutor rules in session and a program rules multiple choice.
// An old goals.md that still writes an `adjudicator:` line must read cleanly, with the field landing nowhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTopic, run, survey, CAP_GOAL } from './helpers.mjs';
import { readGoals } from '../lib/topic.mjs';

const PASS = '{"unaided":"yes","criterion":"met"}';

// The helper topic has no status.jsonl events, which survey reports; that is not what is tested.
const problems = (dir) => survey(dir).problems.filter((p) => !p.includes('status.jsonl'));
const topicWith = (value) =>
  makeTopic({ goals: CAP_GOAL('c-x', `- **adjudicator:** ${value}\n`), activities: '### a-x\n- **serves:** c-x\n' });

// The old default was a separate judge, spelled study plus a slash plus judge.
const OLD = ['study', 'judge'].join('/');
for (const value of [OLD, 'tutor']) {
  test(`a goal carrying adjudicator: ${value} parses with no problems`, () => {
    assert.deepEqual(problems(topicWith(value)), []);
  });

  test(`record-attempt.mjs succeeds on a goal carrying adjudicator: ${value}`, () => {
    const r = run('record-attempt.mjs', [topicWith(value), 'c-x', 'a-x/1', '--axes', PASS]);
    assert.equal(r.code, 0, r.stderr);
  });
}

test('the parsed goal has no adjudicator field', () => {
  const goal = readGoals(topicWith(OLD)).goals.find((g) => g.id === 'c-x');
  assert.equal('adjudicator' in goal, false);
  assert.equal('adjudicator' in goal.payload, false);
});
