import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pick, stillNeeded, rankByCase } from '../lib/pick.mjs';
import { makeTopic, run, survey, CAP_GOAL } from './helpers.mjs';

const item = (label, goals = ['g1']) => {
  const [activity, scenario, id] = label.split('/');
  return { activity, scenario, id, label, goals };
};
const seen = (label, at) => ({ at, goal: 'g1', label });

const A1 = item('a-x/s1/q1');
const A2 = item('a-x/s1/q2');
const B1 = item('a-x/s2/q1');

test('nothing served: the first item in bank order, not a repeat', () => {
  const r = pick([A1, A2], [], { goal: 'g1' });
  assert.equal(r.item.label, 'a-x/s1/q1');
  assert.equal(r.repeat, false);
  assert.equal(r.lastServed, null);
});

test('an unserved item beats a served one', () => {
  const r = pick([A1, A2], [seen('a-x/s1/q1', '2026-10-01T10:00:00Z')], { goal: 'g1' });
  assert.equal(r.item.label, 'a-x/s1/q2');
  assert.equal(r.repeat, false);
});

test('all served: the oldest latest-at, a repeat, with that date', () => {
  const log = [
    seen('a-x/s1/q1', '2026-10-03T10:00:00Z'),
    seen('a-x/s1/q2', '2026-10-01T10:00:00Z'),
    seen('a-x/s1/q2', '2026-10-05T10:00:00Z'),
    seen('a-x/s1/q1', '2026-10-02T10:00:00Z'),
  ];
  const r = pick([A1, A2], log, { goal: 'g1' });
  assert.equal(r.item.label, 'a-x/s1/q1');
  assert.equal(r.repeat, true);
  assert.equal(r.lastServed, '2026-10-03T10:00:00Z');
});

test('after prefers an unseen item in the same scenario group', () => {
  const r = pick([A1, B1], [], { goal: 'g1', after: 'a-x/s2/q9' });
  assert.equal(r.item.label, 'a-x/s2/q1');
});

test('goal and activity filters', () => {
  const other = item('b-y/s1/q1', ['g2']);
  assert.equal(pick([other, A1], [], { goal: 'g1' }).item.label, 'a-x/s1/q1');
  assert.equal(pick([A1, other], [], { activity: 'b-y' }).item.label, 'b-y/s1/q1');
});

test('log lines that match no candidate are ignored', () => {
  const r = pick([A1, A2], [{ at: '2026-10-01T10:00:00Z', goal: 'g1', label: 'CATCH: subject/verb agreement' }], { goal: 'g1' });
  assert.equal(r.item.label, 'a-x/s1/q1');
  assert.equal(r.repeat, false);
});

test('a log line whose at does not parse is skipped, not sorted as NaN', () => {
  const log = [
    seen('a-x/s1/q1', 'yesterday'),
    seen('a-x/s1/q1', '2026-10-03T10:00:00Z'),
    seen('a-x/s1/q2', '2026-10-01T10:00:00Z'),
    seen('a-x/s1/q2', 'not a date'),
  ];
  const r = pick([A1, A2], log, { goal: 'g1' });
  assert.equal(r.item.label, 'a-x/s1/q2');
  assert.equal(r.lastServed, '2026-10-01T10:00:00Z');
});

test('no candidates gives null', () => {
  assert.equal(pick([A1], [], { goal: 'nope' }), null);
});

// --- cases ------------------------------------------------------------------------------------
const CG = { id: 'g1', bar: 'one unaided pass', cases: [{ id: 'easy', text: '' }, { id: 'hard', text: '' }] };
const withCases = (label, cases, goals = ['g1']) => ({ ...item(label, goals), cases });
const passed = (cases, at) => ({ at, goal: 'g1', label: 'x/y/z', unaided: 'yes', criterion: 'met', cases });

