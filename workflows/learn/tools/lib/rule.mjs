// Rule one bank question from what the learner chose and what the tutor judged: the program rules
// every multiple choice part, and the tutor's criterion stands for every open one. Used by
// answer.mjs, which records the result and writes the learner's feedback.

import { hasOpenPart } from './item.mjs';

// A REFUSAL. The message is what the caller should print.
export class RuleError extends Error {}

const die = (msg) => {
  throw new RuleError(msg);
};

const CRITERIA = ['met', 'not met', 'unclear'];

// `3` is one choice for a plain multiple choice question; `a=2,c=1` is a choice per lettered part
// of a compound. Numbers are 1-based, as the learner saw them.
export function parseChoice(value) {
  const number = (s) => {
    if (!/^\d+$/.test(s.trim())) die(`"${s}" is not a choice number; a choice is a whole number such as 3.`);
    return Number(s.trim());
  };
  if (!value.includes('=')) return { whole: number(value) };
  const parts = new Map();
  for (const piece of value.split(',')) {
    const [letter, n, ...rest] = piece.split('=');
    if (n === undefined || rest.length || !/^[a-z]$/.test(letter.trim())) {
      die(`"${piece}" is not <letter>=<number>; give a compound's choices as a=2,c=1.`);
    }
    if (parts.has(letter.trim())) die(`part (${letter.trim()}) is given twice in --choice.`);
    parts.set(letter.trim(), number(n));
  }
  return { parts };
}

// The learner's line for one multiple choice answer, `n` and `answer` 1-based and 0-based as the
// bank holds them. The scenario key is never printed here: it is grading text.
function verdictLine(prefix, choices, chose, answer) {
  // A full stop after the closing quote, unless the choice text already ends a sentence.
  const text = (i) => `**${i + 1}**, "${choices[i]}"${/[.?!]$/.test(choices[i]) ? '' : '.'}`;
  return chose === answer
    ? `${prefix}Correct: ${text(answer)}`
    : `${prefix}Not this time. You chose ${text(chose)} The answer is ${text(answer)}`;
}

function inRange(n, choices, where) {
  if (n < 1 || n > choices.length) die(`${where}choice ${n} is not one of the ${choices.length} choices.`);
  return n - 1;
}

// Returns { criterion, partLines, verdict }: the ruling, the tutor's one line per multiple choice
// part of a compound, and the learner's lines. `choice` is the raw --choice text, `criterion` the
// tutor's --criterion for an open item or part.
export function ruleItem(item, { choice, criterion }) {
  if (criterion !== undefined && !CRITERIA.includes(criterion)) {
    die(`--criterion must be one of: ${CRITERIA.join(', ')}`);
  }

  if (item.type === 'compound') {
    const open = hasOpenPart(item);
    if (open && criterion === undefined) {
      die(`${item.label} has an open part, so --criterion is required: rule it against the criterion.`);
    }
    if (!open && criterion !== undefined) die(`${item.label} has only multiple choice parts, so --criterion does not apply.`);
    if (choice === undefined) die(`${item.label} is a compound; give --choice as <letter>=<number>, such as a=2,c=1.`);
    const parsed = parseChoice(choice);
    if (!parsed.parts) die(`${item.label} is a compound; give --choice as <letter>=<number>, such as a=2,c=1.`);
    for (const letter of parsed.parts.keys()) {
      const part = item.parts.find((p) => p.label === letter);
      if (!part) die(`${item.label} has no part (${letter}).`);
      if (part.type !== 'mcq') die(`part (${letter}) is not multiple choice, so it takes no --choice.`);
    }
    const partLines = [];
    const verdict = [];
    let wrong = false;
    for (const part of item.parts.filter((p) => p.type === 'mcq')) {
      const n = parsed.parts.get(part.label);
      if (n === undefined) die(`part (${part.label}) is multiple choice; --choice needs ${part.label}=<number>.`);
      const chose = inRange(n, part.choices, `part (${part.label}) `);
      const right = chose === part.answer;
      if (!right) wrong = true;
      partLines.push(`(${part.label}) answered ${chose + 1}, key ${part.answer + 1}, ${right ? 'right' : 'wrong'}`);
      verdict.push(verdictLine(`(${part.label}) `, part.choices, chose, part.answer));
    }
    return { criterion: wrong ? 'not met' : open ? criterion : 'met', partLines, verdict };
  }

  if (item.type === 'mcq') {
    if (criterion !== undefined) die(`${item.label} is multiple choice, so the program rules it and --criterion does not apply.`);
    if (choice === undefined) die(`${item.label} is multiple choice; --choice <number> is required.`);
    const parsed = parseChoice(choice);
    if (parsed.parts) die(`${item.label} is not a compound, so give --choice as one number, such as 3.`);
    const chose = inRange(parsed.whole, item.choices, '');
    return {
      criterion: chose === item.answer ? 'met' : 'not met',
      partLines: [],
      verdict: [verdictLine('', item.choices, chose, item.answer)],
    };
  }

  if (choice !== undefined) die(`${item.label} is an open question, so --choice does not apply; rule it with --criterion.`);
  if (criterion === undefined) die(`${item.label} is an open question; --criterion is required.`);
  return { criterion, partLines: [], verdict: [] };
}
