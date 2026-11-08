// node --test workflows/diagram/tools/test/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tool = join(here, '..', 'check-di.mjs');
const repoRoot = join(here, '..', '..', '..', '..');
const PLACED = readFileSync(join(here, 'fixtures', 'three-lanes-placed.bpmn'), 'utf8');

// A student's repository: ps5/skills/assess/SKILL.md exists, ps5/fetch.py does not.
function studentRepo(fetchPath = 'ps5/fetch.py') {
  const dir = mkdtempSync(join(tmpdir(), 'check-di-student-'));
  execFileSync('git', ['init', '-q', dir]);
  mkdirSync(join(dir, 'ps5', 'skills', 'assess'), { recursive: true });
  writeFileSync(join(dir, 'ps5', 'skills', 'assess', 'SKILL.md'), '# Assess\n');
  const xml = PLACED
    .replace('<bpmn:task id="assess_posting" name="Assess posting">',
      '<bpmn:task id="assess_posting" name="Assess posting">\n      <bpmn:documentation>ps5/skills/assess/SKILL.md</bpmn:documentation>')
    .replace('<bpmn:serviceTask id="fetch_posting" name="Fetch posting">',
      `<bpmn:serviceTask id="fetch_posting" name="Fetch posting">\n      <bpmn:documentation>${fetchPath}</bpmn:documentation>`);
  writeFileSync(join(dir, 'ps5', 'workflow.bpmn'), xml);
  return join(dir, 'ps5', 'workflow.bpmn');
}
const run = (...args) => {
  const r = spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
};

test("a path in the student's own repository resolves from its root", () => {
  const { out } = run(studentRepo());
  assert.doesNotMatch(out, /ps5\/skills\/assess\/SKILL\.md/);
});

test('a bound file that does not exist is a problem', () => {
  const { code, out } = run(studentRepo());
  assert.equal(code, 1);
  assert.match(out, /ps5\/fetch\.py does not exist/);
});

test('with --planned, it is listed as planned and passes', () => {
  const { code, out } = run('--planned', studentRepo());
  assert.equal(code, 0, out);
  assert.match(out, /planned: ps5\/fetch\.py is bound but not written yet/);
  assert.match(out, /DI consistent/);
});

test('a path relative to the diagram is refused', () => {
  const { code, out } = run('--planned', studentRepo('./ps5/fetch.py'));
  assert.equal(code, 1);
  assert.match(out, /\.\/ps5\/fetch\.py on fetch_posting is not a path from the repo root/);
});

test("the course's own diagrams still pass", () => {
  for (const wf of readdirSync(join(repoRoot, 'workflows'))) {
    let files = [];
    try {
      files = readdirSync(join(repoRoot, 'workflows', wf)).filter((f) => f.endsWith('.bpmn'));
    } catch {
      continue;
    }
    for (const f of files) {
      const { code, out } = run(join(repoRoot, 'workflows', wf, f));
      assert.equal(code, 0, `${wf}/${f}: ${out}`);
    }
  }
});