test('stillNeeded: unmet goal, unpassed listed case; not needed once its cases or its goal are met', () => {
  const q = withCases('a-x/s1/q1', { g1: ['easy'] });
  const goals = new Map([['g1', CG]]);
  assert.equal(stillNeeded(q, goals, new Map([['g1', []]])), true);
  assert.equal(stillNeeded(q, goals, new Map([['g1', [passed(['easy'], '2026-10-01T00:00:00Z')]]])), false);
  // A grandfathered question, listing no case for a goal with cases, is needed while it is unmet.
  const old = item('a-x/s1/q2');
  assert.equal(stillNeeded(old, goals, new Map([['g1', [passed(['easy'], '2026-10-01T00:00:00Z')]]])), true);
  assert.equal(stillNeeded(old, goals, new Map([['g1', [passed(['easy', 'hard'], '2026-10-01T00:00:00Z')]]])), false);
});

test('study prefers a question exercising a case not yet passed', () => {
  const easy = withCases('a-x/s1/q1', { g1: ['easy'] });
  const hard = withCases('a-x/s2/q1', { g1: ['hard'] });
  const caseRank = (it) => (it.cases.g1.includes('hard') ? 0 : 1);
  assert.equal(pick([easy, hard], [], { goal: 'g1', caseRank }).item.label, 'a-x/s2/q1');
});

test('review prefers the case passed longest ago, before unserved', () => {
  const easy = withCases('a-x/s1/q1', { g1: ['easy'] });
  const hard = withCases('a-x/s2/q1', { g1: ['hard'] });
  const last = { easy: Date.parse('2026-10-03T00:00:00Z'), hard: Date.parse('2026-10-01T00:00:00Z') };
  const caseRank = (it) => Math.min(...it.cases.g1.map((c) => last[c]));
  const log = [seen('a-x/s2/q1', '2026-10-01T00:00:00Z')];
  assert.equal(pick([easy, hard], log, { goal: 'g1', review: true, caseRank }).item.label, 'a-x/s2/q1');
});

test('study: an earlier unserved question still needed blocks a later one in its scenario', () => {
  const q1 = withCases('a-x/s1/q1', { g1: ['easy'] });
  const q2 = withCases('a-x/s1/q2', { g1: ['hard'] });
  const caseRank = (it) => (it.cases.g1.includes('hard') ? 0 : 1);
  assert.equal(pick([q1, q2], [], { goal: 'g1', caseRank }).item.label, 'a-x/s1/q1');
  // Review keeps no scenario order.
  assert.equal(pick([q1, q2], [], { goal: 'g1', caseRank, review: true }).item.label, 'a-x/s1/q2');
});

test('rankByCase: never passed ranks -Infinity in review; a question listing no case covers every case', () => {
  const g = { ...CG, cases: [...CG.cases, { id: 'mid', text: '' }] };
  const attempts = [passed(['easy'], '2026-10-01T00:00:00Z'), passed(['hard'], '2026-10-02T00:00:00Z')];
  const review = rankByCase(g, attempts, { review: true });
  assert.equal(review(withCases('a-x/s1/q1', { g1: ['mid'] })), -Infinity);
  assert.equal(review(withCases('a-x/s1/q1', { g1: ['hard', 'easy'] })), Date.parse('2026-10-01T00:00:00Z'));
  assert.equal(review(item('a-x/s1/q1')), -Infinity);
  const study = rankByCase(g, attempts);
  assert.equal(study(withCases('a-x/s1/q1', { g1: ['easy'] })), 1);
  assert.equal(study(item('a-x/s1/q1')), 0);
  assert.equal(rankByCase({ id: 'g1', bar: 'one unaided pass', cases: [] }, attempts)(item('a-x/s1/q1')), 0);
});

// The review's reproduction: easy passed live, q3 [hard] served and passed, mid not banked.
const MIDG = { ...CG, cases: [...CG.cases, { id: 'mid', text: '' }] };
const midLog = [passed(['easy'], '2026-10-01T00:00:00Z'), { ...passed(['hard'], '2026-10-02T00:00:00Z'), label: 'a-x/s1/q3' }];

test('study never serves a question no longer needed, even with nothing else on offer', () => {
  const q1 = withCases('a-x/s1/q1', { g1: ['easy'] });
  const q3 = withCases('a-x/s1/q3', { g1: ['hard'] });
  const goals = new Map([['g1', MIDG]]);
  const needed = (it) => stillNeeded(it, goals, new Map([['g1', midLog]]));
  assert.equal(needed(q1), false);
  assert.equal(pick([q1, q3], midLog, { goal: 'g1', needed, caseRank: rankByCase(MIDG, midLog) }), null);
  // Review still serves it.
  assert.equal(pick([q1, q3], midLog, { goal: 'g1', needed, review: true }).item.label, 'a-x/s1/q1');
});

