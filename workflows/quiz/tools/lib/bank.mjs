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
// A COMPOUND, a question whose body has `#### a`, `#### b` parts and whose rubric says
// `type: compound`, is one item of type `compound` whose `prompt` is its stem and whose `parts`
// are [{ label, type, prompt, ... }], each part carrying what an item of its type carries
// (`choices` and `answer`, or `rubric`, `expected` and `credit`) and an optional `tutorNote`.
// It is one question to a pool, worth one question's credit. Every other item reads exactly as it
// did before compounds existed.
//
// WHAT THE PRIVATE TOOLS CAN RELY ON. A pool written against single-file banks draws exactly
// what it always drew, and a single-file item keeps its exact shape, bare `id` included. That
// holds until the pool's topics are migrated to folder banks (migrate-words.mjs), and the pool
// is rewritten in the same change, so a re-bake after that draws differently. A folder item's
// `id` is qualified and contains `/`, so the quiz app must treat an item id as an opaque string.
// Every stratum carries `bank`, the bank its items come from.
//
// ANSWERS ARE 1-BASED IN THE FILE and 0-based in the output. The rubric file is written for a
// person reading it next to the numbered list in tasks/, and the draw contract already uses an
// index. Converting here is the only place that has to know.
//
// TWO LAYOUTS. A single-file bank is tasks/<name>.md with rubrics/<name>.md, one item per `###`.
// A FOLDER BANK is tasks/<activity>/<scenario>.md with rubrics/<activity>/<scenario>.md: the top
// of each file (before its first `###`) is shared by the scenario's questions, the setup in
// tasks/ and the key in rubrics/, and each `###` is one question. The item's label is
// <activity>/<scenario>/<question>, and its stratum is the activity. Once rubrics/<activity>/
// exists, a scenario file with no rubric file beside it is a PROBLEM, though a single file without
// one is skipped silently: a folder that has started a key is a bank, whereas a loose tasks/ file
// may be a study activity. A LEGACY tasks/<activity>/ with no rubrics/<activity>/ at all is skipped
// too, with no items and no problems: authored topics kept study material in folders like that
// before folder banks existed, and calling every file in one a broken bank would bury the real
// problems under dozens of phantom ones.
//
// A SCENARIO'S FRAMING NEVER REACHES A PROMPT. A tasks/ top part may end in a `## Framing` line
// and the text under it, which introduces the run of questions ("each question is a different
// change"). An item's `setup` is the scenario above the marker, its `framing` the text below it,
// and its `prompt` is the setup and the question, never the framing: a draw shows one question,
// and words about a run read as broken above it. Study prints the framing itself, before the
// first question it serves from a scenario (next-item.mjs). A file without the marker reads as
// before, with `framing` empty.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tagsForMove } from '../../../learn/tools/lib/moves.mjs';

// The one splitter. A section starts at a `### <id>` line (no fence or comment tracking, and an id
// outside [A-Za-z0-9-] is not a heading, so that line belongs to the section before it) and runs
// to the line before the next one. Returns { preamble, sections: [{ id, text }] } with `text`
// VERBATIM (heading line included, trailing blank lines included) and `preamble` the text before
// the first section, or null when the file starts with one. Joining the preamble (if any) and
// each section's text with '\n' gives the file back exactly. Anything that moves or rewrites
// bank text uses this, so it and the reader of its output cannot disagree about where a
// question ends.
export function rawSections(text) {
  const sections = [];
  let pre = [];
  let cur = null;
  for (const line of text.split('\n')) {
    const m = /^###\s+`?([A-Za-z0-9-]+)`?\s*$/.exec(line);
    if (m) {
      cur = { id: m[1], lines: [line] };
      sections.push(cur);
    } else if (cur) cur.lines.push(line);
    else pre.push(line);
  }
  return {
    preamble: sections.length && !pre.length ? null : pre.join('\n'),
    sections: sections.map((s) => ({ id: s.id, text: s.lines.join('\n') })),
  };
}

// One `### heading` block. Returns [{ id, body }] in file order.
function sections(text) {
  return rawSections(text).sections.map((s) => ({
    id: s.id,
    body: s.text.split('\n').slice(1).join('\n').trim(),
  }));
}

// `- **name:** value`, with continuation lines folded in. Returns { name: value }.
function fields(body) {
  const out = {};
  let key = null;
  for (const line of body.split('\n')) {
    // Names may be several words (`tutor note`); a one-word name matches exactly as before.
    const m = /^-\s+\*\*([a-z]+(?: [a-z]+)*):\*\*\s*(.*)$/.exec(line);
    if (m) {
      key = m[1];
      out[key] = m[2].trim();
    } else if (key && line.trim()) {
      // A LIST ITEM KEEPS ITS OWN LINE (a multi-goal credit is one entry per goal); prose folds.
      out[key] += (line.trim().startsWith('- ') ? '\n' : ' ') + line.trim();
    } else {
      key = null;
    }
  }
  return out;
}

