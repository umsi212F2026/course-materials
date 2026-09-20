// Build a quiz bank out of a source's tasks/ and rubrics/ folders.
//
// THE ITEMS ARE PUBLIC AND THE SELECTION IS PRIVATE, and that split is the whole point of this
// module. Questions live in a repository that ships to students, so studying the material and
// studying for the quiz are the same act. Which of them are fair on a given date is a judgment
// about one session, so it lives in the instructor's clone, in
// data/quiz-bank/session-<n>.pool.json.
//
// ONE DRAW LIBRARY, TWO FRONT ENDS. The instructor's quiz-bake.mjs draws one quiz per student
// before class; the practice quiz draws one for a student on their own machine. Both come through
// here, which is what makes "you practise against the real generator" true rather than a claim.
//
// A SOURCE IS NOT ONLY A LEARNING TOPIC. It is any folder holding tasks/ and rubrics/, named by a
// path from the workspace root: learning-topics/react-apps-2026-09, assignments/ps1-data-analysis.
// One spelling resolves the same on the instructor's machine and a student's, because the sibling
// layout is the same on both. Problem set follow-ups live beside the problem set rather than being
// made into a topic, because nobody set goals for a problem set.
//
// OUTPUT IS THE SHAPE quiz-bake ALREADY EXPECTS: { items: [...] }, each item
// { id, type, prompt } plus `rubric` on a free item, or `choices` and `answer` on an mcq.
// Nothing downstream changes.
//
// ANSWERS ARE 1-BASED IN THE FILE and 0-based in the output. The rubric file is written for a
// person reading it next to the numbered list in tasks/, and the draw contract already uses an
// index. Converting here is the only place that has to know.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// One `### heading` block. Returns [{ id, body }] in file order.
function sections(text) {
  const out = [];
  let id = null;
  let lines = [];
  for (const line of text.split('\n')) {
    const m = /^###\s+`?([A-Za-z0-9-]+)`?\s*$/.exec(line);
    if (m) {
      if (id) out.push({ id, body: lines.join('\n').trim() });
      id = m[1];
      lines = [];
    } else if (id) {
      lines.push(line);
    }
  }
  if (id) out.push({ id, body: lines.join('\n').trim() });
  return out;
}

// `- **name:** value`, with continuation lines folded in. Returns { name: value }.
function fields(body) {
  const out = {};
  let key = null;
  for (const line of body.split('\n')) {
    const m = /^-\s+\*\*([a-z]+):\*\*\s*(.*)$/.exec(line);
    if (m) {
      key = m[1];
      out[key] = m[2].trim();
    } else if (key && line.trim()) {
      out[key] += ' ' + line.trim();
    } else {
      key = null;
    }
  }
  return out;
}

// A question body is prose, optionally followed by a numbered list that is the mcq's choices.
// Markdown wraps prose at the column, and a hard newline inside a sentence would reach the
// student verbatim. Single newlines become spaces; blank lines stay, so a two-paragraph question
// keeps its break.
function unwrap(text) {
  return text
    .split(/\n\s*\n/)
    .map((para) => para.split('\n').map((l) => l.trim()).join(' ').trim())
    .join('\n\n');
}

function splitChoices(body) {
  const lines = body.split('\n');
  const first = lines.findIndex((l) => /^\d+\.\s+/.test(l.trim()));
  if (first === -1) return { prompt: unwrap(body), choices: null };
  const choices = lines
    .slice(first)
    .map((l) => /^\d+\.\s+(.*)$/.exec(l.trim()))
    .filter(Boolean)
    .map((m) => m[1].trim());
  return { prompt: unwrap(lines.slice(0, first).join('\n')), choices };
}

/** Read every question and rubric in one source. Returns { items, problems } with items keyed in
 *  file order across tasks/, and problems as human-readable strings. It COLLECTS rather than
 *  throwing, for the same reason applySlots does: one malformed entry should not hide the other
 *  eighteen, and the caller decides whether to proceed.
 *
 *  `label` qualifies each item's `bank` so strata stay distinct when a pool draws from several
 *  sources that happen to name a tasks file the same. Omitted, bank keys are bare file names,
 *  which is the single-source form a pool carrying `topic` still uses. */
