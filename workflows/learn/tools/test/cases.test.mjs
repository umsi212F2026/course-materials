// A goal may name cases that must each be demonstrated: parsing the slot, then the bar per case.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTopic, survey, CAP_GOAL } from './helpers.mjs';
import { parseCases } from './../lib/slots.mjs';
import { readGoals } from './../lib/topic.mjs';
import { met, casesDemonstrated } from './../lib/bars.mjs';

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

test('casesDemonstrated counts a grandfathered attempt toward every case; cases: [] toward none', () => {
  assert.deepEqual(casesDemonstrated(G(), [pass(null)]), { passed: 2, total: 2 });
  assert.deepEqual(casesDemonstrated(G(), [pass([])]), { passed: 0, total: 2 });
});

test('a cases slot that yields no case, or has stray text, or is empty, is a problem', () => {
  const p = (v) => parseCases(v).problems;
  assert.equal(p('a, b').length, 1);
  assert.equal(p('- declines: no backticks').length, 1);
  assert.equal(p('- `declines` no colon').length, 1);
  assert.equal(p('stray - `ok`: fine').length, 1);
  assert.deepEqual(parseCases('stray - `ok`: fine').cases, [{ id: 'ok', text: 'fine' }]);
  assert.equal(p('').length, 1);
  assert.deepEqual(p(undefined), []);
  const dir = makeTopic({ goals: CAP_GOAL('c-a', '- **cases:** a, b\n') });
  assert.ok(readGoals(dir).goals[0].problems.some((x) => x.includes('c-a')));
});

// --- rubric questions and cases, as survey reports them -----------------------------------
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

function bankTopic(goals, rubric) {
  const dir = makeTopic({ goals, activities: '### a-x\n- **checks:** c-a, c-b\n' });
  const put = (rel, text) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  put('tasks/a-x/s1.md', '### q1\n\nName it.\n');
  put('rubrics/a-x/s1.md', rubric);
  return survey(dir).problems;
}
const WITH = CAP_GOAL('c-a', block([['one', 'first'], ['two', 'second']])) + '\n' + CAP_GOAL('c-b');

test('a question listing a case its goal does not define is reported', () => {
  const found = bankTopic(WITH, '### q1\n\n- **goal:** c-a\n- **answer:** X.\n- **cases:** one, nope\n');
  assert.ok(found.some((p) => p.includes('a-x/s1/q1') && p.includes('nope') && p.includes('c-a')), found.join('\n'));
  assert.ok(!found.some((p) => p.includes('lists no case')), found.join('\n'));
});

test('a question on a goal with cases that lists none for it is reported', () => {
  const found = bankTopic(WITH, '### q1\n\n- **goal:** c-a\n- **answer:** X.\n');
  assert.ok(found.some((p) => p.includes('a-x/s1/q1') && p.includes('c-a') && /lists no case/.test(p)), found.join('\n'));
});

test('a folder question naming no goal is reported', () => {
  const found = bankTopic(WITH, '### q1\n\n- **answer:** X.\n');
  assert.ok(found.some((p) => p.includes('a-x/s1/q1') && /names no goal/.test(p)), found.join('\n'));
});

test('a topic with no cases anywhere raises no case problems', () => {
  const found = bankTopic(CAP_GOAL('c-a') + '\n' + CAP_GOAL('c-b'), '### q1\n\n- **goal:** c-a\n- **answer:** X.\n');
  assert.ok(!found.some((p) => p.includes('a-x/s1/q1')), found.join('\n'));
});

test('a question on a goal with cases that lists its cases raises nothing', () => {
  const found = bankTopic(WITH, '### q1\n\n- **goal:** c-a\n- **answer:** X.\n- **cases:** one, two\n');
  assert.ok(!found.some((p) => p.includes('a-x/s1/q1')), found.join('\n'));
});
