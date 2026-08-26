// What has come due for review, across every topic.
//
//   node workflows/learn/tools/review-due.mjs --dir <d>            JSON, one per due goal
//   node workflows/learn/tools/review-due.mjs --dir <d> --report   printed for a person
//
// <d> is the directory holding the topic folders — see lib/workdir.mjs.
//
// No arguments, because A REVIEW SESSION IS NOT PER TOPIC. What's due is whatever the dates say
// is due, and the dates don't respect topic boundaries — three words from one topic and a
// capability from another is an ordinary list. Each record carries its own folder.
//
// ONE PATH, WHATEVER KIND OF GOAL IT IS. There is no `is_word` here and nothing that branches
// on one: a word has a live entry in activities.md like anything else, so review looks it up
// the same way. What differs between goals is their slots, and review reads those from
// goals.md when it gets there.
//
// THE SCHEDULE IS FOLDED HERE, not read from a file. There is no review.json; every goal's next
// date comes out of that topic's attempt log during the same sweep this was already doing. The
// fold is a few hundred lines of JSON per folder and costs nothing at this scale.
//
// One failure mode went with the file: a goal could be scheduled and no longer in goals.md,
// because two files could disagree. Now the goals are where the schedule comes from, so there
// is nothing to disagree. A log line naming a goal that isn't in goals.md is still a problem,
// and survey.mjs is where it gets reported.
//
// Retired topics are skipped, and so are retired goals inside topics that are still live.
// Someone who gave a topic up shouldn't be handed its vocabulary three days later, and neither
// should someone who said one word wasn't worth the interval. Both are one decision at two
// scopes, and `isGoalRetired` is where they are asked as one question.
//
// RETIREMENT FILTERS BEFORE THE SCHEDULE IS FOLDED, which is why nothing has to be cleaned up
// when a goal is retired. A date computed by an attempt recorded moments earlier is simply
// never consulted.

import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGoals, readLog, isRetired, isGoalRetired, served } from './lib/topic.mjs';
import { reviewSchedule } from './lib/schedule.mjs';
import { takeDir } from './lib/workdir.mjs';

const USAGE = 'node workflows/learn/tools/review-due.mjs --dir <learning-topics> [--report]';
const { dir: learning, rest: argv } = takeDir(process.argv.slice(2), USAGE);
const report = argv.includes('--report');

const today = new Date().toISOString().slice(0, 10);

function topicFolders() {
  if (!existsSync(learning)) return [];
  return readdirSync(learning)
    .map((name) => join(learning, name))
    .filter((p) => statSync(p).isDirectory())
    .sort();
}

const due = [];

for (const dir of topicFolders()) {
  if (isRetired(dir)) continue;

  const log = readLog(dir);

  for (const goal of readGoals(dir).goals) {
    if (isGoalRetired(dir, goal.id)) continue;

    const schedule = reviewSchedule(goal, log.filter((r) => r.goal === goal.id));
    if (!schedule || schedule.due > today) continue;

    due.push({
      topic: dir,
      goal: goal.id,
      // The slots review needs to set up the check. `supply` says where the task comes from;
      // `adjudicator` says who rules on it.
      supply: goal.supply,
      adjudicator: goal.adjudicator,
      served: served(dir, goal.id),
      due: schedule.due,
    });
  }
}

// Longest overdue first. Someone with twenty minutes should spend them on what has been waiting
// the longest, not on whatever folder sorts first.
due.sort((a, b) => a.due.localeCompare(b.due));

if (!report) {
  console.log(JSON.stringify(due, null, 2));
  process.exit(0);
}

if (!due.length) {
  console.log('Nothing due.');
  process.exit(0);
}

const name = (dir) => dir.split('/').pop();
console.log(`${due.length} due:\n`);
for (const r of due) {
  const recent = r.served.slice(0, 3).join(', ') || 'nothing yet';
  console.log(`  ${name(r.topic)}  ${r.goal}`);
  console.log(`    due ${r.due}  ·  already served: ${recent}`);
}
console.log('');
