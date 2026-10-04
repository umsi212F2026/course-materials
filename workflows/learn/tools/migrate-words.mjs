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
// SAFETY. Bank files are split exactly as bank.mjs splits them (rawSections), so what this moves
// is what the reader of the result sees. The tool REFUSES, writing nothing, on a file with CRLF
// line endings, a duplicate section id, or a question whose rubric or task is missing. The new
// a-words files are written first and checked against the legacy pair by a count of every
// non-blank line (the moved text must reappear, once, and nothing else may change); only then are
// legacy files edited (temp file, then rename) or deleted. A pair is deleted only when nothing
// but a title is left in it.
//
// NOT ATOMIC. A rename that fails partway through the edits is not rolled back; the files
// already renamed stay changed, and the new a-words files stay in place.
//
// POOLS ARE CHECKED, NOT CHANGED. Before writing (and on --dry-run), every key in this
// checkout's quiz-bank/*.pool.json that draws from a bank of this topic the run would shrink or
// empty is warned about on stderr, with the bank's count before and after (see poolWarnings).
//
// ONE-SHOT. It refuses if tasks/a-words/ or rubrics/a-words/ already exists, so a second run can
// never duplicate a question. --dry-run prints the same summary and writes nothing.

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, renameSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readGoals, readActivities } from './lib/topic.mjs';
import { rawSections } from '../../quiz/tools/lib/bank.mjs';

const USAGE = `usage:
  node workflows/learn/tools/migrate-words.mjs <topic-folder> [--dry-run]

  --dry-run   print what would move and change; write nothing`;

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

const nonBlank = (text) => text.split('\n').filter((l) => l.trim());
const rejoin = (preamble, sections) => [...(preamble === null ? [] : [preamble]), ...sections.map((s) => s.text)].join('\n');
const idList = (text) => rawSections(text).sections.map((s) => s.id);

// --- activities.md and goals.md ----------------------------------------------
// These are not banks, so they are edited by lines, and only the lines named: an entry's heading,
// the bullets and indented continuations directly under it, and the blank lines among them. The
// first line that is none of those ends the entry, so a comment or prose that follows survives.
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

// Remove, from `text`, every block whose first line `isStart(line)` accepts (outside fences and
// comments), with its continuation lines (indented) and, when `withBlanks`, the column-0 bullets
// and blank lines of an activities entry. A goal's other fields are bullets too, so a supply
// line takes only its indented continuations. Returns { text, count }.
function removeBlocks(text, isStart, withBlanks) {
  const lines = text.split('\n');
  const live = liveLines(lines);
  const out = [];
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!(live[i] && isStart(lines[i]))) {
      out.push(lines[i]);
      continue;
    }
    count++;
    let j = i + 1;
    let end = i + 1;
    while (j < lines.length) {
      const l = lines[j];
      if ((withBlanks && /^[-*]\s/.test(l)) || /^\s+\S/.test(l)) end = ++j;
      else if (!l.trim() && withBlanks) j++;
      else break;
    }
    // Trailing blank lines go only if something follows them, so a final entry keeps the file's last newline.
    i = withBlanks && j < lines.length ? j - 1 : end - 1;
  }
  return { text: out.join('\n'), count };
}

// --- plan --------------------------------------------------------------------
const A_WORDS = `### \`a-words\`

- **serves:** group vocabulary
- **generator:** the five moves in \`workflows/learn/skills/goal-setting/references/vocabulary-moves.md\`, set for one word at a time from its \`what it names\`, \`nearest confusable\` and \`synonyms\`. Each question names that word's goal and carries its move.
- **learner does:** answers one short question about one word
- **tutor role:** examiner
- **tutor does:** sets the question as served, without rewording it or hinting; when the bank has nothing for the word, sets one move live, as vocabulary-moves.md describes
- **offer as:** not offered as a choice; a word's question is set when that word is studied or due
`;

/** Work out everything without touching disk. Returns { refusals, warnings, summary, created,
 *  edits, removals, moved, legacy } where `refusals` non-empty means nothing may be written.
 *  `legacy` is the before-state of each pair, kept for verification. */
