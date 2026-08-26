// When each goal comes back — folded out of the attempt log, stored nowhere.
//
// THERE IS NO review.json, and that is the point. The schedule used to be a file a program read,
// mutated a field of, and wrote back whole. It was the only read-modify-write anywhere in the
// system, which is why the audit could demonstrate eleven lost writes out of twenty against it
// and could not demonstrate a race anywhere else. Deleting it yields an invariant rather than a
// fix: NO PROGRAM IN THIS SYSTEM DOES READ-MODIFY-WRITE. Everything appends or only reads.
//
// What survives is the arithmetic, unchanged — the intervals, the three-way direction rule, and
// *every review branch reschedules*. What went is the persistence.
//
// IN REVIEW IS A PROPERTY OF A GOAL, NOT OF A TOPIC. A goal enters the schedule the moment its
// bar is first met, while the rest of its topic is still being studied.
//
// A goal carrying `recurrence: never` never enters it at all.
//
// THE FOLD RUNS OVER A GOAL'S ATTEMPTS IN ORDER, and that is now load-bearing where the stored
// version got it for free. attempts.jsonl is append-only and appended as things happen, so its
// file order is chronological; nothing here sorts, and a line inserted out of order would produce
// a wrong date rather than an error. Nothing hand-edits that file, and this is one of the reasons.

import { met, intervalDirection } from './bars.mjs';
import { recurs } from './slots.mjs';

// Intervals in days. A pass moves one step along; a lapse moves one back, never below the
// first; anything inconclusive repeats the current one. Deliberately not configurable per
// topic — a schedule someone can tune is a schedule someone will tune to make the number go up.
export const INTERVALS = [3, 7, 16, 35, 75, 160];

// `at` is an ISO timestamp; a due date is a day. Adding to the timestamp and then taking the day
// is what the stored version did when it called `Date.now()` on the day of the attempt, so a
// schedule folded today matches every date it wrote.
const plus = (at, days) => new Date(Date.parse(at) + days * 86400000).toISOString().slice(0, 10);

// Where one goal's schedule stands, given its whole attempt history in order.
//
//   null                              never met, or `recurrence: never` — it doesn't come back
//   { step, due, days }               step into INTERVALS, the date it next comes due, and the
//                                     length of the interval that produced it
//
// EVERY REVIEW ATTEMPT MOVES THE DATE. There is no branch here that leaves it where it was,
// which is what would strand a goal as due forever — it would head the overdue list every
// sitting, and being asked the same unanswerable question first every time is how a learner
// learns to stop sitting down.
//
// `same` therefore re-dates a full interval from the attempt, rather than holding the old date.
// Decided 2026-08-23; lib/bars.mjs said otherwise in a comment and that comment was wrong.
export function reviewSchedule(goal, attempts) {
  if (!recurs(goal)) return null;
  // A goal whose slots name something nobody implements can't be derived from at all; survey
  // reports it and record-attempt.mjs refuses to write against it. Don't invent a date for it.
  if (goal.problems.length) return null;

  let step = null;
  let due = null;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];

    // Not yet in the schedule. It enters at the attempt that first makes the bar true, whatever
    // that attempt's source was — the first pass opens the entry, which is what the stored
    // version did in the same call that recorded it.
    if (step === null) {
      if (!met(goal, attempts.slice(0, i + 1))) continue;
      step = 0;
      due = plus(attempt.at, INTERVALS[0]);
      continue;
    }

    // Afterwards, only review moves it. A study session recording a second pass shouldn't move a
    // date that review owns.
    if (attempt.source !== 'review') continue;

    const direction = intervalDirection(attempt);
    if (direction === 'longer') step = Math.min(step + 1, INTERVALS.length - 1);
    else if (direction === 'shorter') step = Math.max(step - 1, 0);
    // 'same' leaves the step where it is and still takes a new date below.

    due = plus(attempt.at, INTERVALS[step]);
  }

  return step === null ? null : { step, due, days: INTERVALS[step] };
}