export function readBank(dir, label = '') {
  const problems = [];
  const tasksDir = join(dir, 'tasks');
  const rubricsDir = join(dir, 'rubrics');

  if (!existsSync(tasksDir)) return { items: [], problems: [`no tasks/ in ${dir}`] };

  const rubrics = new Map();
  if (existsSync(rubricsDir)) {
    for (const name of readdirSync(rubricsDir).filter((n) => n.endsWith('.md'))) {
      for (const s of sections(readFileSync(join(rubricsDir, name), 'utf8'))) {
        if (rubrics.has(s.id)) problems.push(`${s.id} has two rubric entries`);
        rubrics.set(s.id, fields(s.body));
      }
    }
  }

  const items = [];
  const seen = new Set();
  for (const name of readdirSync(tasksDir).filter((n) => n.endsWith('.md')).sort()) {
    // A BANK FILE IS A tasks/ FILE WITH A rubrics/ FILE OF THE SAME NAME, AND NOTHING ELSE.
    // A topic's tasks/ also holds study activities, and their sections carry ids of the same
    // shape (`### a1` in react-apps-2026-09), so without this gate every one of them reads as
    // a question nothing could grade, and a topic that teaches as well as examines reports
    // dozens of phantom problems and draws nothing. Skipped silently, because a study activity
    // having no rubric is not a defect: it is what a study activity is.
    if (!existsSync(join(rubricsDir, name))) continue;
    for (const s of sections(readFileSync(join(tasksDir, name), 'utf8'))) {
      if (seen.has(s.id)) {
        problems.push(`${s.id} appears in two task files; ids are permanent and must be unique`);
        continue;
      }
      seen.add(s.id);

      const r = rubrics.get(s.id);
      if (!r) {
        problems.push(`${s.id} is in tasks/${name} with no rubric entry, so nothing could grade it`);
        continue;
      }

      const { prompt, choices } = splitChoices(s.body);
      const type = r.type || 'free';
      // Which bank this came out of. A pool can then say how many to draw from each, which is
      // what `curation/generate` means by a bank entry having to "say how many and how to pick".
      const base = name.replace(/\.md$/, '');
      const bank = label ? `${label}/${base}` : base;

      // THE GOAL AND THE MOVE TRAVEL WITH THE ITEM, for the two things downstream that need
      // them: the grader, which rules a capability item's criterion `unchecked`, and the
      // practice quiz, which records an attempt against the goal. Neither reaches the student:
      // quiz-seed's validateItem allow-lists what the app is served, so a draw file is
      // deliberately richer than the page built from it. A source with no goals, an
      // assignment's follow-ups for instance, simply carries neither.
      const recording = {};
      if (r.goal) recording.goal = r.goal;
      if (r.move) recording.move = r.move;

      // `rubric` joins the model answer and the credit line, because that is the single string
      // the grader wants. Feedback wants only the first half: telling a student "Full credit for
      // saying X, do not accept Y" reads as marking instructions rather than as an answer. So the
      // model answer travels separately too, and nothing has to split the joined string back up.
      if (r.answer) recording.expected = r.answer;

      if (type === 'mcq') {
        if (!choices) {
          problems.push(`${s.id} is type mcq but its question carries no numbered choices`);
          continue;
        }
        const n = Number(r.answer);
        if (!Number.isInteger(n) || n < 1 || n > choices.length) {
          problems.push(`${s.id} has answer: ${r.answer}, which is not one of its ${choices.length} choices`);
          continue;
        }
        items.push({ bank, ...recording, id: s.id, type, prompt, choices, answer: n - 1 });
      } else {
        if (!r.answer) {
          problems.push(`${s.id} has no answer in its rubric`);
          continue;
        }
        // One string, because that is what the draw contract and the grader already take.
        const credit = r.credit ? r.credit.charAt(0).toUpperCase() + r.credit.slice(1) : '';
        const rubric = credit ? `${r.answer} ${credit}` : r.answer;
        items.push({ bank, ...recording, id: s.id, type, prompt, rubric });
      }
    }
  }

  return { items, problems };
}

