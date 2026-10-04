// goals.md's `## Sequence`: sets of goals in order. Each goal's set is its most specific mention.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { makeTopic, run, survey, CAP_GOAL } from './helpers.mjs';

const word = (id) => `### \`${id}\`\n- **goal:** x\n- **criterion:** vocabulary\n- **group:** vocabulary\n`;
const orient = (id) => `### \`${id}\`\n- **goal:** x\n- **criterion:** done\n- **group:** orientation\n`;
const other = (id) => `### \`${id}\`\n- **goal:** x\n- **criterion:** done\n- **group:** extras\n`;
const CAP = '- **capability:** weigh-hosting-plans\n';

// The Sequence section goes after Goals, as it does in a real topic.
function topic(goals, sequence) {
  const dir = makeTopic({ goals: goals.join('\n') });
  if (sequence !== undefined) {
    const file = join(dir, 'goals.md');
    writeFileSync(file, readFileSync(file, 'utf8') + `\n## Sequence\n\n${sequence}\n`);
  }
  return dir;
}
const setsOf = (dir) => survey(dir).sequence.sets.map((s) => s.goals.map((g) => g.id));

test('no section: not decided, and the default order fills the sets', () => {
  const dir = topic([other('x-1'), CAP_GOAL('c-a'), word('w-a'), orient('o-a')]);
  const s = survey(dir);
  assert.equal(s.sequence.decided, false);
  assert.deepEqual(setsOf(dir), [['o-a'], ['w-a'], ['c-a'], ['x-1']]);
  assert.deepEqual(s.problems.filter((p) => /equence|no set/.test(p)), []);
});

test('the most specific mention decides: id over slug over group', () => {
  const dir = topic(
    [orient('o-a'), word('w-a'), word('w-lock-in'), CAP_GOAL('c-weigh-sleep'), CAP_GOAL('c-p1', CAP), CAP_GOAL('c-p2', CAP), CAP_GOAL('c-z')],
    '1. orientation\n2. vocabulary, `c-weigh-sleep`\n3. capabilities\n4. w-lock-in'
  );
  assert.deepEqual(setsOf(dir), [['o-a'], ['w-a', 'c-weigh-sleep'], ['c-p1', 'c-p2', 'c-z'], ['w-lock-in']]);
  assert.deepEqual(survey(dir).problems.filter((p) => /equence|no set/.test(p)), []);
});

test('a capability slug puts all its parts in its set, and a goal id elsewhere beats it', () => {
  const goals = [CAP_GOAL('c-p1', CAP), CAP_GOAL('c-p2', CAP), CAP_GOAL('c-p3', CAP), word('w-a')];
  const dir = topic(goals, '1. weigh-hosting-plans\n2. vocabulary, capabilities');
  assert.deepEqual(setsOf(dir), [['c-p1', 'c-p2', 'c-p3'], ['w-a']]);
  const moved = topic(goals, '1. weigh-hosting-plans\n2. vocabulary, c-p2');
  assert.deepEqual(setsOf(moved), [['c-p1', 'c-p3'], ['c-p2', 'w-a']]);
});

test('a word added later lands in its group set, and in Goals, not in Sequence', () => {
  const dir = topic([word('w-a'), CAP_GOAL('c-a')], '1. vocabulary\n2. capabilities');
  const before = readFileSync(join(dir, 'goals.md'), 'utf8');
  const tail = before.slice(before.indexOf('## Sequence'));
  const r = run('new-word.mjs', ['--dir', dirname(dir), 'topic', 'a new word', 'w-new']);
  assert.equal(r.code, 0, r.stderr);
  const after = readFileSync(join(dir, 'goals.md'), 'utf8');
  assert.ok(after.indexOf('w-new') < after.indexOf('## Sequence'));
  assert.equal(after.slice(after.indexOf('## Sequence')), tail);
  assert.deepEqual(setsOf(dir), [['w-a', 'w-new'], ['c-a']]);
});

test('each problem is reported with its exact message', () => {
  const dir = topic([word('w-a'), word('w-b'), CAP_GOAL('c-a')], '1. vocabulary, nonsense, w-a\n2. w-a');
  const p = survey(dir).problems;
  assert.ok(p.includes('Sequence names nonsense, which is no group, capability or goal'), p.join('\n'));
  assert.ok(p.includes('Sequence lists w-a in two sets'), p.join('\n'));
  assert.ok(p.includes('c-a is in no set in the Sequence'), p.join('\n'));
});

test('current is the first set with an open goal, and null when nothing is open', () => {
  const dir = topic([word('w-a'), word('w-b'), word('w-c'), CAP_GOAL('c-a')], '1. w-a\n2. w-b\n3. w-c\n4. capabilities');
  run('record-status.mjs', [dir, 'retired', 'w-a', '--reason', 'x']);
  run('record-status.mjs', [dir, 'deferred', 'w-b', '--where', 'elsewhere']);
  let s = survey(dir).sequence;
  assert.deepEqual(s.sets.slice(0, 2).map((x) => x.goals[0].state), ['retired', 'deferred']);
  assert.equal(s.current, 2);
  run('record-attempt.mjs', [dir, 'w-c', 'x/1', '--axes', '{"unaided":"yes","criterion":"met"}']);
  run('record-status.mjs', [dir, 'retired', 'c-a', '--reason', 'x']);
  s = survey(dir).sequence;
  assert.equal(s.sets[2].goals[0].state, 'met');
  assert.equal(s.current, null);
});