test('study on a met goal serves a repeat, as before', () => {
  const q1 = withCases('a-x/s1/q1', { g1: ['easy'] });
  const q2 = withCases('a-x/s2/q1', { g1: ['hard'] });
  const log = [{ ...passed(['easy', 'hard'], '2026-10-02T00:00:00Z'), label: 'a-x/s2/q1' }, seen('a-x/s1/q1', '2026-10-03T00:00:00Z')];
  const needed = (it) => stillNeeded(it, new Map([['g1', CG]]), new Map([['g1', log]]));
  const r = pick([q1, q2], log, { goal: 'g1', needed, goalMet: true });
  assert.equal(r.item.label, 'a-x/s2/q1');
  assert.equal(r.repeat, true);
});

test('--activity with every goal met serves as before; with one needed, only the needed', () => {
  const q1 = withCases('a-x/s1/q1', { g1: ['easy'] });
  const q2 = withCases('a-x/s2/q1', { g1: ['hard'] });
  const log = [seen('a-x/s1/q1', '2026-10-01T00:00:00Z'), seen('a-x/s2/q1', '2026-10-02T00:00:00Z')];
  assert.equal(pick([q1, q2], log, { activity: 'a-x', needed: () => false }).item.label, 'a-x/s1/q1');
  assert.equal(pick([q1, q2], log, { activity: 'a-x', needed: (it) => it === q2 }).item.label, 'a-x/s2/q1');
});

test('CLI study on a met goal serves a repeat', () => {
  const dir = makeTopic({ goals: CAP_GOAL('g-one'), activities: '### a-x\n- **checks:** g-one\n' });
  bank(dir);
  mkdirSync(join(dir, 'evidence'), { recursive: true });
  writeFileSync(join(dir, 'evidence', 'attempts.jsonl'),
    JSON.stringify({ at: '2026-10-01T00:00:00Z', goal: 'g-one', label: 'a-x/crumbs/v1', unaided: 'yes', criterion: 'met' }) + '\n');
  const r = run('next-item.mjs', [dir, '--goal', 'g-one']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /label: a-x\/crumbs\/v1\n[\s\S]*repeat: yes/);
  assert.equal(run('next-item.mjs', [dir, '--activity', 'a-x']).code, 0);
});

test('CLI study exits 2 when only questions no longer needed are banked', () => {
  const dir = makeTopic({
    goals: CAP_GOAL('g1', '- **cases:**\n  - `easy`: e\n  - `hard`: h\n  - `mid`: m\n'),
    activities: '### a-x\n- **checks:** g1\n',
  });
  const put = (rel, text) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  put('tasks/a-x/s1.md', '### q1\n\nEasy.\n\n### q3\n\nHard.\n');
  put('rubrics/a-x/s1.md', '### q1\n\n- **goal:** g1\n- **answer:** X.\n- **cases:** easy\n\n### q3\n\n- **goal:** g1\n- **answer:** Y.\n- **cases:** hard\n');
  put('evidence/attempts.jsonl', midLog.map((r) => JSON.stringify(r)).join('\n') + '\n');
  const r = run('next-item.mjs', [dir, '--goal', 'g1']);
  assert.equal(r.code, 2, r.stdout);
  assert.match(r.stderr, /no bank questions for g1/);
  assert.equal(run('next-item.mjs', [dir, '--goal', 'g1', '--review']).code, 0);
});

test('study: an earlier question no longer needed is skipped', () => {
  const q1 = withCases('a-x/s1/q1', { g1: ['easy'] });
  const q2 = withCases('a-x/s1/q2', { g1: ['hard'] });
  const needed = (it) => it !== q1;
  const caseRank = (it) => (it.cases.g1.includes('hard') ? 0 : 1);
  assert.equal(pick([q1, q2], [], { goal: 'g1', needed, caseRank }).item.label, 'a-x/s1/q2');
});

