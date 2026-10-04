// migrate-words.mjs moves banked word questions out of legacy single-file banks into
// tasks/a-words/<goal-id>.md and retires the stamps and supply lines that served them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { makeTopic, run, survey, CAP_GOAL } from './helpers.mjs';
import { readFolderBanks } from '../../../quiz/tools/lib/bank.mjs';

const WORD = (id) =>
  `### \`${id}\`\n- **goal:** ${id}-word\n- **criterion:** vocabulary\n- **supply:** vocabulary\n` +
  `- **bar:** one production pass\n- **group:** vocabulary\n- **what it names:** a thing\n`;

const STAMP = (id, word) => `### ${id}\n- **checks:** ${word}\n- **origin:** generated\n\n`;
const CURATED = '### a-c\n- **serves:** c-x\n- **learner does:** things\n';

const TASK = (id, text) => `### ${id}\n\n${text}\n\n`;
const RUB = (id, goal, move) =>
  `### ${id}\n\n- **goal:** ${goal}\n- **move:** ${move}\n- **answer:** answer ${id}\n- **credit:** credit ${id}\n\n`;

function build({ onlyWords = false } = {}) {
  const dir = makeTopic({
    goals: [CAP_GOAL('c-x'), WORD('w-a'), WORD('w-b')].join('\n'),
    activities: '# Activities\n\n' + STAMP('a-w-a', 'w-a') + STAMP('a-w-b', 'w-b') + CURATED,
  });
  mkdirSync(join(dir, 'tasks'));
  mkdirSync(join(dir, 'rubrics'));
  const tasks = [TASK('q1', 'About a one.'), TASK('q2', 'About b.'), TASK('q3', 'About a two.')];
  const rubs = [RUB('q1', 'w-a', 'define'), RUB('q2', 'w-b', 'contrast'), RUB('q3', 'w-a', 'use')];
  if (!onlyWords) {
    tasks.push(TASK('q4', 'Do the thing.'));
    rubs.push(RUB('q4', 'c-x', 'apply'));
  }
  // Preamble prose would keep an emptied pair (see the test for it), so only the full build has any.
  writeFileSync(join(dir, 'tasks/items.md'), '# Items\n\n' + (onlyWords ? '' : 'Intro text.\n\n') + tasks.join(''));
  writeFileSync(join(dir, 'rubrics/items.md'), '# Rubrics\n\n' + (onlyWords ? '' : 'Key text.\n\n') + rubs.join(''));
  return dir;
}

const read = (dir, p) => readFileSync(join(dir, p), 'utf8');
const problems = (dir) => survey(dir).problems;

