// The text of one bank question, in the two parts next-item.mjs prints: what the learner sees, and
// the key, which is grading text for the judge and never for the learner. judge-input.mjs prints
// the same two, so the question and rubric the judge reads are exactly the ones the tutor served.

// The prompt, and an mcq's choices numbered as the learner saw them.
export function learnerText(item) {
  const lines = [item.prompt];
  if (item.type === 'mcq') item.choices.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
  return lines.join('\n');
}

// An mcq's key is the scenario's key (when it has one) and then the correct choice, numbered as
// the learner saw it. Any tutor note follows under its own heading.
export function keyText(item) {
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
