// What one attempt established, and what an accumulation of attempts makes true.
//
// A BAR IS ALWAYS A PROGRAM, NEVER A SKILL. It cannot need judgement, because judgement already
// happened upstream — in the adjudicator, which ruled, or in the supply, which tagged. So it
// reads only structured fields: the two axes, `tags`, `outcome`, `source`, `at`. Never the
// criterion text, never the instruction, never the opaque label.
//
// That is where the program/skill seam falls: everything upstream of here may require
// judgement, and the bar and everything after it is arithmetic.
//
// The contract, from workflows/learn/skills/goal-setting/references/slots.md:
//
//   given the goal's whole attempt history, return a boolean.
//
// A BOOLEAN, not a rung. Five things consume "has this been met" and every one of them uses it
// as a binary. Nothing declares a scale, so nothing compares across scales.

import { BARS as BAR_NAMES } from './slots.mjs';

// --- what one attempt was ----------------------------------------------------
// The two axes are stored raw and never collapsed on the way in. Everything that reads a
// verdict reads them from here.
//
//   unaided     yes | no | unclear
//   criterion   met | not met | unclear | unchecked
//
// `unchecked` means NOBODY RULED — the adjudicator was not invoked. Distinct from `unclear`,
// which means an adjudicator looked and could not tell. A tutor who knows it gave aid records
// `unaided: no, criterion: unchecked` and calls nobody; an attempt at an activity that could
// not have settled anything is `unaided: yes, criterion: unchecked`, which moves no date and
// establishes nothing.

export const isPass = (r) => r.unaided === 'yes' && r.criterion === 'met';

// A learner saying they've got it. Counts, and is recorded as their word rather than as a
// judged pass — visibly weaker, which is the requirement. It is the escape for a goal that
// won't land.
export const isDeclared = (r) => r.outcome === 'declared';

export const isDefiniteNegative = (r) => r.unaided === 'no' || r.criterion === 'not met';

// Which way this attempt moves the next review date.
//
// UNCHANGED BY `unchecked`. The rule is *shorter iff `unaided === "no" || criterion === "not
// met"`*, and a tutor recording aid given fires the first disjunct exactly as `--outcome aided`
// used to, while saying more about what happened.
export function intervalDirection(r) {
  if (isPass(r)) return 'longer';
  if (isDefiniteNegative(r)) return 'shorter';
  return 'same';
}

const hasTag = (r, tag) => Array.isArray(r.tags) && r.tags.includes(tag);

// --- the three bars ----------------------------------------------------------
// EVERY ONE IS AN EXISTENCE TEST over the history, which is what makes the invariant checkable:
// a bar, once true, stays true. That replaced "the level only ever rises" — a property of a
// predicate rather than a convention about a four-valued field.

export const BARS = {
  // The judge has already ruled it against a criterion someone wrote, and a second pass is what
  // review is for — this goal starts coming back in three days.
  'one unaided pass': (attempts) => attempts.some(isPass),

  // Production is the whole bar. A reception move can be passed from having just been told the
  // thing, so a goal met only by those has been recited. What makes a move a production one is
  // the supply's business; all this reads is the tag it returned.
  'one production pass': (attempts) => attempts.some((r) => isPass(r) && hasTag(r, 'production')),

  // Weak evidence, deliberately, and adjudicated rather than assumed. Orientation's question is
  // narrow enough that the tutor can answer it: did they indicate they could now attempt the
  // real thing with the artifact still beside them.
  'did it once': (attempts) => attempts.some((r) => r.criterion === 'met'),
};

// Every bar named in slots.mjs has an implementation here, and nothing here is unnamed there.
// The two lists drifting apart is the failure this whole design is built to stop, so it is
// checked rather than trusted.
for (const name of Object.keys(BAR_NAMES)) {
  if (!BARS[name]) throw new Error(`slots.mjs names a bar "${name}" that bars.mjs doesn't implement.`);
}
for (const name of Object.keys(BARS)) {
  if (!BAR_NAMES[name]) throw new Error(`bars.mjs implements a bar "${name}" that slots.mjs doesn't name.`);
}

// --- the predicate everything asks -------------------------------------------
// Replaces the old four-rung level rule. One goal, its attempts, a boolean — and NO BRANCH ON
// WHAT KIND OF GOAL IT IS. The dispatch is on the goal's own `bar` slot, which is the ordinary
// mechanism rather than a special case in the shape of one.

export function met(goal, attempts) {
  // A declaration satisfies any bar, and it is applied here rather than inside each of them:
  // it is a fact about the learner's own assertion, not about the accumulation of rulings that
  // a bar is asking after.
  if (attempts.some(isDeclared)) return true;

  const bar = BARS[goal.bar];
  if (!bar) throw new Error(`${goal.id} has bar: ${goal.bar}, which nothing implements.`);
  return bar(attempts);
}

// --- what to print about one goal --------------------------------------------
// NOTHING BRANCHES ON THIS. The four rungs are gone; what survives is a display, and a display
// has to be generic across any bar because the rungs weren't — a word passed unaided at DEFINE
// used to report *met with help*, a label asserting help nobody gave.
//
// So: how many attempts, and the most recent ruling. Not the best ruling — "best" needs an
// ordering over rulings, which is the ladder again in hiding.

export function describeAttempts(attempts) {
  if (!attempts.length) return 'not started';
  const last = attempts[attempts.length - 1];
  const n = attempts.length === 1 ? '1 attempt' : `${attempts.length} attempts`;
  return `${n}, last: ${describeRuling(last)}`;
}

export function describeRuling(r) {
  const tags = Array.isArray(r.tags) && r.tags.length ? ` (${r.tags.join(', ')})` : '';

  // An outcome is exclusive with the axes: there was no attempt to rule on, or the learner
  // asserted it themselves.
  if (r.outcome) return `${r.outcome}${tags}`;

  const help =
    r.unaided === 'yes' ? '' : r.unaided === 'no' ? ', with help' : ', help unclear';

  if (r.criterion === 'met') return (r.unaided === 'yes' ? 'passed' : `met${help}`) + tags;
  if (r.criterion === 'not met') return `not met${help}${tags}`;
  if (r.criterion === 'unclear') return `unclear${help}${tags}`;
  // `unchecked` — nobody ruled. Rendering the help axis is the whole of what is known.
  return `attempted, not checked${help}${tags}`;
}
