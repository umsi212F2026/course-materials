// Create a learning topic directory with its subfolders and blank template files.
//
//   node workflows/learn/tools/new-topic.mjs --dir <d> <area-slug>
//
// <d> is the directory holding the topic folders — see lib/workdir.mjs for why it
// is an argument and not derived from where this file happens to live.
//
// Makes <d>/<area-slug>-<yyyy>-<mm>/ from everything in workflows/learn/templates/,
// plus empty tasks/ and evidence/ directories. The templates still come from this
// repository: only the data directory moved out, not the course materials.
//
// The goals.md it copies is not empty: it ships the orientation goal, filled in, because every
// topic needs orienting and nothing about that entry is the learner's to negotiate. Everything
// else in the file is theirs.
//
// IT OPENS THE LIFECYCLE QUEUE, which is the one thing here that isn't a file copy. A `created`
// event is what makes the folder a topic, and one `goal-added` per goal the template ships is
// what puts them in front of curation. A topic with goals and no `goal-added` events is a queue
// that will never run, and survey reports it as a problem — so this writes them at the one
// moment that can't be forgotten.
//
// There is no progress.md and no review.json. Where a topic stands is derived from
// evidence/attempts.jsonl by workflows/learn/tools/survey.mjs; what it is waiting on is folded out of
// evidence/status.jsonl; when each goal comes back is folded out of the attempt log by
// workflows/learn/tools/review-due.mjs.
//
// Refuses to overwrite. A second pass at the same subject in a later month gets its own
// folder; a collision in the same month means something has gone wrong and should be looked
// at rather than merged.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGoals } from './lib/topic.mjs';
import { appendStatus } from './lib/status.mjs';
import { takeDir } from './lib/workdir.mjs';

// Templates ship with the definitions, so they are still found relative to this
// file. Only the DATA directory moved out; the course materials did not.
const materials = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const USAGE = 'node workflows/learn/tools/new-topic.mjs --dir <learning-topics> <area-slug>';
const { dir: learning, rest: argv } = takeDir(process.argv.slice(2), USAGE);

const TEMPLATES = ['goals.md', 'activities.md', 'notes.md'];

const SUBDIRS = ['tasks', 'evidence'];

const slug = argv[0];

if (!slug) {
  console.error(`usage: ${USAGE}`);
  console.error(
    'example: node workflows/learn/tools/new-topic.mjs --dir ~/Documents/si212/learning-topics reading-bpmn-diagrams',
  );
  process.exit(1);
}

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error(`"${slug}" isn't a slug. Lower case, digits, single hyphens between words.`);
  process.exit(1);
}

const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const dir = join(learning, `${slug}-${stamp}`);

if (existsSync(dir)) {
  console.error(`${dir} already exists. Refusing to overwrite.`);
  console.error('A later pass at the same subject gets a new month-stamped folder; a');
  console.error('collision this month means something needs looking at rather than merging.');
  process.exit(1);
}

// The title line of each template carries <AREA>. Everything else is left alone.
const title = slug.replace(/-/g, ' ');

mkdirSync(dir, { recursive: true });
for (const sub of SUBDIRS) mkdirSync(join(dir, sub));

for (const name of TEMPLATES) {
  const source = join(materials, 'workflows/learn/templates', name);
  if (!existsSync(source)) {
    console.error(`missing template: workflows/learn/templates/${name}`);
    process.exit(1);
  }
  writeFileSync(join(dir, name), readFileSync(source, 'utf8').replaceAll('<AREA>', title));
}

// Read the goals back rather than naming the orientation id here. The template is where that
// entry is maintained, and a copy of its id in this file is a second definition site waiting
// for the day the template ships a second one.
appendStatus(dir, 'created');
const shipped = readGoals(dir).goals;
for (const goal of shipped) appendStatus(dir, 'goal-added', { goal: goal.id });

console.log(dir);
for (const name of TEMPLATES) console.log(`  ${name}`);
for (const sub of SUBDIRS) console.log(`  ${sub}/`);
console.log(`  evidence/status.jsonl  — created${shipped.length ? `, ${shipped.map((g) => g.id).join(', ')} awaiting curation` : ''}`);
