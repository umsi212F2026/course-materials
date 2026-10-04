// The verification must not share the splitter's blind spots: it counts every non-blank line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeTopic, CAP_GOAL } from './helpers.mjs';
import { planMigration, verifyPlan } from '../migrate-words.mjs';

const WORD = `### \`w-a\`\n- **goal:** the word\n- **criterion:** vocabulary\n- **bar:** one production pass\n- **group:** vocabulary\n- **what it names:** a thing\n`;

function setup() {
  const dir = makeTopic({ goals: CAP_GOAL('c-x') + '\n' + WORD, activities: '# A\n' });
  mkdirSync(join(dir, 'tasks'));
  mkdirSync(join(dir, 'rubrics'));
  writeFileSync(join(dir, 'tasks/i.md'), '# T\n\n### q1\n\nOne.\n\n### q4\n\nCap.\n');
  writeFileSync(join(dir, 'rubrics/i.md'), '# R\n\n### q1\n\n- **goal:** w-a\n- **answer:** a\n\n### q4\n\n- **goal:** c-x\n- **answer:** b\n');
  const plan = planMigration(dir);
  mkdirSync(join(dir, 'tasks/a-words'));
  mkdirSync(join(dir, 'rubrics/a-words'));
  for (const [p, t] of plan.created) writeFileSync(p, t);
  return { dir, plan };
}

test('verifyPlan accepts a faithful write', () => {
  const { plan } = setup();
  assert.deepEqual(verifyPlan(plan), []);
});

test('verifyPlan catches a tampered new file and a tampered legacy plan', () => {
  const { plan } = setup();
  const f = [...plan.created.keys()][0];
  writeFileSync(f, readFileSync(f, 'utf8').replace('One.', 'One, changed.'));
  assert.ok(verifyPlan(plan).length > 0);
  const { plan: p2 } = setup();
  const legacy = [...p2.edits.keys()].find((k) => k.endsWith('tasks/i.md'));
  p2.edits.set(legacy, p2.edits.get(legacy).replace('Cap.', 'Lost.'));
  assert.ok(verifyPlan(p2).length > 0);
});
