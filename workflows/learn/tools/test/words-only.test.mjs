// A topic-level `**capabilities:** none` header: goal setting decided this topic is words and an
// orientation, with no capability, so it must not read as goal setting not yet run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { survey, CAP_GOAL } from './helpers.mjs';

const WORD = (id) =>
  `### \`${id}\`\n- **goal:** ${id}\n- **criterion:** vocabulary\n- **bar:** one production pass\n- **group:** vocabulary\n`;

// makeTopic puts its goals under `## Goals` with no header, so write goals.md directly.
function topicWith(header, goals, activities) {
  const dir = join(mkdtempSync(join(tmpdir(), 'learn-test-')), 'topic');
  mkdirSync(dir);
  writeFileSync(join(dir, 'goals.md'), `# Topic\n\n${header}## Goals\n\n${goals}\n`);
  if (activities !== undefined) writeFileSync(join(dir, 'activities.md'), activities);
  writeFileSync(join(dir, 'status.jsonl'), '');
  return dir;
}

const capProblem = (s) => s.problems.filter((p) => p.includes('capabilities'));

test('words with no line are still not started', () => {
  const s = survey(topicWith('', WORD('w-a')));
  assert.equal(s.phase, 'not started');
  assert.equal(s.wordsOnly, false);
});

test('words under the line go to curation, then study', () => {
  const header = '**capabilities:** none\n\n';
  let s = survey(topicWith(header, WORD('w-a')));
  assert.equal(s.phase, 'in curation');
  assert.equal(s.wordsOnly, true);
  assert.deepEqual(capProblem(s), []);
  s = survey(topicWith(header, WORD('w-a'), '### `a-words`\n- **serves:** group vocabulary\n'));
  assert.equal(s.phase, 'studying');
});

test('a value other than none is reported and read as no line', () => {
  const s = survey(topicWith('**capabilities:** words only\n\n', WORD('w-a')));
  assert.equal(s.phase, 'not started');
  assert.equal(s.wordsOnly, false);
  assert.ok(capProblem(s).some((p) => p.includes('words only')), s.problems.join('\n'));
});

test('the line beside a capability goal is reported', () => {
  const s = survey(topicWith('**capabilities:** none\n\n', CAP_GOAL('c-a') + '\n' + WORD('w-a')));
  assert.ok(capProblem(s).some((p) => p.includes('c-a')), s.problems.join('\n'));
});

test('a line inside a comment is guidance, not the header', () => {
  const s = survey(topicWith('<!--\n**capabilities:** none\n-->\n\n', WORD('w-a')));
  assert.equal(s.phase, 'not started');
  assert.deepEqual(capProblem(s), []);
});