test('study: a question carrying another goal\'s undemonstrated case blocks this goal\'s later one', () => {
  const b = withCases('a-x/s1/q1', { g2: ['other'] }, ['g2']);
  const a = withCases('a-x/s1/q2', {}, ['g1']);
  // Every candidate waiting: the question holding up the earliest one is served instead.
  const r = pick([b, a], [], { goal: 'g1' });
  assert.equal(r.item.label, 'a-x/s1/q1');
  assert.equal(r.keepsOrder, 'a-x/s1');
  assert.equal(r.repeat, false);
  assert.equal(pick([b, a], [], { goal: 'g3' }), null);
  assert.equal(pick([b, a], [], { goal: 'g1', needed: (it) => it !== b }).item.label, 'a-x/s1/q2');
  assert.equal(pick([b, a], [seen('a-x/s1/q1', '2026-10-01T00:00:00Z')], { goal: 'g1' }).item.label, 'a-x/s1/q2');
});

test('CLI serves another goal\'s blocking question first, saying so', () => {
  const dir = makeTopic({
    goals: CAP_GOAL('g-one') + '\n' + CAP_GOAL('g-two', '- **cases:**\n  - `easy`: the plain one\n  - `hard`: the tricky one\n'),
    activities: '### a-x\n- **checks:** g-one, g-two\n',
  });
  const put = (rel, text) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  put('tasks/a-x/s1.md', '### q1\n\nFirst.\n\n### q2\n\nSecond.\n');
  put('rubrics/a-x/s1.md', '### q1\n\n- **goal:** g-two\n- **answer:** X.\n- **cases:** hard\n\n### q2\n\n- **goal:** g-one\n- **answer:** Y.\n');
  const r = run('next-item.mjs', [dir, '--goal', 'g-one']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /label: a-x\/s1\/q1\ngoals: g-two\n/);
  assert.match(r.stdout, /cases: g-two: hard/);
  assert.match(r.stdout, /served first: keeps a-x\/s1 in order/);
  assert.doesNotMatch(run('next-item.mjs', [dir, '--goal', 'g-two']).stdout, /served first/);
});

test('CLI study serves the unpassed case; --review rotates to the case passed longest ago', () => {
  const dir = makeTopic({
    goals: CAP_GOAL('g-one', '- **cases:**\n  - `easy`: the plain one\n  - `hard`: the tricky one\n'),
    activities: '### a-x\n- **checks:** g-one\n',
  });
  const put = (rel, text) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  put('tasks/a-x/s1.md', '### q1\n\nEasy.\n');
  put('rubrics/a-x/s1.md', '### q1\n\n- **goal:** g-one\n- **answer:** X.\n- **cases:** easy\n');
  put('tasks/a-x/s2.md', '### q1\n\nHard.\n');
  put('rubrics/a-x/s2.md', '### q1\n\n- **goal:** g-one\n- **answer:** X.\n- **cases:** hard\n');
  // Passes are recorded under live labels, so the bank's own served dates point the other way and
  // only the case rules can choose as asserted.
  const att = (label, cases, at, unaided = 'yes') => JSON.stringify({ at, goal: 'g-one', label, unaided, criterion: 'met', cases });
  const log = (...lines) => writeFileSync(join(dir, 'evidence', 'attempts.jsonl'), lines.join('\n') + '\n');
  mkdirSync(join(dir, 'evidence'), { recursive: true });
  log(att('gen/e1', ['easy'], '2026-10-01T00:00:00Z'));
  assert.match(run('next-item.mjs', [dir, '--goal', 'g-one']).stdout, /label: a-x\/s2\/q1/);
  log(
    att('gen/e1', ['easy'], '2026-10-01T00:00:00Z'),
    att('gen/h1', ['hard'], '2026-10-02T00:00:00Z'),
    att('a-x/s2/q1', ['hard'], '2026-10-03T00:00:00Z', 'no'),
    att('a-x/s1/q1', ['easy'], '2026-10-04T00:00:00Z', 'no'),
  );
  const r = run('next-item.mjs', [dir, '--goal', 'g-one', '--review']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /label: a-x\/s1\/q1/);
});

