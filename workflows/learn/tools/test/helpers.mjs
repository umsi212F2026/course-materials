// Shared by the tool tests. Each test builds a throwaway topic folder, runs the real tool as a
// subprocess, and checks what it prints or writes, so the tests exercise the same entry points
// the skills do.
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

// goals is the body under "## Goals"; activities.md is written only when given, because its
// absence is itself a state the survey reports; status events go one JSON object per line.
export function makeTopic({ goals, activities, status = [] }) {
  const parent = mkdtempSync(join(tmpdir(), 'learn-test-'));
  const dir = join(parent, 'topic');
  mkdirSync(dir);
  writeFileSync(join(dir, 'goals.md'), `# Topic\n\n## Goals\n\n${goals}\n`);
  if (activities !== undefined) writeFileSync(join(dir, 'activities.md'), activities);
  writeFileSync(join(dir, 'status.jsonl'), status.map((e) => JSON.stringify(e) + '\n').join(''));
  return dir;
}

// Runs a tool from the repo root so its relative paths behave as they do for a learner.
export function run(script, args) {
  const r = spawnSync(process.execPath, ['workflows/learn/tools/' + script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

// survey.mjs takes the topic folder as a path, and --dir for the folder holding topics.
export function survey(dir) {
  return JSON.parse(run('survey.mjs', ['--dir', dirname(dir), dir]).stdout);
}

export const CAP_GOAL = (id, extra = '') =>
  `### \`${id}\`\n- **goal:** Do the thing.\n- **criterion:** The thing is done.\n${extra}`;
