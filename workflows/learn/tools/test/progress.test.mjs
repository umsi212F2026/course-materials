import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProgress, renderFull, renderSet } from '../lib/progress.mjs';
import { mkdtempSync, readdirSync, mkdirSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeTopic, run, CAP_GOAL } from './helpers.mjs';

// A survey-shaped object from compact rows: [id, group, state, attempts, extra]. state is the
// sequence state (open, met, deferred, retired); sets lists ids.
function fake(rows, sets, { decided = true, dir = '/x/cloud-hosting', current } = {}) {
  const by = new Map();
  const rowOf = ([id, group, state, attempts = 0, extra = {}]) => ({
    id,
    group,
    capability: null,
    met: state === 'met',
    deferred: state === 'deferred' ? 'PS3' : null,
    retired: state === 'retired' ? 'x' : null,
    attempts,
    last: null,
    ...extra,
  });
  const state = new Map(rows.map((r) => [r[0], r[2]]));
  for (const r of rows) by.set(r[1], [...(by.get(r[1]) ?? []), rowOf(r)]);
  const groups = [...by].map(([name, goals]) => ({ name, goals }));
  const seqSets = sets.map((ids) => ({ goals: ids.map((id) => ({ id, state: state.get(id) })) }));
  const idx = seqSets.findIndex((s) => s.goals.some((g) => g.state === 'open'));
  const found = idx === -1 ? null : idx;
  return { dir, groups, sequence: { decided, sets: seqSets, current: current === undefined ? found : current } };
}

const W = (n, state, attempts = 0, extra) => [`w${n}`, 'vocabulary', state, attempts, extra];
const wordSet = (states) => states.map((s, i) => W(i + 1, ...[].concat(s)));

test('marks are ordered met, tried, not started, deferred; retired is left out of marks and count', () => {
  const rows = wordSet(['deferred', 'open', ['open', 2], 'met', 'retired', 'met']);
  const v = buildProgress(fake(rows, [rows.map((r) => r[0])]));
  const set = v.sets[0];
  assert.deepEqual(set.goals.map((g) => g.state), ['met', 'met', 'tried', 'open', 'deferred']);
  assert.equal(set.goals.map((g) => g.mark).join(''), '##~.>');
  assert.equal(set.met, 2);
  assert.equal(set.total, 5);
  assert.equal(set.goals[4].where, 'PS3');
});

test('labels: each group, a vocabulary set as Words, a mixed set as Set n', () => {
  const rows = [
    ['o1', 'orientation', 'met'],
    ['v1', 'vocabulary', 'open'],
    ['c1', 'capabilities', 'open'],
    ['m1', 'quality', 'open'],
    ['m2', 'speed', 'open'],
  ];
  const v = buildProgress(fake(rows, [['o1'], ['v1'], ['c1'], ['m1', 'm2']]));
  assert.deepEqual(v.sets.map((s) => s.label), ['Orientation', 'Words', 'Capabilities', 'Set 4']);
});

test('header: next, every set done, and not decided', () => {
  const open = [['a', 'orientation', 'open']];
  const done = [['a', 'orientation', 'met']];
  assert.match(renderFull(buildProgress(fake(open, [['a']]))), /^cloud-hosting - set 1 of 1 is next\n/);
  assert.match(renderFull(buildProgress(fake(done, [['a']]))), /^cloud-hosting - every set is done\n/);
  assert.match(
    renderFull(buildProgress(fake(open, [['a']], { decided: false }))),
    /^cloud-hosting - sequence not decided yet - set 1 of 1 is next\n/
  );
  assert.match(
    renderFull(buildProgress(fake(done, [['a']], { decided: false }))),
    /^cloud-hosting - sequence not decided yet - every set is done\n/
  );
});

test('<- next is on the current set only; deferred-only and all-retired sets are never current', () => {
  const rows = [
    ['a', 'orientation', 'met'],
    ['b', 'vocabulary', 'deferred'],
    ['c', 'capabilities', 'retired'],
    ['d', 'quality', 'open'],
  ];
  const v = buildProgress(fake(rows, [['a'], ['b'], ['c'], ['d']]));
  assert.equal(v.current, 4);
  const text = renderFull(v);
  assert.equal(text.match(/<- next/g).length, 1);
  assert.match(text, / 4 Quality .*<- next/);
  assert.match(text, / 3 Capabilities .* 0\/0\n/);
  assert.match(text, / 2 Words .*> {2}0\/1\n/);
});

