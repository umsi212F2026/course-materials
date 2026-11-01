// The text of one bank question, in the two parts next-item.mjs prints: what the learner sees, and
// the key, which is grading text for the judge and never for the learner. judge-input.mjs prints
// the same two, so the question and rubric the judge reads are exactly the ones the tutor served.

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
