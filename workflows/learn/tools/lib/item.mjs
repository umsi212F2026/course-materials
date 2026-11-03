// The text of one bank question, in the two parts next-item.mjs prints: what the learner sees, and
// the key, which is grading text for the tutor and never for the learner.

import { readIds } from './topic.mjs';

// The prompt, and an mcq's choices numbered as the learner saw them.
export function learnerText(item) {
  if (item.type === 'compound') return compoundLearnerText(item);
  const lines = [item.prompt];
  if (item.type === 'mcq') item.choices.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
  return lines.join('\n');
}

// A COMPOUND IS SHOWN WHOLE, the stem and then every part lettered as the learner answers it, so
// one message carries the question and one reply can answer every part. Each part is laid out as
// a question of its type is, and parts are kept apart by a blank line. An empty stem (no setup
// and no text above the first part) adds nothing, so the text never opens on a blank line.
function compoundLearnerText(item) {
  const parts = item.parts.map((p) => {
    const lines = [`(${p.label}) ${p.prompt}`];
    if (p.type === 'mcq') p.choices.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
    return lines.join('\n');
  });
  return [item.prompt, ...parts].filter(Boolean).join('\n\n');
}

// A question the tutor must rule on: any non-mcq item, or a compound with a non-mcq part.
export function hasOpenPart(item) {
  if (item.type === 'compound') return item.parts.some((p) => p.type !== 'mcq');
  return item.type !== 'mcq';
}

// THE RULES THE TUTOR RULES BY, printed after the criterion on --key.
export const RULING = [
  '--- ruling ---',
  'Rule against the criterion as written, not a better one you can see.',
  'Half credit is not met.',
  'unclear is for a genuine tie, in either direction.',
  'Anything that changed what they did is help. Clarifying which question was meant, or repeating it, is not.',
  'Rule on what they wrote, not on how the session went.',
].join('\n');

// The criterion section of an open question's key: each goal it credits with its criterion
// resolved, and under it the cases the question exercises with their texts. A goal whose entry has
// a problem has no usable criterion, and says so rather than guessing one.
export function criterionText(dir, item) {
  const ids = readIds(dir);
  const lines = ['--- criterion ---'];
  for (const id of item.goals) {
    const goal = ids.get(id);
    if (!goal || goal.problems.length) {
      lines.push(`${id}: can't be ruled until its goals.md entry is fixed`);
      continue;
    }
    lines.push(`${id}: ${goal.criterionText}`);
    for (const c of item.cases?.[id] ?? []) {
      const found = goal.cases.find((x) => x.id === c);
      lines.push(`  case ${c}: ${found ? found.text : '(not a case of this goal)'}`);
    }
  }
  return lines.join('\n');
}

// An mcq's key is the scenario's key (when it has one) and then the correct choice, numbered as
// the learner saw it. Any tutor note follows under its own heading.
export function keyText(item) {
  if (item.type === 'compound') return compoundKeyText(item);
  const lines = [];
  if (item.type === 'mcq') {
    if (item.key) lines.push(item.key);
    lines.push(`${item.answer + 1}. ${item.choices[item.answer]}`);
  } else {
    lines.push(item.rubric);
  }
  if (item.tutorNote) lines.push('--- tutor note ---', item.tutorNote);
  return lines.join('\n');
}

// A compound's key is the scenario's key once, then each part's key under its letter, then the
// parts' tutor notes, lettered, under one heading. The bank prepends the scenario key to a short
// answer part's rubric, because the grader judges a part on its own; here the key already heads
// the text, so it is taken off again rather than printed once per part. A tutor note on the
// question itself comes first under the heading, unlettered, since it is about no one part.
function compoundKeyText(item) {
  const lines = [];
  if (item.key) lines.push(item.key);
  const shared = item.key ? `${item.key}\n\n` : '';
  for (const p of item.parts) {
    if (p.type === 'mcq') lines.push(`(${p.label}) ${p.answer + 1}. ${p.choices[p.answer]}`);
    else lines.push(`(${p.label}) ${shared && p.rubric.startsWith(shared) ? p.rubric.slice(shared.length) : p.rubric}`);
  }
  const notes = [
    ...(item.tutorNote ? [item.tutorNote] : []),
    ...item.parts.filter((p) => p.tutorNote).map((p) => `(${p.label}) ${p.tutorNote}`),
  ];
  if (notes.length) lines.push('--- tutor note ---', ...notes);
  return lines.join('\n');
}