test('columns line up when labels and marks differ in length', () => {
  const rows = [
    ['o1', 'orientation', 'met'],
    ...wordSet(['met', 'open', 'open']),
    ['m1', 'quality', 'open'],
    ['m2', 'speed', 'open'],
  ];
  const lines = renderFull(buildProgress(fake(rows, [['o1'], ['w1', 'w2', 'w3'], ['m1', 'm2']]))).split('\n');
  const body = lines.filter((l) => /^ \d /.test(l));
  assert.equal(body.length, 3);
  const fractions = body.map((l) => l.search(/\d\/\d/));
  assert.equal(new Set(fractions).size, 1);
  assert.match(body[0], /^ 1 Orientation {2}# {4}1\/1$/);
  assert.match(body[1], /^ 2 Words {8}#\.\. {2}1\/3 {3}<- next$/);
});

test('next-set line: tried first, capability collapsed with a fraction, deferred in parentheses', () => {
  const cap = (id, state, attempts = 0) => [id, 'capabilities', state, attempts, { capability: 'weigh-hosting-plans' }];
  const rows = [cap('p1', 'met'), cap('p2', 'open', 1), cap('p3', 'open'), ['z', 'capabilities', 'open'], ['d', 'capabilities', 'deferred']];
  const v = buildProgress(fake(rows, [rows.map((r) => r[0])]));
  assert.deepEqual(v.next, [
    { name: 'weigh-hosting-plans 1/3', tried: true },
    { name: 'z', tried: false },
  ]);
  assert.deepEqual(v.deferred, [{ id: 'd', where: 'PS3' }]);
  assert.match(renderFull(v), / Next set: weigh-hosting-plans 1\/3 \(in progress\), z {2}\(d deferred: PS3\)\n/);
});

test('next-set line: six names then ..., wrapped with a one-space indent, absent when all done', () => {
  const rows = wordSet(Array(8).fill('open')).map((r, i) => (i === 7 ? [r[0], r[1], r[2], 1] : r));
  const v = buildProgress(fake(rows, [rows.map((r) => r[0])]));
  assert.equal(v.next.length, 8);
  assert.equal(v.next[0].name, 'w8');
  const text = renderFull(v);
  assert.match(text, / Next set: w8 \(in progress\), w1, w2, w3, w4, w5, \.\.\.\n/);
  const long = buildProgress(fake(rows, [rows.map((r) => r[0])], { dir: '/x/t' }));
  long.deferred = Array.from({ length: 5 }, (_, i) => ({ id: `long-goal-id-${i}`, where: 'a later course' }));
  const lines = renderFull(long).split('\n');
  const start = lines.findIndex((l) => l.startsWith(' Next set:'));
  assert.ok(lines[start + 1].startsWith(' ') && !lines[start + 1].startsWith('  '));
  assert.ok(lines.every((l) => l.length <= 96));
  const done = buildProgress(fake([['a', 'orientation', 'met']], [['a']]));
  assert.doesNotMatch(renderFull(done), /Next set/);
});

test('renderSet: the current set and a later one', () => {
  const rows = [...wordSet(['met', 'met', 'met', 'open', 'open', 'open', 'open', 'deferred']), ['c1', 'capabilities', 'open', 1], ['c2', 'capabilities', 'open']];
  const v = buildProgress(fake(rows, [rows.slice(0, 8).map((r) => r[0]), ['c1', 'c2']]));
  assert.equal(renderSet(v, 1), 'Words  ###....>  3/8   (set 1 of 2)');
  assert.equal(renderSet(v, 2), 'Capabilities  ~.  0/2   (set 2 of 2; set 1 is still next)');
});

test('renderSet: an earlier, finished set says next, not still next', () => {
  const rows = [['o1', 'orientation', 'met'], ['v1', 'vocabulary', 'open']];
  const v = buildProgress(fake(rows, [['o1'], ['v1']]));
  assert.equal(renderSet(v, 1), 'Orientation  #  1/1   (set 1 of 2; set 2 is next)');
  assert.equal(renderSet(v, 2), 'Words  .  0/1   (set 2 of 2)');
});

test('a set with no goal yet is labelled by its one written item', () => {
  const s = fake([['o1', 'orientation', 'met']], [['o1'], [], [], []]);
  s.sequence.sets[0].items = ['orientation'];
  s.sequence.sets[1].items = ['vocabulary'];
  s.sequence.sets[2].items = ['capabilities'];
  s.sequence.sets[3].items = ['a', 'b'];
  assert.deepEqual(buildProgress(s).sets.map((x) => x.label), ['Orientation', 'Words', 'Capabilities', 'Set 4']);
});

test('finished: no goal tried or open, so met, deferred or empty', () => {
  const rows = [['a', 'orientation', 'met'], ['b', 'vocabulary', 'deferred'], ['c', 'capabilities', 'open', 1], ['d', 'quality', 'retired']];
  const v = buildProgress(fake(rows, [['a'], ['b'], ['c'], ['d']]));
  assert.deepEqual(v.sets.map((x) => x.finished), [true, true, false, true]);
});

test('output is ASCII only', () => {
  const rows = [...wordSet(['met', ['open', 1], 'deferred']), ['a', 'orientation', 'open']];
  const v = buildProgress(fake(rows, [['a'], ['w1', 'w2', 'w3']]));
  for (const s of [renderFull(v), renderSet(v, 2), JSON.stringify(v)]) assert.match(s, /^[\x00-\x7F]*$/);
});

const CLI_GOALS = `### \`o-start\`\n- **goal:** Start.\n- **criterion:** Started.\n\n${CAP_GOAL('do-a-thing')}`;

test('CLI: draws the view and is not decided without a Sequence section', () => {
  const dir = makeTopic({ goals: CLI_GOALS });
  const r = run('progress.mjs', [dir]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /^topic - sequence not decided yet - set 1 of 1 is next\n/);
  assert.match(r.stdout, /<- next/);
  assert.match(r.stdout, / # met {2}~ in progress {2}\. not started {2}> deferred\n$/);
});

test('CLI: --json keys, --set line, and usage errors exit 1', () => {
  const dir = makeTopic({ goals: CLI_GOALS });
  const j = JSON.parse(run('progress.mjs', [dir, '--json']).stdout);
  assert.deepEqual(Object.keys(j), ['topic', 'decided', 'current', 'sets', 'next', 'deferred']);
  assert.deepEqual(Object.keys(j.sets[0]), ['number', 'label', 'met', 'total', 'finished', 'goals']);
  assert.equal(j.sets[0].finished, false);
  assert.deepEqual(Object.keys(j.sets[0].goals[0]), ['id', 'state', 'mark', 'capability', 'where']);
  const one = run('progress.mjs', [dir, '--set', '1']);
  assert.equal(one.code, 0, one.stderr);
  assert.match(one.stdout, /\(set 1 of \d+\)\n$/);
  assert.equal(run('progress.mjs', [dir, '--set', '99']).code, 1);
  assert.equal(run('progress.mjs', [dir, '--set', 'x']).code, 1);
  assert.equal(run('progress.mjs', [dir, '--bogus']).code, 1);
  assert.equal(run('progress.mjs', []).code, 1);
  assert.equal(run('progress.mjs', [dir + '-missing']).code, 1);
});

test('current is the survey\'s own, converted to 1-based, not recomputed', () => {
  const rows = [W(1, 'open'), W(2, 'open')];
  const v = buildProgress(fake(rows, [['w1'], ['w2']], { current: 1 }));
  assert.equal(v.current, 2);
  assert.deepEqual(v.next.map((n) => n.name), ['w2']);
  assert.equal(buildProgress(fake(rows, [['w1'], ['w2']], { current: null })).current, null);
});

test('CLI: a fresh template topic labels its empty sets Orientation, Words, Capabilities', () => {
  const parent = mkdtempSync(join(tmpdir(), 'learn-progress-'));
  assert.equal(run('new-topic.mjs', ['--dir', parent, 'area']).code, 0);
  const j = JSON.parse(run('progress.mjs', [join(parent, readdirSync(parent)[0]), '--json']).stdout);
  assert.deepEqual(j.sets.map((s) => s.label), ['Orientation', 'Words', 'Capabilities']);
});

const ORIENT = '- **group:** orientation\n';
const AFTER_GOALS = [CAP_GOAL('o-a', ORIENT), CAP_GOAL('o-b', ORIENT), CAP_GOAL('c-x')].join('\n');
const PASS = '{"unaided":"yes","criterion":"met"}';
const afterTopic = () =>
  makeTopic({ goals: AFTER_GOALS, activities: '### a-x\n- **serves:** all\n' });

test('CLI --after: a mid-set attempt prints the one-set line, the attempt that finishes the set the full view', () => {
  const dir = afterTopic();
  run('record-attempt.mjs', [dir, 'o-a', 'a-x/1', '--axes', PASS]);
  const mid = run('progress.mjs', [dir, '--after', 'o-a']);
  assert.equal(mid.code, 0, mid.stderr);
  assert.equal(mid.stdout, 'Orientation  #.  1/2   (set 1 of 2)\n');
  run('record-attempt.mjs', [dir, 'o-b', 'a-x/2', '--axes', PASS]);
  const done = run('progress.mjs', [dir, '--after', 'o-b']);
  assert.match(done.stdout, /^topic - sequence not decided yet - set 2 of 2 is next\n/);
  assert.match(done.stdout, / # met /);
});

test('CLI --after: a deferral that finishes a set prints the full view', () => {
  const dir = afterTopic();
  run('record-attempt.mjs', [dir, 'o-a', 'a-x/1', '--axes', PASS]);
  assert.equal(run('record-status.mjs', [dir, 'deferred', 'o-b', '--where', 'PS3']).code, 0);
  assert.match(run('progress.mjs', [dir, '--after', 'o-b']).stdout, /^topic - /);
});

test('CLI --after: a retired goal is placed in its own set', () => {
  const dir = afterTopic();
  assert.equal(run('record-status.mjs', [dir, 'retired', 'c-x', '--reason', 'x']).code, 0);
  const r = run('progress.mjs', [dir, '--after', 'c-x']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /^topic - /);
  assert.match(r.stdout, / 2 Capabilities .* 0\/0\n/);
});

test('CLI --after: an unknown goal, a missing id, and a combination are usage errors', () => {
  const dir = afterTopic();
  assert.equal(run('progress.mjs', [dir, '--after', 'nope']).code, 1);
  assert.equal(run('progress.mjs', [dir, '--after']).code, 1);
  assert.equal(run('progress.mjs', [dir, '--after', 'o-a', '--set', '1']).code, 1);
  assert.equal(run('progress.mjs', [dir, '--after', 'o-a', '--json']).code, 1);
});

const CASE_GOALS = `${CAP_GOAL('o-a', ORIENT + '- **cases:**\n  - `x`: ex\n  - `y`: why\n  - `z`: zed\n')}\n${CAP_GOAL('o-b', ORIENT)}`;
const caseTopic = () => makeTopic({ goals: CASE_GOALS, activities: '### a-x\n- **serves:** all\n' });

test('cases: a partly demonstrated goal reads <id> (p/t cases) on the next line, sorted with tried goals', () => {
  const rows = [['a', 'orientation', 'open', 0], ['b', 'orientation', 'open', 2, { cases: { passed: 2, total: 3 } }]];
  const v = buildProgress(fake(rows, [['a', 'b']]));
  assert.equal(v.sets[0].goals[0].mark, '~');
  assert.deepEqual(v.sets[0].goals[0].cases, { passed: 2, total: 3 });
  assert.match(renderFull(v), / Next set: b \(2\/3 cases\), a\n/);
  assert.ok(!renderFull(v).includes('(in progress)'));
});

test('CLI --after: a goal with cases not yet met prints a cases line; --json carries cases', () => {
  const dir = caseTopic();
  run('record-attempt.mjs', [dir, 'o-a', 'a-x/1', '--axes', PASS, '--cases', 'x,y']);
  const r = run('progress.mjs', [dir, '--after', 'o-a']);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout, 'Orientation  ~.  0/2   (set 1 of 1)\n  o-a: 2 of 3 cases demonstrated\n');
  const j = JSON.parse(run('progress.mjs', [dir, '--json']).stdout);
  assert.deepEqual(j.sets[0].goals[0].cases, { passed: 2, total: 3 });
  assert.match(run('progress.mjs', [dir]).stdout, / Next set: o-a \(2\/3 cases\), o-b/);
});

test('CLI --after: a goal with cases whose only pass carries no cases is met, with no cases line', () => {
  const dir = caseTopic();
  run('record-attempt.mjs', [dir, 'o-a', 'a-x/1', '--axes', PASS, '--cases', 'x,y,z']);
  const all = run('progress.mjs', [dir, '--after', 'o-a']);
  assert.equal(all.stdout, 'Orientation  #.  1/2   (set 1 of 1)\n');
  const dir2 = caseTopic();
  mkdirSync(join(dir2, 'evidence'), { recursive: true });
  appendFileSync(join(dir2, 'evidence', 'attempts.jsonl'), JSON.stringify({ goal: 'o-a', unaided: 'yes', criterion: 'met', at: '2026-01-01T00:00:00Z' }) + '\n');
  const old = run('progress.mjs', [dir2, '--after', 'o-a']);
  assert.equal(old.stdout, 'Orientation  #.  1/2   (set 1 of 1)\n');
});
