// Print the next bank question to serve, chosen by lib/pick.mjs.
//
//   node workflows/learn/tools/next-item.mjs <topic> --goal <id>     [--after <label>] [--review] [--key]
//   node workflows/learn/tools/next-item.mjs <topic> --activity <id> [--after <label>] [--review] [--key]
//
// --REVIEW IS FOR A REVIEW SITTING: the question on the case passed longest ago, and no scenario
// order, since every question has been met. Without it the picker is studying; see lib/pick.mjs.
//
// THE LEARNER'S VIEW AND THE KEY ARE SEPARATE SECTIONS, and the key is printed only on --key,
// so an agent that wants the question can read the output without also reading the answer.
//
// EXIT 2 MEANS THE BANK HAS NOTHING FOR THIS, which is not a failure of the call: the activity
// has no stored questions and the tutor falls back to generating one live. Exit 1 is a misuse
// of the command, as in record-status.mjs.
//
// A BANK IS SERVED ONLY WHILE ITS ACTIVITY HAS A LIVE ENTRY in activities.md; see below.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readFolderBanks } from '../../quiz/tools/lib/bank.mjs';
import { readLog, readGoals, liveActivities } from './lib/topic.mjs';
import { pick, stillNeeded, rankByCase } from './lib/pick.mjs';

const USAGE = `usage:
  node workflows/learn/tools/next-item.mjs <topic> (--goal <id> | --activity <id>) [--after <label>] [--review] [--key]`;

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

// Every flag checked, same as record-status.mjs and for the same reason: a misspelling
// silently ignored would serve from the wrong pool.
const VALUE_FLAGS = ['goal', 'activity', 'after'];
const argv = process.argv.slice(2);
const positional = [];
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) {
    positional.push(argv[i]);
    continue;
  }
  const name = argv[i].slice(2);
  if (name === 'key' || name === 'review') {
    flags[name] = true;
    continue;
  }
  if (!VALUE_FLAGS.includes(name)) die(`--${name} is not a flag.\n\n${USAGE}`);
  const value = argv[++i];
  if (value === undefined || value.startsWith('--')) die(`--${name} needs a value.\n\n${USAGE}`);
  flags[name] = value;
}

const [dir, ...extra] = positional;
if (!dir) die(USAGE);
if (extra.length) die(`Too many arguments: ${extra.map((a) => `"${a}"`).join(' ')}\n\n${USAGE}`);
if (!existsSync(dir)) die(`${dir} does not exist.`);
if (!flags.goal === !flags.activity) die(`Give exactly one of --goal and --activity.\n\n${USAGE}`);

const { items, problems } = readFolderBanks(dir);
if (problems.length) console.error(`warning: ${problems.length} bank problem(s):\n  ${problems.join('\n  ')}`);

// ONLY A LIVE ACTIVITY'S QUESTIONS ARE SERVED, once the topic has an activities.md at all. A
// dropped entry stays in the file as curation's feedback, but the learner is not to meet it. A
// folder with no entry is an orphan: it has no tutor method, no offer and no generator behind
// it, so the tutor would be serving a question it cannot teach from, and every route to one is
// a mistake (survey reports it, see idProblems). Without activities.md curation has not run,
// there is nothing to be live or orphaned against, and banks are served as before.
const hasEntries = existsSync(join(dir, 'activities.md'));
const live = new Set(liveActivities(dir).map((e) => e.id));
// WHAT IS STILL TO SHOW comes from the goals and the log, the same reading `met` gives survey and
// progress, so the picker and the progress view never disagree about which cases are passed.
const log = readLog(dir);
const goalsById = new Map(readGoals(dir).goals.map((g) => [g.id, g]));
const attemptsByGoal = new Map();
for (const r of log) attemptsByGoal.set(r.goal, [...(attemptsByGoal.get(r.goal) ?? []), r]);
const result = pick(hasEntries ? items.filter((it) => live.has(it.activity)) : items, log, {
  goal: flags.goal,
  activity: flags.activity,
  after: flags.after,
  review: !!flags.review,
  needed: (it) => stillNeeded(it, goalsById, attemptsByGoal),
  caseRank: rankByCase(goalsById.get(flags.goal), attemptsByGoal.get(flags.goal) ?? [], { review: !!flags.review }),
});
if (!result) {
  console.error(`no bank questions for ${flags.goal ?? flags.activity}; run the activity's generator live`);
  process.exit(2);
}

const { item, repeat, lastServed } = result;
const lines = [
  `label: ${item.label}`,
  `goals: ${item.goals.join(', ')}`,
  `tags: ${item.tags?.length ? item.tags.join(', ') : 'none'}`,
  // ONE LINE PER GOAL THE QUESTION GIVES CASES FOR, so the tutor passes them to record-attempt --cases.
  ...Object.entries(item.cases ?? {})
    .filter(([, c]) => c.length)
    .map(([g, c]) => `cases: ${g}: ${c.join(', ')}`),
  `repeat: ${repeat ? `yes (last served ${lastServed.slice(0, 10)})` : 'no'}`,
  '--- learner sees ---',
  item.prompt,
];
if (item.type === 'mcq') item.choices.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
if (flags.key) {
  // An mcq's key is the scenario's key (when it has one) and then the correct choice, numbered
  // as the learner saw it.
  lines.push('--- key ---');
  if (item.type === 'mcq') {
    if (item.key) lines.push(item.key);
    lines.push(`${item.answer + 1}. ${item.choices[item.answer]}`);
  } else {
    lines.push(item.rubric);
  }
  if (item.tutorNote) lines.push('--- tutor note ---', item.tutorNote);
}
console.log(lines.join('\n'));