function bank(dir) {
  const put = (rel, text) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  put('tasks/a-x/crumbs.md', '### v1\n\nName a risk.\n');
  put('rubrics/a-x/crumbs.md', '### v1\n\n- **goal:** g-one\n- **answer:** Cost.\n- **tutor note:** Push on scope.\n');
}

test('CLI prints the label, repeat line and learner view', () => {
  const dir = makeTopic({ goals: CAP_GOAL('g-one') });
  bank(dir);
  const r = run('next-item.mjs', [dir, '--goal', 'g-one']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /label: a-x\/crumbs\/v1/);
  assert.match(r.stdout, /repeat: no/);
  assert.match(r.stdout, /--- learner sees ---\nName a risk\./);
  assert.doesNotMatch(r.stdout, /--- key ---/);
});

test('CLI --key adds the key and the tutor note', () => {
  const dir = makeTopic({ goals: CAP_GOAL('g-one') });
  bank(dir);
  const r = run('next-item.mjs', [dir, '--goal', 'g-one', '--key']);
  assert.match(r.stdout, /--- key ---\nCost\./);
  assert.match(r.stdout, /--- tutor note ---\nPush on scope\./);
});

test('CLI with an unknown goal exits 2 with the message', () => {
  const dir = makeTopic({ goals: CAP_GOAL('g-one') });
  bank(dir);
  const r = run('next-item.mjs', [dir, '--goal', 'nope']);
  assert.equal(r.code, 2);
  assert.match(r.stderr + r.stdout, /no bank questions for nope; run the activity's generator live/);
});

test('CLI never serves a dropped activity or a folder with no entry', () => {
  const dir = makeTopic({
    goals: CAP_GOAL('g-one'),
    activities: '### a-x\n- **checks:** g-one\n- **status:** dropped\n',
  });
  bank(dir);
  assert.equal(run('next-item.mjs', [dir, '--goal', 'g-one']).code, 2);
  const orphan = makeTopic({ goals: CAP_GOAL('g-one'), activities: '### a-other\n- **checks:** g-one\n' });
  bank(orphan);
  assert.equal(run('next-item.mjs', [orphan, '--goal', 'g-one']).code, 2);
});

test('CLI serves a folder whose activity has a live entry', () => {
  const dir = makeTopic({ goals: CAP_GOAL('g-one'), activities: '### a-x\n- **checks:** g-one\n' });
  bank(dir);
  const r = run('next-item.mjs', [dir, '--goal', 'g-one']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /label: a-x\/crumbs\/v1/);
});

test('survey reports a tasks folder with no entry in activities.md, and only folders', () => {
  const dir = makeTopic({ goals: CAP_GOAL('g-one'), activities: '### a-other\n- **checks:** g-one\n' });
  bank(dir);
  writeFileSync(join(dir, 'tasks', 'a-single.md'), '### v1\n\nA single-file bank.\n');
  const { problems } = survey(dir);
  assert.ok(problems.includes('tasks/a-x/ is a bank with no entry in activities.md'), problems.join('\n'));
  assert.ok(!problems.some((p) => p.includes('a-single')), problems.join('\n'));
  const live = makeTopic({ goals: CAP_GOAL('g-one'), activities: '### a-x\n- **checks:** g-one\n' });
  bank(live);
  assert.ok(!survey(live).problems.some((p) => p.includes('no entry in activities.md')));
});

test('CLI --key on an mcq prints the scenario key and the numbered correct choice', () => {
  const dir = makeTopic({ goals: CAP_GOAL('g-one') });
  const put = (rel, text) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  put('tasks/a-x/kettle.md', '# K\n\nA kettle app.\n\n### m1\n\nWhich?\n\n1. Kettle sleeps\n2. Kettle never sleeps\n');
  put('rubrics/a-x/kettle.md', '# K key\n\nMust name: sleep.\n\n### m1\n\n- **goal:** g-one\n- **type:** mcq\n- **answer:** 2\n');
  const r = run('next-item.mjs', [dir, '--goal', 'g-one', '--key']);
  assert.match(r.stdout, /--- key ---\nMust name: sleep\.\n2\. Kettle never sleeps/);
});
