// The writing path of record-attempt: validate an attempt, append it, say what happened. Split
// out of record-attempt.mjs so a caller recording several goals in one call can share it.
// record-attempt.mjs keeps the argument parsing and the usage text.

import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readIds, attemptsFor, isGoalRetired, surveyTopic } from './topic.mjs';
import { buildProgress, renderAfter } from './progress.mjs';
import { met, describeRuling } from './bars.mjs';
import { TAGS, checkTags } from './slots.mjs';
import { reviewSchedule } from './schedule.mjs';

// A REFUSAL. The message is what the caller should print.
export class RecordError extends Error {}

const die = (msg) => {
  throw new RecordError(msg);
};

// Validate one attempt and return the record, writing nothing. `axes` is the adjudicator's
// object, already parsed.
export function checkAttempt(
  dir,
  goalId,
  { axes, outcome, tags = [], cases = [], source = 'study', note, label }
) {
  // --- validate the goal -------------------------------------------------------
  // A typo would otherwise write a log line for a goal that doesn't exist, and nothing would
  // complain until someone noticed the report was wrong.
  const ids = readIds(dir);
  const goal = ids.get(goalId);
  if (!goal) {
    const near = [...ids.keys()].filter((k) => k.startsWith(goalId.slice(0, 4)));
    die(
      `${goalId} is not in ${join(dir, 'goals.md')}.` +
        (near.length ? `\nDid you mean: ${near.join(', ')}` : '')
    );
  }

  // A goal carrying a slot value nothing implements can't be derived from, so an attempt recorded
  // against it would be evidence for a claim nobody can evaluate. Refuse here rather than write
  // a line survey will have to explain away.
  if (goal.problems.length) {
    die(`${goalId} can't be recorded against until its goals.md entry is fixed:\n  ` +
      goal.problems.join('\n  '));
  }

  // --- the tags ----------------------------------------------------------------
  // The one structured thing an activity returns, and the only part of what was served that a bar
  // may read. Closed and system-wide, so a bar can be written against them.
  const unknownTags = checkTags(tags);
  if (unknownTags.length) {
    die(
      `unknown tag${unknownTags.length > 1 ? 's' : ''}: ${unknownTags.join(', ')}\n` +
        `tags are one or more of: ${Object.keys(TAGS).join(', ')}`
    );
  }

  // --- the cases ---------------------------------------------------------------
  // A GOAL WITH CASES NEEDS EACH DEMONSTRATED, and bars.mjs counts an attempt with no `cases` field
  // toward every case (so older passes still count). Left unchecked here, a ruled attempt that
  // forgot --cases would quietly meet them all, so a ruling on such a goal must say which. An
  // --outcome (declared, elsewhere, abandoned) is the learner's word or a non-attempt and needs none.
  // A `declared` that names cases is their word on those cases alone, not on the goal: the choice
  // study offers on a goal with cases after a not-met ruling the learner thinks was wrong.
  const defined = (goal.cases ?? []).map((c) => c.id);
  if (cases.length && !defined.length) die(`${goalId} has no cases, so --cases does not apply.`);
  const unknownCases = cases.filter((c) => !defined.includes(c));
  if (unknownCases.length) {
    die(`unknown case${unknownCases.length > 1 ? 's' : ''} for ${goalId}: ${unknownCases.join(', ')}\ncases are: ${defined.join(', ')}`);
  }
  // AN UNCHECKED ATTEMPT IS THE EXCEPTION: nobody ruled, so it counts toward nothing, and a question
  // exercising none of the goal's cases (a bank written before them) is recorded so with no --cases.
  // It is stored with `cases: []` rather than none, so bars.mjs cannot take it for a grandfathered
  // attempt counting toward every case.
  const unchecked = !!axes && axes.criterion === 'unchecked';
  if (axes && defined.length && !cases.length && !unchecked) {
    die(`${goalId} has cases, so a ruled attempt needs --cases naming those the question exercised.\ncases are: ${defined.join(', ')}`);
  }

  // --- build the record --------------------------------------------------------
  const record = {
    at: new Date().toISOString(),
    goal: goalId,
    label,
    ...(tags.length ? { tags } : {}),
    ...(cases.length || (unchecked && defined.length) ? { cases } : {}),
    source,
  };

  if (axes) {
    const UNAIDED = ['yes', 'no', 'unclear'];
    const CRITERION = ['met', 'not met', 'unclear', 'unchecked'];
    if (!UNAIDED.includes(axes.unaided)) die(`unaided must be one of: ${UNAIDED.join(', ')}`);
    if (!CRITERION.includes(axes.criterion)) die(`criterion must be one of: ${CRITERION.join(', ')}`);
    record.unaided = axes.unaided;
    record.criterion = axes.criterion;
  } else {
    // `aided` used to live here and is gone. It is now an ordinary attempt with ordinary axes —
    // `unaided: no, criterion: unchecked` — which says more than the outcome word did.
    const OUTCOMES = ['abandoned', 'declared', 'elsewhere'];
    if (!OUTCOMES.includes(outcome)) die(`--outcome must be one of: ${OUTCOMES.join(', ')}`);
    record.outcome = outcome;
  }
  if (note) record.note = note;
  return record;
}