// A question body is Markdown. An mcq's body ends with a numbered list that is its choices.
// Prose is wrapped at the column, and a hard newline inside a sentence would reach a reader that
// shows text as it is, so a wrapped line joins the one before it with a space. Blank lines stay,
// so a two-paragraph question keeps its break.
//
// EVERYTHING ELSE KEEPS ITS LINES, because there the line break is the structure. A fenced block
// is copied verbatim, blank lines and indentation included: it is a log or a file, and joining it
// made one run-on line. A line starting a blockquote, a bullet, a numbered item, a table row or a
// heading starts a line of its own. A wrapped list item still joins onto its own item; a table
// row or a heading never takes a continuation.
const BLOCK_START = /^\s*(?:>|\||#{1,6}\s|[-*+]\s|\d+\.\s)/;
const LIST_ITEM = /^([-*+]|\d+\.)\s/;
const FENCE = /^(`{3,}|~{3,})/;

function unwrap(text) {
  const out = [];
  let fence = null;
  let joinable = false;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (fence) {
      out.push(line.trimEnd());
      if (t.startsWith(fence)) fence = null;
      continue;
    }
    const f = FENCE.exec(t);
    if (f) {
      out.push(t);
      fence = f[1];
      joinable = false;
    } else if (!t) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      joinable = false;
    } else if (BLOCK_START.test(line)) {
      // A list item keeps its indentation, which is what nests it; the rest are trimmed.
      out.push(LIST_ITEM.test(t) ? line.trimEnd() : t);
      joinable = !/^[|#]/.test(t);
    } else if (joinable) {
      out[out.length - 1] += ` ${t}`;
    } else {
      out.push(t);
      joinable = true;
    }
  }
  return out.join('\n').trim();
}

// ONLY AN mcq HAS CHOICES. A free question's numbered list is part of what it asks about (an
// agent's plan, say), and reading it as choices would drop it and everything after it. An mcq's
// choices are its LAST list starting at `1.`, so a numbered plan in its question stays put. A
// choice that wraps joins onto its own line.
function splitChoices(body, type) {
  if (type !== 'mcq') return { prompt: unwrap(body), choices: null };
  const lines = body.split('\n');
  // A numbered line inside a fenced block is part of a log or a file, not a choice.
  let fence = null;
  let first = -1;
  lines.forEach((l, i) => {
    const t = l.trim();
    if (fence) {
      if (t.startsWith(fence)) fence = null;
      return;
    }
    const f = FENCE.exec(t);
    if (f) fence = f[1];
    else if (/^1\.\s+/.test(t)) first = i;
  });
  if (first === -1) return { prompt: unwrap(body), choices: null };
  const choices = [];
  for (const l of lines.slice(first)) {
    const t = l.trim();
    const m = /^\d+\.\s+(.*)$/.exec(t);
    if (m) choices.push(m[1].trim());
    else if (t) choices[choices.length - 1] += ` ${t}`;
  }
  return { prompt: unwrap(lines.slice(0, first).join('\n')), choices };
}

// A COMPOUND'S PARTS ARE `#### <letter>` HEADINGS under its `###`, in the task body and the rubric
// body alike. The heading is exact, so `#### a1` or `#### Notes` stays text in a question, and a
// heading inside a fenced block is part of a log or a file. `head` is everything before the first
// part heading, so a body with none comes back whole as `head`, and a reader of it runs as before.
const PART_HEADING = /^####\s+([a-z])\s*$/;

function splitParts(body) {
  const head = [];
  const parts = [];
  let fence = null;
  for (const line of body.split('\n')) {
    const t = line.trim();
    const m = fence ? null : PART_HEADING.exec(line);
    if (m) {
      parts.push({ label: m[1], lines: [] });
      continue;
    }
    if (fence) {
      if (t.startsWith(fence)) fence = null;
    } else {
      const f = FENCE.exec(t);
      if (f) fence = f[1];
    }
    (parts.length ? parts[parts.length - 1].lines : head).push(line);
  }
  return {
    head: head.join('\n'),
    parts: parts.map((p) => ({ label: p.label, body: p.lines.join('\n').trim() })),
  };
}

// The judge's string for a short answer: the model answer, then the credit line capitalised.
function judgedText(r) {
  const credit = r.credit ? r.credit.charAt(0).toUpperCase() + r.credit.slice(1) : '';
  return credit ? `${r.answer} ${credit}` : r.answer;
}

/** Read a compound's stem and parts from its task body and rubric body, for either layout.
 *  `where` labels the problems; `key` is a folder scenario's key, prepended to a free part's
 *  rubric as it is to a free item's, and '' for a single-file bank. Returns { stem, parts,
 *  problems }, and the caller leaves the question out when there are any problems.
 *
 *  A PART CARRIES NO GOAL. The question names its one goal and its cases, and a part only what
 *  answering it needs, so grading, curation's per-goal checks and study recording all stay on one
 *  goal per question, as they are for every other item. */
function readCompound(taskBody, rubricBody, where, key) {
  const problems = [];
  const task = splitParts(taskBody);
  const rubric = splitParts(rubricBody);
  const r = fields(rubric.head);

  if (r.type !== 'compound') {
    problems.push(`${where} has #### parts but its rubric does not say type: compound`);
  }
  if (!task.parts.length && !rubric.parts.length) {
    problems.push(`${where} is type compound but has no #### parts`);
  }
  const goals = (r.goal ?? '').split(',').map((g) => g.replace(/`/g, '').trim()).filter(Boolean);
  if (goals.length > 1) {
    problems.push(`${where} names goals ${goals.join(', ')}; a compound credits exactly one goal`);
  }

  for (const [side, list] of [['task', task.parts], ['rubric', rubric.parts]]) {
    const letters = list.map((p) => p.label);
    if (letters.some((l, i) => l !== String.fromCharCode(97 + i))) {
      problems.push(`${where} has ${side} parts ${letters.join(', ')}; parts are lettered a, b, c in order`);
    }
  }
  const keyed = new Map(rubric.parts.map((p) => [p.label, p.body]));
  const asked = new Set(task.parts.map((p) => p.label));
  for (const p of task.parts) {
    if (!keyed.has(p.label)) problems.push(`${where} part ${p.label} has no rubric part`);
  }
  for (const p of rubric.parts) {
    if (!asked.has(p.label)) problems.push(`${where} part ${p.label} has a rubric part but no part in the task`);
  }
  if (task.parts.length && task.parts.length < 2) {
    problems.push(`${where} has ${task.parts.length} part; a compound needs at least two`);
  }

  const parts = [];
  for (const p of task.parts) {
    if (!keyed.has(p.label)) continue;
    const at = `${where} part ${p.label}`;
    const pf = fields(keyed.get(p.label));
    const type = pf.type || 'free';
    if (type !== 'mcq' && type !== 'free') {
      problems.push(`${at} has type: ${type}; a part is mcq or free`);
      continue;
    }
    // `in`, not truthiness: an empty `- **goal:**` line is still a goal written on a part.
    if ('goal' in pf || 'cases' in pf) problems.push(`${at} names a goal or cases; those belong to the question`);
    // The images step rewrites only `prompt`, so an image in a part would never be served.
    if (/!\[[^\]]*\]\(/.test(p.body)) problems.push(`${at} has an image; images go in the stem`);
    const { prompt, choices } = splitChoices(p.body, type);
    if (!prompt) {
      problems.push(`${at} has no text`);
      continue;
    }
    const note = pf['tutor note'] ? { tutorNote: pf['tutor note'] } : {};
    if (type === 'mcq') {
      if (!choices) {
        problems.push(`${at} is type mcq but carries no numbered choices`);
        continue;
      }
      const n = Number(pf.answer);
      if (!Number.isInteger(n) || n < 1 || n > choices.length) {
        problems.push(`${at} has answer: ${pf.answer}, which is not one of its ${choices.length} choices`);
        continue;
      }
      parts.push({ label: p.label, type, prompt, choices, answer: n - 1, ...note });
    } else {
      if (!pf.answer) {
        problems.push(`${at} has no answer in its rubric`);
        continue;
      }
      const j = judgedText(pf);
      parts.push({
        label: p.label, type, prompt, rubric: key ? `${key}\n\n${j}` : j,
        expected: pf.answer, credit: pf.credit ?? '', ...note,
      });
    }
  }
  return { stem: unwrap(task.head), parts, problems };
}

// A RUBRIC `cases:` LINE says which of a goal's cases a question exercises, so a pass can be
// recorded against them. Two forms. `x, y` is for a question naming exactly one goal. `c-a: x, y;
// c-b: z` is per goal, for a question naming several. Returns { cases: { [goal]: string[] },
// problems } with `cases` {} when there is no line. It does not know the goal's DEFINED cases,
// which live in goals.md; idProblems checks those. `where` labels the problems.
function parseQuestionCases(value, goals, where) {
  const problems = [];
  const cases = {};
  if (!value) return { cases, problems };
  const ids = (text) => text.split(',').map((c) => c.replace(/`/g, '').trim()).filter(Boolean);
  if (!value.includes(':')) {
    if (goals.length === 1) cases[goals[0]] = ids(value);
    else problems.push(`${where} lists cases without a goal, but names ${goals.length ? `goals ${goals.join(', ')}` : 'no goal'}; write them per goal as \`c-a: x, y; c-b: z\``);
    return { cases, problems };
  }
  for (const part of value.split(';').map((p) => p.trim()).filter(Boolean)) {
    const m = /^`?([^:`]+?)`?\s*:\s*(.*)$/.exec(part);
    if (!m) {
      problems.push(`${where} has a cases entry "${part}" that is not \`<goal>: <case>, <case>\``);
      continue;
    }
    const goal = m[1].trim();
    if (!goals.includes(goal)) problems.push(`${where} lists cases for ${goal}, which the question does not name`);
    else cases[goal] = [...(cases[goal] ?? []), ...ids(m[2])];
  }
  return { cases, problems };
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
        // The fields come from the part before any `####` part, which fields would otherwise fold
        // into the field above it; the raw body is kept for a compound's parts.
        rubrics.set(s.id, { fields: fields(splitParts(s.body).head), body: s.body });
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

      const entry = rubrics.get(s.id);
      if (!entry) {
        problems.push(`${s.id} is in tasks/${name} with no rubric entry, so nothing could grade it`);
        continue;
      }
      const r = entry.fields;

      const type = r.type || 'free';
      const { prompt, choices } = splitChoices(s.body, type);
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
      const qc = parseQuestionCases(r.cases, r.goal ? [r.goal.replace(/`/g, '').trim()] : [], s.id);
      problems.push(...qc.problems);
      recording.cases = qc.cases;

      // `rubric` joins the model answer and the credit line, because that is the single string
      // the grader wants. Feedback wants only the first half: telling a student "Full credit for
      // saying X, do not accept Y" reads as marking instructions rather than as an answer. So the
      // model answer travels separately too, and nothing has to split the joined string back up.
      if (r.answer) recording.expected = r.answer;

      if (type === 'compound' || splitParts(s.body).parts.length || splitParts(entry.body).parts.length) {
        const c = readCompound(s.body, entry.body, s.id, '');
        problems.push(...c.problems);
        if (!c.problems.length) items.push({ bank, ...recording, id: s.id, type: 'compound', prompt: c.stem, parts: c.parts });
        continue;
      }

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
        const rubric = judgedText(r);
        items.push({ bank, ...recording, id: s.id, type, prompt, rubric });
      }
    }
  }

  // A FOLDER QUESTION'S id IS QUALIFIED HERE, ON THE QUIZ PATH, AND NOWHERE ELSE. Its bare id
  // (`q1`) repeats across scenarios and across topics by design, but every map downstream of a
  // draw (the practice form's field names, byId, item_id, the grading queue, the instructor's
  // bake and seed) is keyed on `id`, and two topics in one quiz could otherwise collide. So the
  // id becomes <label>/<activity>/<scenario>/<question>, unique across a workspace, and nothing
  // keyed on it has to change. readFolderBanks keeps the bare id because the study path (the
  // picker, curation) works within one topic and reads `label`, which stays topic-local here
  // too. Single-file items keep their bare ids, which pools and baked quizzes already name.
  const folders = readFolderBanks(dir, label);
  const qualified = folders.items.map((i) => ({ ...i, id: label ? `${label}/${i.label}` : i.label }));
  return { items: [...items, ...qualified], problems: [...problems, ...folders.problems] };
}

/** The label an attempt on this item is recorded under in its topic's log. A FOLDER QUESTION IS
 *  RECORDED BY ITS TOPIC-LOCAL LABEL, not its qualified id: the log already belongs to one topic,
 *  and the study path records the same question under the same label, so a quiz attempt and a
 *  study attempt on one question are one history. A single-file question keeps the label it has
 *  always been recorded under. */
export function recordLabel(item) {
  if (item.label) return item.label;
  return item.move ? `${item.move}: ${item.id}` : item.id;
}

// Everything before the first `###`, minus the file's first `#` line (its title), trimmed.
function topPart(text) {
  const out = [];
  let titled = false;
  for (const line of text.split('\n')) {
    if (/^###\s/.test(line)) break;
    // The title only: a later `# ` line (a shell comment in a fence, say) is part of the text.
    if (!titled && /^#\s/.test(line)) {
      titled = true;
      continue;
    }
    out.push(line);
  }
  return out.join('\n').trim();
}

// THE MARKER IS EXACT, trailing whitespace aside (a CRLF file's `\r` included). Any other `##` line
// in a scenario's top part is a near miss, reported rather than guessed at, because a guess wrong
// either way puts text in front of a learner that was not meant for them.
const FRAMING_MARKER = /^## Framing\s*$/;

// A tasks/ file's top part, split at its `## Framing` line: the scenario above it, which every
// question is shown with, and the framing below it, which introduces the run and is shown in study
// before the first question only. Same title rule as topPart. A second marker stays in the framing
// as text and is counted, so the caller can report it.
function scenarioParts(text) {
  const setup = [];
  const framing = [];
  const nearMisses = [];
  let markers = 0;
  let titled = false;
  for (const line of text.split('\n')) {
    if (/^###\s/.test(line)) break;
    if (!titled && /^#\s/.test(line)) {
      titled = true;
      continue;
    }
    if (FRAMING_MARKER.test(line)) {
      markers++;
      if (markers === 1) continue;
    } else if (/^##(?!#)/.test(line)) {
      nearMisses.push(line.trimEnd());
    }
    (markers ? framing : setup).push(line);
  }
  return { setup: setup.join('\n').trim(), framing: framing.join('\n').trim(), markers, nearMisses };
}

// WHAT THE FRAMING RULE CATCHES BY WORDING. A run phrase speaks of the questions as a set, so it
// belongs in the framing and is a fault only in the scenario part, which every draw shows. How to
// answer belongs in each question, so it is a fault in the scenario part and in the framing alike.
// These are the phrase-level cases; bank-check judges the rest. Every framing problem ends in
// FRAMING_RULE, so a reader can tell the new rule's findings from older ones.
export const FRAMING_RULE = ' (framing rule)';
const RUN_PHRASES = [/\beach question\b/i, /\bquestions below\b/i, /\bthe questions follow\b/i, /\banswer each\b/i, /\bwhere a question asks\b/i];
const ANSWERING = [/\banswer in\b/i, /\bin (a|one|two|three|four|five)\b[^.?!\n]*\bsentences?\b/i];

function firstMatch(text, patterns) {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

// "Some show an exchange ... Others show a message" introduces a mix of question kinds. Two words
// that common are a run phrase only together, in one paragraph.
function runPhrase(text) {
  const found = firstMatch(text, RUN_PHRASES);
  if (found) return found;
  return text.split(/\n\s*\n/).some((p) => /\bsome\b/i.test(p) && /\bothers\b/i.test(p)) ? 'some ... others' : null;
}

/** The framing rule's findings for one scenario's top parts. `scn` is <activity>/<scenario>. */
function framingProblems(scn, scenario, parts, rubricText, rubricWhere) {
  const out = [];
  const run = runPhrase(parts.setup);
  if (run) out.push(`${scn}: the scenario part says "${run}", which speaks of a run of questions; move it under ## Framing`);
  const inSetup = firstMatch(parts.setup, ANSWERING);
  if (inSetup) out.push(`${scn}: the scenario part says "${inSetup}", which says how to answer; put it in each question`);
  const inFraming = firstMatch(parts.framing, ANSWERING);
  if (inFraming) out.push(`${scn}: the framing says "${inFraming}", which says how to answer; put it in each question`);
  if (parts.markers && !parts.framing) out.push(`${scn}: ## Framing has nothing under it`);
  if (parts.markers > 1) out.push(`${scn}: ## Framing appears ${parts.markers} times; only the first is the marker`);
  for (const line of parts.nearMisses) out.push(`${scn}: "${line}" is not the marker; write it exactly as ## Framing`);
  if (scenario === 'main-bank' && parts.markers) out.push(`${scn}: main-bank has no framing`);
  if (rubricText.split('\n').some((l) => FRAMING_MARKER.test(l))) {
    out.push(`${scn}: ${rubricWhere} has a ## Framing line; a key has no framing`);
  }
  return out.map((p) => p + FRAMING_RULE);
}

/** The framing rule's findings for one question body. */
function questionFramingProblems(label, body) {
  const out = [];
  if (body.split('\n').some((l) => FRAMING_MARKER.test(l))) {
    out.push(`${label}: ## Framing in a question is not a marker; it belongs in the top part`);
  }
  if (/\banswer only\b/i.test(body)) {
    out.push(`${label}: says "answer only", which overrides how to answer; say it in this question alone`);
  }
  return out.map((p) => p + FRAMING_RULE);
}

/** Read every folder bank in one source: tasks/<activity>/<scenario>.md against
 *  rubrics/<activity>/<scenario>.md. Returns { items, problems } like readBank, and readBank
 *  calls it, so every caller sees both kinds. Problems are collected, never thrown. */
export function readFolderBanks(dir, label = '') {
  const items = [];
  const problems = [];
  const tasksDir = join(dir, 'tasks');
  const rubricsDir = join(dir, 'rubrics');
  if (!existsSync(tasksDir)) return { items, problems };

  const activities = readdirSync(tasksDir)
    .filter((n) => statSync(join(tasksDir, n)).isDirectory())
    .sort();
  for (const activity of activities) {
    // A LEGACY STUDY FOLDER, not a bank: see the header.
    if (!existsSync(join(rubricsDir, activity))) continue;
    const bank = label ? `${label}/${activity}` : activity;
    const scenarios = readdirSync(join(tasksDir, activity)).filter((n) => n.endsWith('.md')).sort();
    for (const file of scenarios) {
      const scenario = file.replace(/\.md$/, '');
      const where = `tasks/${activity}/${file}`;
      const rubricPath = join(rubricsDir, activity, file);
      if (!existsSync(rubricPath)) {
        problems.push(`${where} has no rubric file at rubrics/${activity}/${file}, so nothing in it could grade`);
        continue;
      }

      const rubricText = readFileSync(rubricPath, 'utf8');
      const key = topPart(rubricText);
      const rubrics = new Map();
      for (const s of sections(rubricText)) {
        if (rubrics.has(s.id)) problems.push(`${activity}/${scenario}/${s.id} has two rubric entries`);
        else rubrics.set(s.id, { fields: fields(splitParts(s.body).head), body: s.body });
      }

      const taskText = readFileSync(join(tasksDir, activity, file), 'utf8');
      const parts = scenarioParts(taskText);
      const { setup, framing } = parts;
      problems.push(...framingProblems(`${activity}/${scenario}`, scenario, parts, rubricText, `rubrics/${activity}/${file}`));
      const seen = new Set();
      for (const s of sections(taskText)) {
        const label3 = `${activity}/${scenario}/${s.id}`;
        if (seen.has(s.id)) {
          problems.push(`${label3} appears twice in ${where}; question ids must be unique within a scenario`);
          continue;
        }
        seen.add(s.id);
        problems.push(...questionFramingProblems(label3, s.body));

        const entry = rubrics.get(s.id);
        if (!entry) {
          problems.push(`${label3} is in ${where} with no rubric entry, so nothing could grade it`);
          continue;
        }
        const r = entry.fields;

        const type = r.type || 'free';
        const { prompt: body, choices } = splitChoices(s.body, type);
        const prompt = setup ? `${setup}\n\n${body}` : body;
        const goals = (r.goal ?? '').split(',').map((g) => g.replace(/`/g, '').trim()).filter(Boolean);
        const qc = parseQuestionCases(r.cases, goals, label3);
        problems.push(...qc.problems);
        const common = {
          bank, activity, scenario, id: s.id, label: label3, goals, cases: qc.cases,
          ...(goals.length === 1 ? { goal: goals[0] } : {}),
          ...(r.move ? { move: r.move } : {}),
          tags: tagsForMove(r.move),
          type, prompt, setup, framing, key,
          ...(r.answer ? { expected: r.answer } : {}),
          ...(r['tutor note'] ? { tutorNote: r['tutor note'] } : {}),
        };

        // A compound's prompt is the setup and its stem; an empty stem adds no trailing break.
        if (type === 'compound' || splitParts(s.body).parts.length || splitParts(entry.body).parts.length) {
          const c = readCompound(s.body, entry.body, label3, key);
          problems.push(...c.problems);
          if (!c.problems.length) {
            const stemmed = [setup, c.stem].filter(Boolean).join('\n\n');
            items.push({ ...common, type: 'compound', prompt: stemmed, credit: '', parts: c.parts });
          }
          continue;
        }

        if (type === 'mcq') {
          if (!choices) {
            problems.push(`${label3} is type mcq but its question carries no numbered choices`);
            continue;
          }
          const n = Number(r.answer);
          if (!Number.isInteger(n) || n < 1 || n > choices.length) {
            problems.push(`${label3} has answer: ${r.answer}, which is not one of its ${choices.length} choices`);
            continue;
          }
          items.push({ ...common, choices, answer: n - 1 });
        } else {
          if (!r.answer) {
            problems.push(`${label3} has no answer in its rubric`);
            continue;
          }
          // A multi-goal credit written as an indented list keeps one line per goal (see fields).
          const judged = judgedText(r);
          // `credit` is the raw credit text alone, for checks that must not be satisfied by the
          // key or the answer happening to mention a goal (idProblems' per-goal statement check).
          items.push({ ...common, rubric: key ? `${key}\n\n${judged}` : judged, credit: r.credit ?? '' });
        }
      }
      for (const id of rubrics.keys()) {
        if (!seen.has(id)) problems.push(`${activity}/${scenario}/${id} has a rubric entry but no question in ${where}`);
      }
    }
  }
  return { items, problems };
}

/** Read every source a pool draws from, merged into one bank.
 *
 *  THE SOURCES ARE DERIVED FROM THE DRAW KEYS rather than listed separately, so the two can
 *  never disagree. A key's source is the LONGEST PREFIX of its `/`-separated segments that names
 *  a folder holding tasks/, and the rest of the key says what to draw from it: nothing (the
 *  whole source, spread across its banks), `<name>` (a single-file bank or a folder activity),
 *  or `<activity>/<scenario>`. So `learning-topics/react-apps-2026-09/words` reads
 *  `<root>/learning-topics/react-apps-2026-09` and takes its `words` bank, exactly as when the
 *  source was simply everything before the last slash, and `learning-topics/t1/a-x/s1` finds
 *  the same source two segments sooner. Looking for tasks/ rather than counting segments is
 *  what lets one key shape mean three levels without a pool having to say which. A key with no
 *  such prefix falls back to the old reading, everything before the last slash, so a missing
 *  source reports exactly what it always did.
 *
 *  The sources read are returned as `sources`, beside items and problems, so applyPool can
 *  split each key the same way without touching the disk again.
 *
 *  A JOINED KEY, `<key> | <key>`, is one stratum drawn from the union of its parts (see
 *  applyPool), so each part's source is read as if it were a key of its own.
 *
 *  A POOL CARRYING `topic` IS THE SINGLE-SOURCE FORM and predates this. Its draw keys are bare
 *  file names under one topic, and it is read exactly as before, so a session baked before this
 *  change re-bakes unchanged. That is the only reason the old shape survives.
 *
 *  A MISSING SOURCE IS A PROBLEM, NOT A THROW. A pool that has drifted from the repositories is
 *  how a quiz silently comes up short, and the caller decides whether to proceed. */
export function readPoolSources(pool, root) {
  // The topic form's one source is unlabelled, so its keys split against the empty prefix.
  if (pool.topic) return { ...readBank(join(root, 'learning-topics', pool.topic)), sources: [''] };

  const items = [];
  const problems = [];
  const read = [];
  const sourceOf = (key) => {
    const parts = key.split('/');
    for (let n = parts.length; n > 0; n--) {
      const p = parts.slice(0, n).join('/');
      if (existsSync(join(root, p, 'tasks')) && statSync(join(root, p, 'tasks')).isDirectory()) return p;
    }
    return parts.slice(0, -1).join('/');
  };
  const sources = new Set(Object.keys(pool.draw ?? {}).flatMap(keyParts).map(sourceOf));

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
    read.push(source);
  }

  return { items, problems, sources: read };
}

/** The keys a draw key joins with ` | `; a plain key is its own one part. */
export const keyParts = (key) => key.split(" | ").map((k) => k.trim());

/** Split a draw key into the source it falls under and the rest: the longest of `sources` that
 *  is the key or a prefix of it at a `/`. The empty source (the topic form) prefixes every key.
 *  Null when none does, which applyPool reports as it always has. */
function splitKey(key, sources) {
  let best = null;
  for (const s of sources) {
    const rest = s === '' ? key : key === s ? '' : key.startsWith(`${s}/`) ? key.slice(s.length + 1) : null;
    if (rest !== null && (best === null || s.length > best.source.length)) best = { source: s, rest };
  }
  return best;
}

/** Spread `take` across banks in name order: each gets floor(take/k), and the first take % k one
 *  more. A BANK TOO SMALL FOR ITS SHARE PASSES THE SHORTFALL TO THE NEXT, wrapping round to any
 *  bank with room left, so a topic that holds enough questions always supplies the count. It is
 *  deterministic on purpose: the shape of the quiz is the pool's statement, and only which
 *  questions fill it is random. Returns { parts, short }: parts are the banks given back with
 *  their `take`, zero takes dropped, and short is the count nobody could supply. */
function spread(take, banks) {
  const k = banks.length;
  let owed = 0;
  const out = banks.map((b, i) => {
    const want = Math.floor(take / k) + (i < take % k ? 1 : 0) + owed;
    const got = Math.min(want, b.items.length);
    owed = want - got;
    return { ...b, take: got };
  });
  for (const b of out) {
    const more = Math.min(owed, b.items.length - b.take);
    b.take += more;
    owed -= more;
  }
  return { parts: out.filter((b) => b.take > 0), short: k ? owed : take };
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
    // THREE LEVELS, ONE KEY SHAPE (see readPoolSources). A key that is a bank is drawn as it
    // always was, which is every key a pool written before folder banks carries. Otherwise the
    // key splits against the sources read: nothing left is the whole source, spread across its
    // banks; <activity>/<scenario> is one scenario of a folder activity. A topic-level key comes
    // back as one stratum per bank it spread across, each named by the key and carrying `bank`,
    // so a caller drawing per stratum honours the spread without knowing about it.
    //
    // A JOINED KEY, `<key> | <key>`, is ONE stratum whose questions are the union of its parts,
    // so the banks share the count: a draw of 1 from two banks gives each student one question
    // from either, each question as likely as any other, as a single bank already shares its
    // count among the goals it holds. It carries no `bank`, since it has several. A part that
    // does not resolve is reported as a plain key would be, and the rest still supply it.
    const sources = bank.sources ?? (pool.topic ? [''] : []);
    const avail = (b) => (byBank.get(b) ?? []).filter((i) => !excluded.has(i.id));

    // What one plain key names: { whole: [{ bank, items }] } for a whole source, { owner, items }
    // for a bank or one scenario of it, or { problem } when it names nothing.
    const resolveKey = (name) => {
      const at = byBank.has(name) ? null : splitKey(name, sources);
      if (at && at.rest === '') {
        const prefix = at.source ? `${at.source}/` : '';
        const whole = [...byBank.keys()]
          .filter((b) => b.startsWith(prefix) && !b.slice(prefix.length).includes('/'))
          .sort()
          .map((b) => ({ bank: b, items: avail(b) }));
        return { whole };
      }
      // `owner` is the bank the stratum comes out of: the key itself, or a scenario key's activity.
      let owner = name;
      let scenario = null;
      if (at && at.rest.split('/').length === 2) {
        const [activity, s] = at.rest.split('/');
        owner = at.source ? `${at.source}/${activity}` : activity;
        scenario = s;
      }
      if (!byBank.has(owner)) return { problem: `pool draws from ${name}, which is not a file in the topic's tasks/` };
      let available = avail(owner);
      if (scenario !== null) {
        if (!byBank.get(owner).some((i) => 'scenario' in i)) {
          return { problem: `pool draws from ${name}, but ${owner} is a single-file bank, which has no scenarios` };
        }
        if (!byBank.get(owner).some((i) => i.scenario === scenario)) {
          return { problem: `pool draws from ${name}, but ${owner} has no scenario ${scenario}` };
        }
        available = available.filter((i) => i.scenario === scenario);
      }
      return { owner, items: available };
    };

    const strata = [];
    for (const [name, take] of Object.entries(pool.draw)) {
      const parts = keyParts(name);
      if (parts.length > 1) {
        const items = [];
        for (const part of parts) {
          const got = resolveKey(part);
          if (got.problem) problems.push(got.problem);
          else items.push(...(got.whole ? got.whole.flatMap((b) => b.items) : got.items));
        }
        if (items.length < take) problems.push(`pool draws ${take} from ${name}, which has only ${items.length} available`);
        strata.push({ name, take, items });
        continue;
      }
      const got = resolveKey(name);
      if (got.problem) {
        problems.push(got.problem);
        continue;
      }
      if (got.whole) {
        const { parts: spreadParts, short } = spread(take, got.whole);
        if (short) problems.push(`pool draws ${take} from ${name}, which has only ${take - short} available`);
        strata.push(...spreadParts.map((p) => ({ name, take: p.take, items: p.items, bank: p.bank })));
        continue;
      }
      if (got.items.length < take) {
        problems.push(`pool draws ${take} from ${name}, which has only ${got.items.length} available`);
      }
      strata.push({ name, take, items: got.items, bank: got.owner });
    }
    // EXHAUSTIVE ONLY IN THE SINGLE-SOURCE FORM. With one topic, a bank file the pool never
    // mentions is drift: the pool was written against a topic that has since grown a file. With
    // several sources, a source is read because the pool named it, and having banks it does not
    // draw from this week is the ordinary case, and a topic examined twice in a term is not a
    // defect the first time. The half that matters is still caught below, where a draw naming a
    // bank that does not exist is a problem either way.
    //
    // AND ONLY AGAINST SINGLE-FILE BANKS. The topic form predates folder banks, so a folder
    // activity it does not mention is not drift from what the pool was written against; it is
    // something the pool was never asked to know about.
    if (pool.topic) {
      for (const name of byBank.keys()) {
        if (byBank.get(name).some((i) => 'scenario' in i)) continue;
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