export function planMigration(dir) {
  const refusals = [];
  const warnings = [];
  const summary = [];
  const created = new Map();
  const edits = new Map();
  const removals = [];
  const moved = new Map();
  const legacy = [];

  const tasksDir = join(dir, 'tasks');
  const rubricsDir = join(dir, 'rubrics');
  const goalsFile = join(dir, 'goals.md');
  const actsFile = join(dir, 'activities.md');
  const names = existsSync(tasksDir)
    ? readdirSync(tasksDir).filter((n) => n.endsWith('.md') && existsSync(join(rubricsDir, n))).sort()
    : [];

  // Every file the tool would read or touch is checked for CRLF first: readGoals misreads it, so
  // going on would move nothing yet still strip supply lines.
  const touched = [goalsFile, actsFile, ...names.flatMap((n) => [join(tasksDir, n), join(rubricsDir, n)])];
  for (const f of touched) if (existsSync(f) && readFileSync(f, 'utf8').includes('\r')) refusals.push(`${f} has CRLF line endings; convert it to LF first.`);
  if (refusals.length) return { refusals };

  const { goals } = readGoals(dir);
  const words = new Map(goals.filter((g) => g.group === 'vocabulary').map((g) => [g.id, g]));

  const seenT = new Map();
  const seenR = new Map();
  const pairs = names.map((name) => {
    const tFile = join(tasksDir, name);
    const rFile = join(rubricsDir, name);
    const t = rawSections(readFileSync(tFile, 'utf8'));
    const r = rawSections(readFileSync(rFile, 'utf8'));
    for (const [file, sec, seen] of [[tFile, t, seenT], [rFile, r, seenR]])
      for (const s of sec.sections) {
        if (seen.has(s.id)) refusals.push(`${s.id} appears twice (in ${seen.get(s.id)} and ${file}); ids must be unique.`);
        else seen.set(s.id, file);
      }
    const tIds = new Set(t.sections.map((s) => s.id));
    const rIds = new Set(r.sections.map((s) => s.id));
    for (const id of tIds) if (!rIds.has(id)) refusals.push(`${id} is in ${tFile} but has no rubric entry in ${rFile}.`);
    for (const id of rIds) if (!tIds.has(id)) refusals.push(`${id} is in ${rFile} but has no question in ${tFile}.`);
    for (const [f, text] of [[tFile, readFileSync(tFile, 'utf8')], [rFile, readFileSync(rFile, 'utf8')]])
      for (const line of text.split('\n'))
        if (/^###\s/.test(line) && !/^###\s+`?[A-Za-z0-9-]+`?\s*$/.test(line))
          warnings.push(`${f}: "${line}" is not a readable section id, so it will travel with the question before it.`);
    return { name, tFile, rFile, t, r, tText: readFileSync(tFile, 'utf8'), rText: readFileSync(rFile, 'utf8') };
  });
  if (refusals.length) return { refusals };

  for (const pr of pairs) {
    legacy.push({ tFile: pr.tFile, rFile: pr.rFile, tText: pr.tText, rText: pr.rText });
    const taskById = new Map(pr.t.sections.map((s) => [s.id, s]));
    const taken = new Set();
    for (const rb of pr.r.sections) {
      const goal = /^-\s+\*\*goal:\*\*\s*(.*)$/m.exec(rb.text)?.[1].replace(/`/g, '').trim();
      if (!goal || !words.has(goal)) continue;
      taken.add(rb.id);
      if (!moved.has(goal))
        moved.set(goal, { tFile: join(tasksDir, 'a-words', `${goal}.md`), rFile: join(rubricsDir, 'a-words', `${goal}.md`), tasks: [], rubrics: [], ids: [] });
      const m = moved.get(goal);
      m.tasks.push(taskById.get(rb.id).text);
      m.rubrics.push(rb.text);
      m.ids.push(rb.id);
    }
    if (!taken.size) continue;
    const tLeft = pr.t.sections.filter((s) => !taken.has(s.id));
    const rLeft = pr.r.sections.filter((s) => !taken.has(s.id));
    const tText = rejoin(pr.t.preamble, tLeft);
    const rText = rejoin(pr.r.preamble, rLeft);
    if (tLeft.length || rLeft.length) {
      edits.set(pr.tFile, tText);
      edits.set(pr.rFile, rText);
      continue;
    }
    // A pair with nothing left is deleted only if all that remains is a title.
    const titleOnly = (pre) => {
      const lines = nonBlank(pre ?? '');
      return lines.length === 0 || (lines.length === 1 && /^#\s/.test(lines[0]));
    };
    if (titleOnly(pr.t.preamble) && titleOnly(pr.r.preamble)) removals.push(pr.tFile, pr.rFile);
    else {
      edits.set(pr.tFile, tText);
      edits.set(pr.rFile, rText);
      warnings.push(`${pr.tFile} and ${pr.rFile} have no questions left but hold other text, so they were kept.`);
    }
  }

  for (const [goal, m] of moved) {
    const word = words.get(goal).text;
    // Only trailing whitespace-only lines go: trimEnd would also strip spaces from the last content line.
    const body = (parts) => parts.map((p) => p.replace(/(\n[ \t]*)*$/, '')).join('\n\n') + '\n';
    created.set(m.tFile, `# ${word}\n\n${body(m.tasks)}`);
    created.set(m.rFile, `# Rubric: ${word}\n\n${body(m.rubrics)}`);
    summary.push(`moved ${m.tasks.length} question${m.tasks.length === 1 ? '' : 's'} for ${goal}`);
  }
  for (const f of removals) summary.push(`removed ${f}`);

  // activities.md: stamps, then the a-words entry.
  const original = existsSync(actsFile) ? readFileSync(actsFile, 'utf8') : '';
  const activities = readActivities(dir);
  const onlyWords = (ids) => ids.length > 0 && ids.every((id) => words.has(id));
  const stamps = new Set(activities.filter((e) => e.generated && onlyWords([...e.serves, ...e.checks])).map((e) => e.id));
  let acts = original;
  if (stamps.size) {
    const gone = new Set();
    const r = removeBlocks(acts, (l) => { const m = /^###\s+`?([A-Za-z0-9-]+)`?\s*$/.exec(l); if (m && stamps.has(m[1])) gone.add(m[1]); return !!m && stamps.has(m[1]); }, true);
    acts = r.text;
    // A stamp readActivities saw but the line scan skipped (an inline `<!--` can hide it) stays behind.
    for (const id of stamps) if (!gone.has(id)) warnings.push(`${actsFile}: the stamp ${id} was not removed; delete it by hand.`);
    if (r.count) summary.push(`removed ${r.count} stamped entr${r.count === 1 ? 'y' : 'ies'} from activities.md`);
  }
  if (words.size && !activities.some((e) => e.id === 'a-words')) {
    acts = acts.replace(/\n*$/, '') + (acts.trim() ? '\n\n' : '') + A_WORDS;
    summary.push('added the a-words entry to activities.md');
  }
  if (acts !== original) edits.set(actsFile, acts);

  // goals.md: the retired supply lines.
  const goalsText = readFileSync(goalsFile, 'utf8');
  const g = removeBlocks(goalsText, (l) => /^- \*\*supply:\*\* vocabulary[ \t]*$/.test(l), false);
  if (g.count) {
    edits.set(goalsFile, g.text);
    summary.push(`removed ${g.count} supply line${g.count === 1 ? '' : 's'} from goals.md`);
  }
  return { refusals, warnings, summary, created, edits, removals, moved, legacy };
}

/** Check the new files on disk against the legacy pairs, without trusting the splitter's own
 *  idea of a section: every non-blank line before the run must be accounted for exactly once
 *  after it (planned legacy files plus the new files), ignoring only the title lines the tool
 *  added and the titles of pairs it deletes; and the legacy ids left must be the old ids minus
 *  the moved ones. Returns mismatch descriptions, empty when all is well. */
export function verifyPlan(plan) {
  const bad = [];
  const tally = (m, lines, d) => lines.forEach((l) => m.set(l, (m.get(l) ?? 0) + d));
  const counts = new Map();
  const removed = new Set(plan.removals);
  for (const p of plan.legacy) {
    for (const [f, text] of [[p.tFile, p.tText], [p.rFile, p.rText]]) {
      let lines = nonBlank(text);
      if (removed.has(f) && /^#\s/.test(lines[0] ?? '')) lines = lines.slice(1);
      tally(counts, lines, 1);
      tally(counts, nonBlank(plan.edits.get(f) ?? (removed.has(f) ? '' : text)), -1);
    }
  }
  const movedIds = new Set();
  for (const [goal, m] of plan.moved) {
    for (const f of [m.tFile, m.rFile]) {
      if (!existsSync(f)) {
        bad.push(`${f} was not written`);
        continue;
      }
      tally(counts, nonBlank(readFileSync(f, 'utf8')).slice(1), -1);
    }
    m.ids.forEach((id) => movedIds.add(id));
    for (const [f, n] of [[m.tFile, m.ids.length], [m.rFile, m.ids.length]])
      if (existsSync(f) && idList(readFileSync(f, 'utf8')).join() !== m.ids.join()) bad.push(`${f} does not hold ${goal}'s questions ${m.ids.join(', ')} in order`);
  }
  for (const [line, n] of counts) if (n !== 0) bad.push(`line count differs by ${n}: ${line.slice(0, 80)}`);
  for (const p of plan.legacy)
    for (const [f, text] of [[p.tFile, p.tText], [p.rFile, p.rText]]) {
      if (removed.has(f)) continue;
      const want = idList(text).filter((id) => !movedIds.has(id)).join();
      const got = idList(plan.edits.get(f) ?? text).join();
      if (want !== got) bad.push(`${f} would keep ids [${got}], expected [${want}]`);
    }
  return bad;
}

// --- pools ----------------------------------------------------------------------
// The course-materials checkout this script lives in: workflows/learn/tools/ -> the repo root.
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** One warning per pool key that draws from a legacy bank of this topic the plan would shrink
 *  or empty, giving the bank's question count before and after.
 *
 *  MIGRATING A TOPIC AND UPDATING ITS POOLS ARE ONE CHANGE. A key on a bank that loses its word
 *  questions keeps resolving and quietly draws from what is left (or, emptied, stops resolving),
 *  so a session's quiz shrinks with nothing failing. This says so before anything is written. It
 *  is a warning, not a refusal: the pool is updated in the same change, after the run.
 *
 *  A pool names this topic by its folder name, in the topic form (`"topic": "<folder>"`, keys
 *  are banks) or as the segment after `learning-topics` in a key. A topic-level key is not
 *  warned about: its total is unchanged, though its spread moves. No quiz-bank/ means no pools
 *  to check, which is not an error. */
export function poolWarnings(plan, dir, repo = REPO) {
  const banks = join(repo, 'quiz-bank');
  if (!existsSync(banks)) return [];
  const folder = basename(resolve(dir));
  const removed = new Set(plan.removals);
  const counts = new Map();
  for (const p of plan.legacy) {
    const before = idList(p.tText).length;
    const after = removed.has(p.tFile) ? 0 : idList(plan.edits.get(p.tFile) ?? p.tText).length;
    if (after < before) counts.set(basename(p.tFile, '.md'), [before, after]);
  }
  const out = [];
  for (const name of readdirSync(banks).filter((n) => n.endsWith('.pool.json')).sort()) {
    let pool;
    try {
      pool = JSON.parse(readFileSync(join(banks, name), 'utf8'));
    } catch {
      continue;
    }
    for (const key of Object.keys(pool.draw ?? {})) {
      const parts = key.split('/');
      let bank = null;
      if (pool.topic) bank = pool.topic === folder ? parts[0] : null;
      else {
        const at = parts.indexOf('learning-topics');
        if (at !== -1 && parts[at + 1] === folder) bank = parts[at + 2] ?? null;
      }
      if (!bank || !counts.has(bank)) continue;
      const [before, after] = counts.get(bank);
      out.push(`quiz-bank/${name}: "${key}" draws from bank ${bank}, which this run takes from ${before} questions to ${after}; update the pool in the same change.`);
    }
  }
  return out;
}

function main() {
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
  const newDirs = [join(dir, 'tasks', 'a-words'), join(dir, 'rubrics', 'a-words')];
  for (const d of newDirs) if (existsSync(d)) die(`${d} already exists; nothing was changed.`);

  const plan = planMigration(dir);
  if (plan.refusals.length) die(`Refusing, nothing was changed:\n  ${plan.refusals.join('\n  ')}`);
  for (const w of [...plan.warnings, ...poolWarnings(plan, dir)]) console.error(`warning: ${w}`);
  const report = (head) => {
    console.log(head);
    for (const line of plan.summary) console.log(`  ${line}`);
    if (!plan.summary.length) console.log('  nothing to do');
  };
  if (flags['dry-run']) return report('dry run, nothing written:');

  // NEW FILES FIRST, THEN VERIFIED, THEN EDITS, THEN DELETIONS.
  const undo = () => {
    for (const d of newDirs) rmSync(d, { recursive: true, force: true });
  };
  try {
    for (const [path, text] of plan.created) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text, { flag: 'wx' });
    }
  } catch (err) {
    undo();
    die(`Could not write the new files, nothing was changed: ${err.message}`);
  }
  const bad = verifyPlan(plan);
  if (bad.length) {
    undo();
    die(`Verification failed, nothing was changed:\n  ${bad.join('\n  ')}`);
  }
  for (const [path, text] of plan.edits) {
    const tmp = join(dirname(path), `.${basename(path)}.migrate-tmp`);
    writeFileSync(tmp, text);
    renameSync(tmp, path);
  }
  for (const path of plan.removals) rmSync(path);
  report('migrated:');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
