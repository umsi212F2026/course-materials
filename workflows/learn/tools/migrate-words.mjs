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
// SAFETY. The splitter ignores headings inside code fences and HTML comments (a question may
// quote a shell comment, a template comment may show a `### <id>` heading). The new a-words files
// are written FIRST and re-read against their sources; only if every moved section is
// byte-identical are the legacy files edited or deleted, so a failure never loses a question.
//
// ONE-SHOT. It refuses if tasks/a-words/ or rubrics/a-words/ already exists, so a second run can never duplicate a
// question. --dry-run prints the same summary and writes nothing.

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readGoals, readActivities } from './lib/topic.mjs';

const USAGE = `usage:
  node workflows/learn/tools/migrate-words.mjs <topic-folder> [--dry-run]

  --dry-run   print what would move and change; write nothing`;

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

// --- raw splitting -----------------------------------------------------------
// bank.mjs trims and parses its sections; moving text needs them untouched. A segment runs from
// a boundary line to the next, trailing blank lines included, and the segments concatenate back
// to the file exactly (joined by the newline split() consumed).
const HEADING = /^#{1,3}\s/;
const ID = /^###\s+`?([A-Za-z0-9-]+)`?\s*$/;

// Which lines START outside a code fence and outside an HTML comment. Only those can be headings.
function liveLines(lines) {
  let fence = false;
  let comment = false;
  return lines.map((line) => {
    const live = !fence && !comment;
    if (!comment && /^\s*(```|~~~)/.test(line)) fence = !fence;
    else if (!fence) for (const m of line.matchAll(/<!--|-->/g)) comment = m[0] === '<!--';
    return live;
  });
}

/** mode 'bank': only `### <id>` starts a segment, as in bank.mjs, so any other heading stays in
 *  the question it follows. mode 'doc' (activities.md): every `#`..`###` heading is a boundary,
 *  so an entry ends at the next `### ` or `## `. Only a `### <id>` segment carries an id. */
export function split(text, mode = 'bank') {
  const lines = text.split('\n');
  const live = liveLines(lines);
  const segs = [];
  lines.forEach((line, i) => {
    const boundary = live[i] && (mode === 'bank' ? ID.test(line) : HEADING.test(line));
    if (boundary || !segs.length) segs.push({ id: ID.exec(line)?.[1] ?? null, lines: [] });
    segs.at(-1).lines.push(line);
  });
  return segs.map((s) => ({ id: s.id, raw: s.lines.join('\n') }));
}

const joinSegs = (segs) => segs.map((s) => s.raw).join('\n');
const hasMore = (segs) => segs.some((s) => s.id);

// A `### ` heading the splitter cannot read as an id cannot move, so say so.
function unreadable(text) {
  const lines = text.split('\n');
  const live = liveLines(lines);
  return lines.filter((l, i) => live[i] && /^###\s/.test(l) && !ID.test(l));
}

// --- verification ------------------------------------------------------------
/** Re-read each new a-words file and confirm every moved section is byte-identical to its source
 *  and that nothing else is in it. `moved` is Map goal -> { tFile, rFile, tasks, rubrics } where
 *  tasks and rubrics are the raw source sections. Returns a list of mismatch descriptions. */
export function verifyWritten(moved) {
  const bad = [];
  for (const [goal, m] of moved) {
    for (const [file, want] of [[m.tFile, m.tasks], [m.rFile, m.rubrics]]) {
      if (!existsSync(file)) {
        bad.push(`${file} was not written`);
        continue;
      }
      const got = split(readFileSync(file, 'utf8')).filter((x) => x.id);
      if (got.length !== want.length) bad.push(`${file} holds ${got.length} sections, expected ${want.length} for ${goal}`);
      want.forEach((raw, i) => {
        if (got[i]?.raw.trimEnd() !== raw.trimEnd()) bad.push(`${file} section ${i + 1} differs from its source`);
      });
    }
  }
  return bad;
}

// --- plan --------------------------------------------------------------------
function plan(dir) {
  const { goals } = readGoals(dir);
  const words = new Map(goals.filter((g) => g.group === 'vocabulary').map((g) => [g.id, g]));

  const created = new Map(); // new a-words files
  const edits = new Map(); // existing files rewritten
  const removals = [];
  const moved = new Map();
  const summary = [];
  const warnings = [];

  const tasksDir = join(dir, 'tasks');
  const rubricsDir = join(dir, 'rubrics');
  const names = existsSync(tasksDir)
    ? readdirSync(tasksDir).filter((n) => n.endsWith('.md') && existsSync(join(rubricsDir, n))).sort()
    : [];

  for (const name of names) {
    const tFile = join(tasksDir, name);
    const rFile = join(rubricsDir, name);
    const tText = readFileSync(tFile, 'utf8');
    const rText = readFileSync(rFile, 'utf8');
    for (const [f, text] of [[tFile, tText], [rFile, rText]])
      for (const h of unreadable(text)) warnings.push(`${f}: "${h}" is not a readable section id, so it cannot move`);
    const t = split(tText);
    const r = split(rText);
    const taskById = new Map(t.filter((b) => b.id).map((b) => [b.id, b]));
    const takenIds = new Set();
    for (const rb of r.filter((b) => b.id)) {
      const goal = /^-\s+\*\*goal:\*\*\s*(.*)$/m.exec(rb.raw)?.[1].replace(/`/g, '').trim();
      const tb = taskById.get(rb.id);
      if (!goal || !words.has(goal) || !tb) continue;
      takenIds.add(rb.id);
      if (!moved.has(goal))
        moved.set(goal, {
          tFile: join(tasksDir, 'a-words', `${goal}.md`),
          rFile: join(rubricsDir, 'a-words', `${goal}.md`),
          tasks: [],
          rubrics: [],
        });
      moved.get(goal).tasks.push(tb.raw);
      moved.get(goal).rubrics.push(rb.raw);
    }
    if (!takenIds.size) continue;
    const tLeft = t.filter((b) => !takenIds.has(b.id));
    const rLeft = r.filter((b) => !takenIds.has(b.id));
    if (!hasMore(tLeft) && !hasMore(rLeft)) removals.push(tFile, rFile);
    else {
      edits.set(tFile, joinSegs(tLeft));
      edits.set(rFile, joinSegs(rLeft));
    }
  }

  for (const [goal, m] of moved) {
    const word = words.get(goal).text;
    const body = (parts) => parts.map((p) => p.trimEnd()).join('\n\n') + '\n';
    created.set(m.tFile, `# ${word}\n\n${body(m.tasks)}`);
    created.set(m.rFile, `# Rubric: ${word}\n\n${body(m.rubrics)}`);
    summary.push(`moved ${m.tasks.length} question${m.tasks.length === 1 ? '' : 's'} for ${goal}`);
  }
  for (const f of removals) summary.push(`removed ${f}`);

  // --- activities.md ---
  const actsFile = join(dir, 'activities.md');
  const original = existsSync(actsFile) ? readFileSync(actsFile, 'utf8') : '';
  const activities = readActivities(dir);
  const onlyWords = (ids) => ids.length > 0 && ids.every((id) => words.has(id));
  const stamps = new Set(
    activities.filter((e) => e.generated && onlyWords([...e.serves, ...e.checks])).map((e) => e.id)
  );
  let acts = original;
  if (stamps.size) {
    const segs = split(acts, 'doc');
    const kept = segs.filter((e) => !stamps.has(e.id));
    const gone = segs.filter((e) => stamps.has(e.id)).map((e) => e.id);
    acts = joinSegs(kept);
    if (gone.length) summary.push(`removed ${gone.length} stamped entr${gone.length === 1 ? 'y' : 'ies'} from activities.md: ${gone.join(', ')}`);
  }
  if (!activities.some((e) => e.id === 'a-words')) {
    acts = acts.replace(/\n*$/, '') + (acts.trim() ? '\n\n' : '') + A_WORDS;
    summary.push('added the a-words entry to activities.md');
  }
  if (acts !== original) edits.set(actsFile, acts);

  // --- goals.md ---
  const goalsFile = join(dir, 'goals.md');
  const goalLines = readFileSync(goalsFile, 'utf8').split('\n');
  const live = liveLines(goalLines);
  const keep = goalLines.filter((l, i) => !(live[i] && /^- \*\*supply:\*\* vocabulary[ \t]*\r?$/.test(l)));
  const supplyCount = goalLines.length - keep.length;
  if (supplyCount) {
    edits.set(goalsFile, keep.join('\n'));
    summary.push(`removed ${supplyCount} supply line${supplyCount === 1 ? '' : 's'} from goals.md`);
  }
  return { created, edits, removals, moved, summary, warnings };
}

const A_WORDS = `### \`a-words\`

- **serves:** group vocabulary
- **generator:** the five moves in \`workflows/learn/skills/goal-setting/references/vocabulary-moves.md\`, set for one word at a time from its \`what it names\`, \`nearest confusable\` and \`synonyms\`. Each question names that word's goal and carries its move.
- **learner does:** answers one short question about one word
- **tutor role:** examiner
- **tutor does:** sets the question as served, without rewording it or hinting; when the bank has nothing for the word, sets one move live, as vocabulary-moves.md describes
- **offer as:** not offered as a choice; a word's question is set when that word is studied or due
`;

function main() {
  // --- arguments ---
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
  for (const d of [join(dir, 'tasks', 'a-words'), join(dir, 'rubrics', 'a-words')])
    if (existsSync(d)) die(`${d} already exists; nothing was changed.`);

  const { created, edits, removals, moved, summary, warnings } = plan(dir);
  for (const w of warnings) console.error(`warning: ${w}`);
  console.log(flags['dry-run'] ? 'dry run, nothing written:' : 'migrated:');
  for (const line of summary) console.log(`  ${line}`);
  if (!summary.length) console.log('  nothing to do');
  if (flags['dry-run']) return;

  // NEW FILES FIRST, THEN VERIFIED, THEN EDITS, THEN DELETIONS. Until every moved section has
  // been read back identical, the legacy files are untouched and the move can be undone.
  for (const [path, text] of created) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  const bad = verifyWritten(moved);
  if (bad.length) {
    for (const path of created.keys()) rmSync(path, { force: true });
    for (const d of [join(dir, 'tasks', 'a-words'), join(dir, 'rubrics', 'a-words')]) rmSync(d, { recursive: true, force: true });
    die(`Verification failed, nothing was changed:\n  ${bad.join('\n  ')}`);
  }
  for (const [path, text] of edits) writeFileSync(path, text);
  for (const path of removals) rmSync(path);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