// --- append ------------------------------------------------------------------
// Appending is safe from any writer, which matters: a review sitting can be inside this topic
// at the same time as a study session. Nothing here rewrites a file, so nothing can lose
// another process's line.
//
// Returns the lines to say what happened.
export function appendAttempt(dir, record) {
  return appendAttemptResult(dir, record).lines;
}

// The same, and also what a caller writing the learner's feedback needs: whether this attempt
// met the bar for the first time, the review it scheduled (null when the goal does not recur),
// and whether the goal is retired.
export function appendAttemptResult(dir, record) {
  const goalId = record.goal;
  const goal = readIds(dir).get(goalId);
  const before = met(goal, attemptsFor(dir, goalId));

  mkdirSync(join(dir, 'evidence'), { recursive: true });
  appendFileSync(join(dir, 'evidence', 'attempts.jsonl'), JSON.stringify(record) + '\n');

  const attempts = attemptsFor(dir, goalId);
  const after = met(goal, attempts);

  // --- the review date ---------------------------------------------------------
  // NOTHING IS WRITTEN HERE, and there is nothing that could be forgotten. The schedule is a fold
  // over the attempts this file has just appended to, so recording the attempt IS setting the
  // date. There used to be a second write to review.json in this call, put here so a session
  // couldn't record an attempt and skip the date; now it isn't a second write at all.
  //
  // `recurrence: never` is the goal saying it doesn't come back. reviewSchedule reads it.
  const scheduled = reviewSchedule(goal, attempts);

  // --- a retired goal is recorded anyway ---------------------------------------
  // AND IT IS SAID OUT LOUD. Refusing would mean a learner who changed their mind hits an error
  // mid-session and has to know the word `revive`; accepting keeps the one code path every other
  // kind of goal comes through, and the note points at the way back without nagging.
  //
  // IT DOES NOT SILENTLY UN-RETIRE. Reviving stays an explicit event, so the evidence accumulates
  // while the reviews stay off until somebody asks for them.
  //
  // The next review date is not printed, because it will not be consulted: retirement filters
  // before the schedule is folded, in review-due.mjs. Nothing was written that has to be undone.
  const retired = isGoalRetired(dir, goalId);

  // --- say what happened -------------------------------------------------------
  const lines = [`${goalId}: ${describeRuling(record)}`];
  if (after !== before) lines.push(`  bar met (${goal.bar})`);
  else lines.push(`  bar ${after ? 'already met' : 'not met'} (${goal.bar})`);
  if (retired) lines.push(`  this goal was retired — recorded anyway. Say so if you want it back in review.`);
  else if (scheduled) lines.push(`  next review ${scheduled.due} (${scheduled.days} days)`);
  return { lines, newlyMet: after && !before, scheduled, retired };
}

// --- where that leaves them --------------------------------------------------
// ONE CALL INSTEAD OF TWO. Study shows this after every attempt, and running progress.mjs as a
// separate command cost the learner a turn of waiting each time. A topic with no sequence
// placement for the goal prints nothing here, which progress.mjs would have refused.
export function progressAfter(dir, goalId) {
  const survey = surveyTopic(dir);
  return renderAfter(survey, buildProgress(survey), goalId);
}