test('--report says not decided yet only when undecided', () => {
  const undecided = topic([word('w-a')]);
  assert.match(run('survey.mjs', ['--dir', dirname(undecided), undecided, '--report']).stdout, /sequence: not decided yet/);
  const decided = topic([word('w-a')], '1. vocabulary');
  assert.doesNotMatch(run('survey.mjs', ['--dir', dirname(decided), decided, '--report']).stdout, /sequence:/);
});

test('a slug that is also a group name: goal id, then slug, then group', () => {
  const grouped = (id) => `### \`${id}\`\n- **goal:** x\n- **criterion:** done\n- **group:** weigh-plans\n`;
  const goals = [CAP_GOAL('c-p1', '- **capability:** weigh-plans\n'), grouped('g-1')];
  const dir = topic(goals, '1. capabilities\n2. weigh-plans');
  assert.deepEqual(setsOf(dir), [[], ['c-p1', 'g-1']]);
  const byId = topic(goals, '1. weigh-plans\n2. capabilities, c-p1');
  assert.deepEqual(setsOf(byId), [['g-1'], ['c-p1']]);
});

test('default order: other groups in order of first appearance', () => {
  const grouped = (id, group) => `### \`${id}\`\n- **goal:** x\n- **criterion:** done\n- **group:** ${group}\n`;
  const dir = topic([grouped('z-1', 'zeta'), grouped('a-1', 'alpha'), grouped('z-2', 'zeta'), word('w-a')]);
  assert.deepEqual(setsOf(dir), [['w-a'], ['z-1', 'z-2'], ['a-1']]);
});

test('the three standard groups may be listed while empty; any other unknown name is a problem', () => {
  const fresh = topic([orient('o-orientation')], '1. orientation\n2. vocabulary\n3. capabilities');
  assert.deepEqual(survey(fresh).problems.filter((p) => /equence|no set/.test(p)), []);
  const bad = topic([orient('o-orientation')], '1. orientation\n2. vocabulary\n3. capabilities\n4. nonsense');
  assert.deepEqual(survey(bad).problems.filter((p) => /equence|no set/.test(p)), [
    'Sequence names nonsense, which is no group, capability or goal',
  ]);
});

// The Sequence section may sit above Goals, as the template now has it, and nothing changes.
function topicAbove(goals, sequence) {
  const dir = makeTopic({ goals: goals.join('\n') });
  const file = join(dir, 'goals.md');
  const text = readFileSync(file, 'utf8');
  const at = text.indexOf('## Goals');
  writeFileSync(file, `${text.slice(0, at)}## Sequence\n\n${sequence}\n\n${text.slice(at)}`);
  return dir;
}

test('Sequence above Goals resolves the same, and a new word still lands at the end of the file', () => {
  const goals = [word('w-a'), CAP_GOAL('c-a')];
  const seq = '1. vocabulary\n2. capabilities';
  assert.deepEqual(setsOf(topicAbove(goals, seq)), setsOf(topic(goals, seq)));
  const dir = topicAbove(goals, seq);
  const r = run('new-word.mjs', ['--dir', dirname(dir), 'topic', 'a new word', 'w-new']);
  assert.equal(r.code, 0, r.stderr);
  const after = readFileSync(join(dir, 'goals.md'), 'utf8');
  assert.ok(after.indexOf('## Sequence') < after.indexOf('## Goals'));
  assert.ok(after.trimEnd().split('\n').some((l) => l.includes('w-new')));
  assert.ok(after.indexOf('w-new') > after.indexOf('c-a'));
  assert.deepEqual(setsOf(dir), [['w-a', 'w-new'], ['c-a']]);
});

test('an entry written inside the Sequence section is reported, above Goals or below', () => {
  const msg = 'w-lost is written inside the Sequence section, where it is not read as a goal; move it under ## Goals';
  const seq = '1. vocabulary\n2. capabilities\n\n' + word('w-lost');
  assert.ok(survey(topicAbove([word('w-a'), CAP_GOAL('c-a')], seq)).problems.includes(msg));
  assert.ok(survey(topic([word('w-a'), CAP_GOAL('c-a')], seq)).problems.includes(msg));
});

test('a group or slug listed in two sets: the first wins, and no problem is reported', () => {
  const dir = topic([word('w-a'), CAP_GOAL('c-p1', CAP)], '1. vocabulary, weigh-hosting-plans\n2. vocabulary, weigh-hosting-plans');
  assert.deepEqual(setsOf(dir), [['w-a', 'c-p1'], []]);
  assert.deepEqual(survey(dir).problems.filter((p) => /equence|no set/.test(p)), []);
});

test('a topic built from the real template has a decided three-set sequence and one Sequence heading', () => {
  const parent = mkdtempSync(join(tmpdir(), 'learn-template-'));
  const r = run('new-topic.mjs', ['--dir', parent, 'area']);
  assert.equal(r.code, 0, r.stderr);
  const dir = join(parent, readdirSync(parent)[0]);
  const text = readFileSync(join(dir, 'goals.md'), 'utf8');
  assert.equal(text.match(/^## Sequence\s*$/gm).length, 1);
  assert.ok(text.search(/^## Sequence\s*$/m) < text.search(/^## Goals\s*$/m));
  const s = survey(dir);
  assert.equal(s.sequence.decided, true);
  assert.deepEqual(s.sequence.sets.map((x) => x.goals.map((g) => g.id)), [['o-orientation'], [], []]);
  assert.deepEqual(s.problems.filter((p) => /equence|no set/.test(p)), []);
});
