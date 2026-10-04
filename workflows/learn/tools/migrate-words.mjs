// Move a topic's banked vocabulary questions into the folder bank tasks/a-words/.
//
//   node workflows/learn/tools/migrate-words.mjs <topic-folder> [--dry-run]
//
// WHAT IT MOVES. Every question in a legacy single-file bank (tasks/<name>.md with
// rubrics/<name>.md) whose rubric `goal` is exactly one goal in group `vocabulary` goes to
// tasks/a-words/<goal-id>.md and rubrics/a-words/<goal-id>.md: the word as the title, then the
// question and rubric sections VERBATIM, in source order. A legacy pair left with no sections is
// deleted, so bank.mjs never reports an empty bank. Everything else in the legacy files stays
// byte for byte.
//
// WHY A SCENARIO FILE IS NAMED BY GOAL ID. A label reads a-words/<goal-id>/<question-id>, so the
// goal a question examines is visible in the label and the id is permanent, whereas the word's
// text may be reworded.
//
// CAPABILITY QUESTIONS ARE LEFT ALONE. A question whose goal is not a word is not moved:
// which activity it belongs to is a judgment, and curation makes it.
//
// THE OLD MACHINERY GOES WITH THEM. The `a-words` activity entry is added (once), the stamped
// `origin: generated` entries that served only words are removed, and the retired
// `- **supply:** vocabulary` lines are removed from goals.md. Those edits cut by entry boundaries
// (a `### ` heading to the next `### ` or `## `), so the rest of the file is untouched.
//
// ONE-SHOT. It refuses if tasks/a-words/ already exists, so a second run can never duplicate a
// question. --dry-run prints the same summary and writes nothing.

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readGoals, readActivities } from './lib/topic.mjs';

const USAGE = `usage:
  node workflows/learn/tools/migrate-words.mjs <topic-folder> [--dry-run]

  --dry-run   print what would move and change; write nothing`;

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

// --- arguments ---------------------------------------------------------------
// Every flag checked, as in record-status.mjs: a misspelt --dry-run that was ignored would
// write the migration the caller meant only to preview.
const FLAGS = ['dry-run'];
const positional = [];
const flags = {};
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith('--')) {
    positional.push(arg);
    continue;
  }
  const name = arg.slice(2);
  if (!FLAGS.includes(name)) die(`--${name} is not a flag.\n\n${USAGE}`);
  flags[name] = true;
}
const [dir, ...extra] = positional;
if (!dir) die(USAGE);
if (extra.length) die(`Too many arguments: ${extra.map((a) => `"${a}"`).join(' ')}\n\n${USAGE}`);
if (!existsSync(dir)) die(`${dir} does not exist.`);
if (existsSync(join(dir, 'tasks', 'a-words'))) die(`${join(dir, 'tasks', 'a-words')} already exists; nothing was changed.`);

// --- raw splitting -----------------------------------------------------------
// bank.mjs trims and parses its sections; moving text needs them untouched. A segment runs from
// a heading to the next heading, trailing blank lines included, and the segments concatenate
// back to the file exactly. Only a `### <id>` segment carries an id: the title, a `## ` heading
// and the prose under them are `id: null` segments that always stay where they are.
const HEADING = /^#{1,3}\s/;
const ID = /^###\s+`?([A-Za-z0-9-]+)`?\s*$/;

function split(text) {
  const segs = [];
  for (const line of text.split('\n')) {
    if (HEADING.test(line) || !segs.length) segs.push({ id: ID.exec(line)?.[1] ?? null, lines: [] });
    segs.at(-1).lines.push(line);
  }
  return segs.map((s) => ({ id: s.id, raw: s.lines.join('\n') }));
}

// The segments are joined with the newline that split() consumed between them.
const joinSegs = (segs) => segs.map((s) => s.raw).join('\n');
const hasMore = (segs) => segs.some((s) => s.id);

// --- plan --------------------------------------------------------------------
const { goals } = readGoals(dir);
const words = new Map(goals.filter((g) => g.group === 'vocabulary').map((g) => [g.id, g]));

const writes = new Map(); // path -> new text
const removals = []; // paths to delete
const moved = new Map(); // goal id -> { tasks: [raw], rubrics: [raw] }
const summary = [];

const tasksDir = join(dir, 'tasks');
const rubricsDir = join(dir, 'rubrics');
const names = existsSync(tasksDir)
  ? readdirSync(tasksDir).filter((n) => n.endsWith('.md') && existsSync(join(rubricsDir, n))).sort()
  : [];