test('moves each word question to its goal file, in order, and keeps the rest', () => {
  const dir = build();
  const r = run('migrate-words.mjs', [dir]);
  assert.equal(r.code, 0, r.stderr);

  assert.equal(read(dir, 'tasks/a-words/w-a.md'), '# w-a-word\n\n' + TASK('q1', 'About a one.') + TASK('q3', 'About a two.').trimEnd() + '\n');
  assert.equal(read(dir, 'rubrics/a-words/w-a.md'), '# Rubric: w-a-word\n\n' + RUB('q1', 'w-a', 'define') + RUB('q3', 'w-a', 'use').trimEnd() + '\n');
  assert.match(read(dir, 'tasks/a-words/w-b.md'), /^# w-b-word\n\n### q2\n/);
  assert.match(read(dir, 'rubrics/a-words/w-b.md'), /^# Rubric: w-b-word\n\n### q2\n/);

  assert.equal(read(dir, 'tasks/items.md'), '# Items\n\nIntro text.\n\n' + TASK('q4', 'Do the thing.'));
  assert.equal(read(dir, 'rubrics/items.md'), '# Rubrics\n\nKey text.\n\n' + RUB('q4', 'c-x', 'apply'));

  const acts = read(dir, 'activities.md');
  assert.match(acts, /### `a-words`\n\n- \*\*serves:\*\* group vocabulary/);
  assert.doesNotMatch(acts, /a-w-/);
  assert.ok(acts.includes(CURATED));
  assert.doesNotMatch(read(dir, 'goals.md'), /supply/);

  const { items } = readFolderBanks(dir);
  assert.deepEqual(items.map((i) => i.label), ['a-words/w-a/q1', 'a-words/w-a/q3', 'a-words/w-b/q2']);
  assert.deepEqual(items.map((i) => i.goals), [['w-a'], ['w-a'], ['w-b']]);
  assert.deepEqual(items.map((i) => i.move), ['define', 'use', 'contrast']);
});

test('a second run refuses and changes nothing', () => {
  const dir = build();
  run('migrate-words.mjs', [dir]);
  const before = [read(dir, 'tasks/items.md'), read(dir, 'activities.md'), read(dir, 'tasks/a-words/w-a.md')];
  const r = run('migrate-words.mjs', [dir]);
  assert.equal(r.code, 1);
  assert.deepEqual([read(dir, 'tasks/items.md'), read(dir, 'activities.md'), read(dir, 'tasks/a-words/w-a.md')], before);
});

test('--dry-run prints the summary and writes nothing', () => {
  const dir = build();
  const before = read(dir, 'tasks/items.md');
  const r = run('migrate-words.mjs', [dir, '--dry-run']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /w-a/);
  assert.match(r.stdout, /a-words/);
  assert.equal(existsSync(join(dir, 'tasks/a-words')), false);
  assert.equal(read(dir, 'tasks/items.md'), before);
  assert.match(read(dir, 'goals.md'), /supply/);
});

test('a legacy pair holding only word questions is deleted', () => {
  const dir = build({ onlyWords: true });
  const r = run('migrate-words.mjs', [dir]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(existsSync(join(dir, 'tasks/items.md')), false);
  assert.equal(existsSync(join(dir, 'rubrics/items.md')), false);
});

test('a bad flag is refused', () => {
  const r = run('migrate-words.mjs', [build(), '--dry-rn']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /not a flag/);
});

test('survey reports nothing new after migration, with a problem to compare against', () => {
  const dir = build();
  // A problem that exists before and must survive untouched, so the comparison is not vacuous.
  writeFileSync(join(dir, 'goals.md'), read(dir, 'goals.md').replace('w-b-word', 'w-b-word') + '\n### `a-bad`\n- **goal:** x\n');
  const before = problems(dir);
  assert.ok(before.length > 0);
  run('migrate-words.mjs', [dir]);
  const after = problems(dir);
  for (const p of after) assert.ok(before.includes(p), `new problem: ${p}`);
});

// Two word questions in a fresh topic, written by hand so the text can be awkward.
function bare(tasks, rubs, { acts = '', goalsExtra = '' } = {}) {
  const dir = makeTopic({ goals: CAP_GOAL('c-x') + '\n' + WORD('w-a') + goalsExtra, activities: acts || '# Activities\n\n' + STAMP('a-w-a', 'w-a') + CURATED });
  mkdirSync(join(dir, 'tasks'));
  mkdirSync(join(dir, 'rubrics'));
  writeFileSync(join(dir, 'tasks/i.md'), tasks);
  writeFileSync(join(dir, 'rubrics/i.md'), rubs);
  return dir;
}

test('a code fence with # lines inside a moved question is not split', () => {
  const q1 = '### q1\n\nRun:\n\n```sh\n# a comment\nls\n```\n\nWhy?\n\n';
  const dir = bare('# T\n\n' + q1 + TASK('q2', 'Two.'), '# R\n\n' + RUB('q1', 'w-a', 'define') + RUB('q2', 'w-a', 'use'));
  const r = run('migrate-words.mjs', [dir]);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(read(dir, 'tasks/a-words/w-a.md').includes(q1.trimEnd()));
  assert.equal(readFolderBanks(dir).items.length, 2);
});

test('an HTML comment holding a ### heading survives stamp and supply removal', () => {
  const tpl = '<!--\nTemplate:\n### <activity-id>\n- **serves:** x\n-->\n';
  const dir = bare('# T\n\n' + TASK('q1', 'One.'), '# R\n\n' + RUB('q1', 'w-a', 'define'), {
    acts: '# Activities\n\n' + tpl + '\n' + STAMP('a-w-a', 'w-a') + CURATED,
    goalsExtra: '\n<!--\n- **supply:** vocabulary\n-->\n',
  });
  assert.equal(run('migrate-words.mjs', [dir]).code, 0);
  const acts = read(dir, 'activities.md');
  assert.ok(acts.includes(tpl));
  assert.doesNotMatch(acts, /a-w-a/);
  assert.ok(read(dir, 'goals.md').includes('<!--\n- **supply:** vocabulary\n-->'));
  assert.doesNotMatch(read(dir, 'goals.md').replace(/<!--[\s\S]*?-->/g, ''), /supply/);
});

test('a last question with no trailing blank line, and an unbackticked heading, move intact', () => {
  const dir = bare('# T\n\n### q1\n\nOne.\n\n### q2\n\nLast, no newline.', '# R\n\n' + RUB('q1', 'w-a', 'define') + '### `q2`\n\n- **goal:** w-a\n- **move:** use\n- **answer:** a\n- **credit:** c');
  assert.equal(run('migrate-words.mjs', [dir]).code, 0);
  assert.equal(read(dir, 'tasks/a-words/w-a.md'), '# w-a-word\n\n### q1\n\nOne.\n\n### q2\n\nLast, no newline.\n');
  assert.equal(readFolderBanks(dir).items.length, 2);
  assert.equal(existsSync(join(dir, 'tasks/i.md')), false);
});

test('rubrics/a-words alone also makes it refuse', () => {
  const dir = build();
  mkdirSync(join(dir, 'rubrics/a-words'));
  const before = read(dir, 'tasks/items.md');
  assert.equal(run('migrate-words.mjs', [dir]).code, 1);
  assert.equal(read(dir, 'tasks/items.md'), before);
});

test('an id the splitter cannot read is warned about and left in place', () => {
  const dir = bare('# T\n\n' + TASK('q1', 'One.') + '### q_2\n\nodd\n', '# R\n\n' + RUB('q1', 'w-a', 'define'));
  const r = run('migrate-words.mjs', [dir]);
  assert.match(r.stderr, /q_2.*travel with the question before/);
});

test('a stamp keeps a trailing comment, prose and #### lines, even as the last entry', () => {
  const tail = '\n<!-- keep me -->\nSome prose.\n#### Deep\nmore\n';
  const dir = bare('# T\n\n' + TASK('q1', 'One.'), '# R\n\n' + RUB('q1', 'w-a', 'define'), {
    acts: '# Activities\n\n' + CURATED + '\n' + STAMP('a-w-a', 'w-a').trimEnd() + '\n' + tail,
  });
  assert.equal(run('migrate-words.mjs', [dir]).code, 0);
  const acts = read(dir, 'activities.md');
  assert.ok(acts.includes(tail.trimStart().trimEnd()));
  assert.doesNotMatch(acts, /a-w-a/);
  assert.ok(acts.includes(CURATED));
});

test('a stamp that is the last entry leaves the file ending in a newline', () => {
  const dir = bare('# T\n\n' + TASK('q1', 'One.'), '# R\n\n' + RUB('q1', 'w-a', 'define'), {
    acts: '# Activities\n\n' + CURATED + '\n### a-w-a\n- **checks:** w-a\n- **origin:** generated\n',
  });
  run('migrate-words.mjs', [dir]);
  assert.ok(read(dir, 'activities.md').startsWith('# Activities\n\n' + CURATED));
  assert.ok(read(dir, 'activities.md').endsWith('\n'));
});

test('nested and mixed fences move intact and nothing is duplicated', () => {
  const q1 = '### q1\n\n````md\n```sh\nls\n```\n~~~\n````\n\nWhy?\n\n';
  const dir = bare('# T\n\n' + q1 + TASK('q2', 'Two.'), '# R\n\n' + RUB('q1', 'w-a', 'define') + RUB('q2', 'w-a', 'use'));
  assert.equal(run('migrate-words.mjs', [dir]).code, 0);
  assert.ok(read(dir, 'tasks/a-words/w-a.md').includes(q1.trimEnd()));
  assert.equal(readFolderBanks(dir).items.length, 2);
});

test('an unclosed fence or an inline comment opener does not fold later questions in', () => {
  const tasks = '# T\n\n### q1\n\nOpen ```\nand `<!--` here.\n\n' + TASK('q4', 'Capability.');
  const rubs = '# R\n\n' + RUB('q1', 'w-a', 'define') + RUB('q4', 'c-x', 'apply');
  const dir = bare(tasks, rubs);
  assert.equal(run('migrate-words.mjs', [dir]).code, 0);
  assert.equal(read(dir, 'tasks/i.md'), '# T\n\n' + TASK('q4', 'Capability.'));
  assert.equal(read(dir, 'rubrics/i.md'), '# R\n\n' + RUB('q4', 'c-x', 'apply'));
});

function refuses(dir, pattern) {
  const before = ['tasks/i.md', 'rubrics/i.md', 'activities.md', 'goals.md'].map((p) => read(dir, p));
  const r = run('migrate-words.mjs', [dir]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, pattern);
  assert.deepEqual(['tasks/i.md', 'rubrics/i.md', 'activities.md', 'goals.md'].map((p) => read(dir, p)), before);
  assert.equal(existsSync(join(dir, 'tasks/a-words')), false);
}

test('refuses a duplicate task id', () => {
  refuses(bare('# T\n\n' + TASK('q1', 'One.') + TASK('q1', 'Again.'), '# R\n\n' + RUB('q1', 'w-a', 'define')), /q1 appears twice/);
});

test('refuses a duplicate rubric id', () => {
  refuses(bare('# T\n\n' + TASK('q1', 'One.'), '# R\n\n' + RUB('q1', 'w-a', 'define') + RUB('q1', 'w-a', 'use')), /q1 appears twice/);
});

test('refuses a question with no rubric entry, and a rubric with no question', () => {
  refuses(bare('# T\n\n' + TASK('q1', 'One.') + TASK('q2', 'Two.'), '# R\n\n' + RUB('q1', 'w-a', 'define')), /q2 is in .* no rubric entry/);
  refuses(bare('# T\n\n' + TASK('q1', 'One.'), '# R\n\n' + RUB('q1', 'w-a', 'define') + RUB('q2', 'w-a', 'use')), /q2 is in .* no question/);
});

test('refuses CRLF in goals.md, and in a bank file, and writes nothing', () => {
  const dir = bare('# T\n\n' + TASK('q1', 'One.'), '# R\n\n' + RUB('q1', 'w-a', 'define'));
  writeFileSync(join(dir, 'goals.md'), read(dir, 'goals.md').replace(/\n/g, '\r\n'));
  refuses(dir, /CRLF/);
  const dir2 = bare('# T\r\n\r\n' + TASK('q1', 'One.'), '# R\n\n' + RUB('q1', 'w-a', 'define'));
  refuses(dir2, /CRLF/);
});

test('a pair emptied of questions but holding preamble prose is kept, with a warning', () => {
  const dir = bare('# T\n\nKeep this prose.\n\n' + TASK('q1', 'One.'), '# R\n\n' + RUB('q1', 'w-a', 'define'));
  const r = run('migrate-words.mjs', [dir]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stderr, /were kept/);
  assert.match(read(dir, 'tasks/i.md'), /Keep this prose\./);
  assert.equal(existsSync(join(dir, 'rubrics/i.md')), true);
});

test('trailing spaces on the last line of a moved question are kept, and verification passes', () => {
  const dir = bare('# T\n\n' + TASK('q1', 'One.') + '### q2\n\nEnds in spaces.   \n\n', '# R\n\n' + RUB('q1', 'w-a', 'define') + RUB('q2', 'w-a', 'use'));
  const r = run('migrate-words.mjs', [dir]);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(read(dir, 'tasks/a-words/w-a.md').endsWith('Ends in spaces.   \n'));
});

test('a topic with no word goals gets no a-words entry, and survey finds nothing new', () => {
  const dir = makeTopic({ goals: CAP_GOAL('c-x'), activities: '# Activities\n\n' + CURATED });
  const before = problems(dir);
  const r = run('migrate-words.mjs', [dir]);
  assert.equal(r.code, 0, r.stderr);
  assert.doesNotMatch(read(dir, 'activities.md'), /a-words/);
  assert.doesNotMatch(r.stdout, /a-words/);
  for (const p of problems(dir)) assert.ok(before.includes(p), `new problem: ${p}`);
});

test('a run that fails while writing prints no migrated summary', () => {
  const dir = bare('# T\n\n' + TASK('q1', 'One.'), '# R\n\n' + RUB('q1', 'w-a', 'define'));
  chmodSync(join(dir, 'rubrics'), 0o555);
  try {
    const r = run('migrate-words.mjs', [dir]);
    assert.equal(r.code, 1);
    assert.doesNotMatch(r.stdout, /migrated:/);
  } finally {
    chmodSync(join(dir, 'rubrics'), 0o755);
  }
});

test('a stamp that was found but could not be removed is warned about by name', () => {
  const acts = '# Activities\n\nNote `<!--` here\n\n' + STAMP('a-w-a', 'w-a') + CURATED;
  const dir = bare('# T\n\n' + TASK('q1', 'One.'), '# R\n\n' + RUB('q1', 'w-a', 'define'), { acts });
  const r = run('migrate-words.mjs', [dir]);
  assert.match(r.stderr, /warning: .*a-w-a.*not removed/);
});
