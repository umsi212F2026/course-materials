// What has this goal already been given?
//
//   node workflows/learn/tools/served.mjs <topic-folder> <goal-id>
//
// Prints one label per line, most recent first, exactly as the supply wrote them.
//
// A LABEL IS A PRIVATE CHANNEL BETWEEN A SUPPLY AND ITS FUTURE SELF. This program returns them
// unmodified and interprets nothing: the supply that wrote the string is the only thing that
// reads it, so the worst that a bad label can do is make that supply repeat itself. That is why
// it may be free-form, and why a bar reads `tags` instead.
//
// It generalizes past banks, which is the point. The curated supply writes an entry id, and a
// bank item after a slash. A generator can write what it varied — "subject/verb agreement
// error" — and avoid the shape next time rather than the exact sentence.
//
// Both study and review ask this, and both act on it the same way: don't serve what's near the
// front. Study asks before setting an activity; review asks through workflows/learn/tools/review-due.mjs, which
// wraps this.
//
// RECOMPUTED, NOT CACHED. A generator's labels grow for as long as the goal keeps coming back
// in review, and a cell that answers that is the log transcribed into a cell nobody can read.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { served, readIds } from './lib/topic.mjs';

const [dir, goalId] = process.argv.slice(2);

if (!dir || !goalId) {
  console.error('usage: node workflows/learn/tools/served.mjs <topic-folder> <goal-id>');
  process.exit(1);
}
if (!existsSync(dir)) {
  console.error(`${dir} does not exist.`);
  process.exit(1);
}

if (!readIds(dir).has(goalId)) {
  console.error(`${goalId} is not in ${join(dir, 'goals.md')}.`);
  process.exit(1);
}

const list = served(dir, goalId);

// Nothing served yet is the ordinary state of a goal nobody has worked on. Say so rather than
// printing nothing, which reads like a failure.
if (!list.length) {
  console.log(`${goalId}: nothing served yet`);
  process.exit(0);
}

for (const label of list) console.log(label);