for (const name of names) {
  const tFile = join(tasksDir, name);
  const rFile = join(rubricsDir, name);
  const t = split(readFileSync(tFile, 'utf8'));
  const r = split(readFileSync(rFile, 'utf8'));
  const taskById = new Map(t.filter((b) => b.id).map((b) => [b.id, b]));
  const takenIds = new Set();
  for (const rb of r.filter((b) => b.id)) {
    const goal = /^-\s+\*\*goal:\*\*\s*(.*)$/m.exec(rb.raw)?.[1].replace(/`/g, '').trim();
    const tb = taskById.get(rb.id);
    if (!goal || !words.has(goal) || !tb) continue;
    takenIds.add(rb.id);
    if (!moved.has(goal)) moved.set(goal, { tasks: [], rubrics: [] });
    moved.get(goal).tasks.push(tb.raw);
    moved.get(goal).rubrics.push(rb.raw);
  }
  if (!takenIds.size) continue;
  const tLeft = t.filter((b) => !takenIds.has(b.id));
  const rLeft = r.filter((b) => !takenIds.has(b.id));
  if (!hasMore(tLeft) && !hasMore(rLeft)) {
    removals.push(tFile, rFile);
  } else {
    writes.set(tFile, joinSegs(tLeft));
    writes.set(rFile, joinSegs(rLeft));
  }
}

for (const [goal, { tasks, rubrics }] of moved) {
  const word = words.get(goal).text;
  const body = (parts) => parts.map((p) => p.trimEnd()).join('\n\n') + '\n';
  writes.set(join(tasksDir, 'a-words', `${goal}.md`), `# ${word}\n\n${body(tasks)}`);
  writes.set(join(rubricsDir, 'a-words', `${goal}.md`), `# Rubric: ${word}\n\n${body(rubrics)}`);
  summary.push(`moved ${tasks.length} question${tasks.length === 1 ? '' : 's'} for ${goal}`);
}
for (const f of removals) summary.push(`removed ${f}`);

// --- activities.md -----------------------------------------------------------
const A_WORDS = `### \`a-words\`

- **serves:** group vocabulary
- **generator:** the five moves in \`workflows/learn/skills/goal-setting/references/vocabulary-moves.md\`, set for one word at a time from its \`what it names\`, \`nearest confusable\` and \`synonyms\`. Each question names that word's goal and carries its move.
- **learner does:** answers one short question about one word
- **tutor role:** examiner
- **tutor does:** sets the question as served, without rewording it or hinting; when the bank has nothing for the word, sets one move live, as vocabulary-moves.md describes
- **offer as:** not offered as a choice; a word's question is set when that word is studied or due
`;

const actsFile = join(dir, 'activities.md');
const activities = readActivities(dir);
const onlyWords = (ids) => ids.length > 0 && ids.every((id) => words.has(id));
const stamps = new Set(
  activities.filter((e) => e.generated && onlyWords([...e.serves, ...e.checks])).map((e) => e.id)
);

let acts = existsSync(actsFile) ? readFileSync(actsFile, 'utf8') : '';
if (stamps.size) {
  acts = joinSegs(split(acts).filter((e) => !stamps.has(e.id)));
  summary.push(`removed ${stamps.size} stamped entr${stamps.size === 1 ? 'y' : 'ies'} from activities.md: ${[...stamps].join(', ')}`);
}
if (!activities.some((e) => e.id === 'a-words')) {
  acts = acts.replace(/\n*$/, '') + (acts.trim() ? '\n\n' : '') + A_WORDS;
  summary.push('added the a-words entry to activities.md');
}
if (acts !== (existsSync(actsFile) ? readFileSync(actsFile, 'utf8') : '')) writes.set(actsFile, acts);

// --- goals.md ----------------------------------------------------------------
const goalsFile = join(dir, 'goals.md');
const goalsText = readFileSync(goalsFile, 'utf8');
const SUPPLY = /^- \*\*supply:\*\* vocabulary[ \t]*\r?\n/gm;
const supplyCount = (goalsText.match(SUPPLY) ?? []).length;
if (supplyCount) {
  writes.set(goalsFile, goalsText.replace(SUPPLY, ''));
  summary.push(`removed ${supplyCount} supply line${supplyCount === 1 ? '' : 's'} from goals.md`);
}

// --- apply -------------------------------------------------------------------
console.log(flags['dry-run'] ? 'dry run, nothing written:' : 'migrated:');
for (const line of summary) console.log(`  ${line}`);
if (!summary.length) console.log('  nothing to do');

if (!flags['dry-run']) {
  for (const [path, text] of writes) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  for (const path of removals) rmSync(path);
}
