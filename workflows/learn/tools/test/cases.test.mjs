// A goal may name cases that must each be demonstrated: parsing the slot, then the bar per case.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTopic, survey, CAP_GOAL } from './helpers.mjs';
import { parseCases } from './../lib/slots.mjs';
import { readGoals } from './../lib/topic.mjs';

const THREE =
  '- `declines-risky`: a request that would put a secret in the chat  - `allows-safe`: a request involving no secret - `allows-dashboard`: an instruction to use the host settings ';

const block = (items) =>
  '- **cases:**\n' + items.map(([id, text]) => `  - \`${id}\`: ${text}`).join('\n') + '\n';

test('parseCases returns each case in order with trimmed text', () => {
  const { cases, problems } = parseCases(THREE);
  assert.deepEqual(problems, []);
  assert.deepEqual(cases, [
    { id: 'declines-risky', text: 'a request that would put a secret in the chat' },
    { id: 'allows-safe', text: 'a request involving no secret' },
    { id: 'allows-dashboard', text: 'an instruction to use the host settings' },
  ]);
});

test('a goal written with the slot reads goal.cases; one without has none', () => {
  const dir = makeTopic({
    goals:
      CAP_GOAL('c-a', block([['one', 'first thing'], ['two-words', 'second thing']])) +
      '\n' +
      CAP_GOAL('c-b'),
  });
  const [a, b] = readGoals(dir).goals;
  assert.deepEqual(a.cases, [
    { id: 'one', text: 'first thing' },
    { id: 'two-words', text: 'second thing' },
  ]);
  assert.deepEqual(a.problems, []);
  assert.deepEqual(b.cases, []);
  assert.ok(!('cases' in a.payload));
});

test('a malformed or duplicate case id is a problem naming goal and id, and is left out', () => {
  const dir = makeTopic({
    goals: CAP_GOAL(
      'c-a',
      block([
        ['Declines', 'bad capital'],
        ['a-b-c-d', 'four words'],
        ['ok', 'fine'],
        ['ok', 'again'],
      ])
    ),
  });
  const [g] = readGoals(dir).goals;
  assert.deepEqual(g.cases, [{ id: 'ok', text: 'fine' }]);
  assert.equal(g.problems.length, 3);
  assert.ok(g.problems.some((p) => p.includes('c-a') && p.includes('Declines')));
  assert.ok(g.problems.some((p) => p.includes('c-a') && p.includes('a-b-c-d')));
  assert.ok(g.problems.some((p) => p.includes('c-a') && p.includes('ok') && /duplicate/i.test(p)));
  // And survey, which is where someone is looking, reports them.
  const reported = survey(dir).problems;
  assert.ok(reported.some((p) => p.includes('Declines')));
});
