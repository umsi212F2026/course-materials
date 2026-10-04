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

// --- the bar, per case ---------------------------------------------------------
import { met, casesDemonstrated } from './../lib/bars.mjs';

const G = (bar = 'one unaided pass', ids = ['a', 'b']) => ({
  id: 'c-x',
  bar,
  cases: ids.map((id) => ({ id, text: id })),
});
const pass = (cases, extra = {}) => ({ unaided: 'yes', criterion: 'met', ...(cases ? { cases } : {}), ...extra });

test('a goal with cases is unmet until each case has its pass', () => {
  assert.equal(met(G(), [pass(['a'])]), false);
  assert.equal(met(G(), [pass(['a']), pass(['b'])]), true);
  assert.equal(met(G(), [pass(['a', 'b'])]), true);
});

test('a pass carrying no cases counts toward every case (grandfathered)', () => {
  assert.equal(met(G(), [pass(null)]), true);
});

test('the learner\'s own word meets a goal with cases', () => {
  assert.equal(met(G(), [{ outcome: 'declared' }]), true);
  assert.equal(met(G(), [{ outcome: 'elsewhere' }]), true);
});

test('one production pass needs the production tag on each case', () => {
  const g = G('one production pass');
  assert.equal(met(g, [pass(['a'], { tags: ['production'] }), pass(['b'])]), false);
  assert.equal(met(g, [pass(['a'], { tags: ['production'] }), pass(['b'], { tags: ['production'] })]), true);
});

test('a goal with no cases is unchanged', () => {
  assert.equal(met({ id: 'c-y', bar: 'one unaided pass', cases: [] }, [pass(['zzz'])]), true);
  assert.equal(met({ id: 'c-y', bar: 'one unaided pass' }, []), false);
});

test('casesDemonstrated counts the cases passed, null without cases', () => {
  assert.deepEqual(casesDemonstrated(G(), [pass(['a'])]), { passed: 1, total: 2 });
  assert.equal(casesDemonstrated({ id: 'c-y', bar: 'one unaided pass', cases: [] }, []), null);
});