/** Read every source a pool draws from, merged into one bank.
 *
 *  THE SOURCES ARE DERIVED FROM THE DRAW KEYS rather than listed separately, so the two can
 *  never disagree. A key is `<source>/<tasks file>`, and the source is everything before the
 *  last slash: `learning-topics/react-apps-2026-09/words` reads
 *  `<root>/learning-topics/react-apps-2026-09` and takes its `words` bank.
 *
 *  A POOL CARRYING `topic` IS THE SINGLE-SOURCE FORM and predates this. Its draw keys are bare
 *  file names under one topic, and it is read exactly as before, so a session baked before this
 *  change re-bakes unchanged. That is the only reason the old shape survives.
 *
 *  A MISSING SOURCE IS A PROBLEM, NOT A THROW. A pool that has drifted from the repositories is
 *  how a quiz silently comes up short, and the caller decides whether to proceed. */
export function readPoolSources(pool, root) {
  if (pool.topic) return readBank(join(root, 'learning-topics', pool.topic));

  const items = [];
  const problems = [];
  const sources = new Set(
    Object.keys(pool.draw ?? {}).map((key) => key.split('/').slice(0, -1).join('/'))
  );

  for (const source of sources) {
    if (!source) {
      problems.push(`a draw key names no source; write it as <source>/<tasks file>`);
      continue;
    }
    const dir = join(root, source);
    if (!existsSync(dir)) {
      problems.push(`pool draws from ${source}, which is not a folder under ${root}`);
      continue;
    }
    const bank = readBank(dir, source);
    items.push(...bank.items);
    problems.push(...bank.problems);
  }

  return { items, problems };
}

/** Apply one session's pool to a source's items.
 *
 *  `draw` is the shape to prefer: { "<bank>": <how many> }, naming a file in tasks/ and how many
 *  of its questions each student gets. It is stratified on purpose: "three about reading a
 *  diagram and one about lanes" is a statement about what the quiz covers, which a flat draw
 *  cannot make and cannot be relied on to produce by chance.
 *
 *  `exclude` drops individual ids from a bank that is otherwise all in.
 *
 *  `eligible`, a flat allowlist, is still honoured for a pool written before strata existed.
 *
 *  Returns strata as well as items, because the draw has to happen per bank and the caller is
 *  what does the drawing. A named bank or excluded id that does not exist is a problem rather
 *  than a silence: a pool that has drifted from the topic is how a quiz comes up short. */
export function applyPool(bank, pool) {
  const problems = [...bank.problems];
  const byBank = new Map();
  for (const item of bank.items) {
    if (!byBank.has(item.bank)) byBank.set(item.bank, []);
    byBank.get(item.bank).push(item);
  }

  const excluded = new Set(Object.keys(pool.exclude ?? pool.excluded ?? {}));
  for (const id of excluded) {
    if (!bank.items.some((i) => i.id === id)) problems.push(`pool excludes ${id}, which is not in the topic's tasks/`);
  }

  if (pool.draw) {
    const strata = [];
    for (const [name, take] of Object.entries(pool.draw)) {
      const available = (byBank.get(name) ?? []).filter((i) => !excluded.has(i.id));
      if (!byBank.has(name)) {
        problems.push(`pool draws from ${name}, which is not a file in the topic's tasks/`);
        continue;
      }
      if (available.length < take) {
        problems.push(`pool draws ${take} from ${name}, which has only ${available.length} available`);
      }
      strata.push({ name, take, items: available });
    }
    // EXHAUSTIVE ONLY IN THE SINGLE-SOURCE FORM. With one topic, a bank file the pool never
    // mentions is drift: the pool was written against a topic that has since grown a file. With
    // several sources, a source is read because the pool named it, and having banks it does not
    // draw from this week is the ordinary case, and a topic examined twice in a term is not a
    // defect the first time. The half that matters is still caught below, where a draw naming a
    // bank that does not exist is a problem either way.
    if (pool.topic) {
      for (const name of byBank.keys()) {
        if (!Object.hasOwn(pool.draw, name)) problems.push(`${name} is in the topic but the pool's draw does not mention it`);
      }
    }
    return { items: strata.flatMap((s) => s.items), strata, problems };
  }

  const items = [];
  for (const id of pool.eligible ?? []) {
    const item = bank.items.find((i) => i.id === id);
    if (!item) problems.push(`pool names ${id}, which is not in the topic's tasks/`);
    else items.push(item);
  }
  const named = new Set([...(pool.eligible ?? []), ...excluded]);
  for (const item of bank.items) {
    if (!named.has(item.id)) problems.push(`${item.id} is in the topic but the pool neither includes nor excludes it`);
  }
  return { items, strata: null, problems };
}
