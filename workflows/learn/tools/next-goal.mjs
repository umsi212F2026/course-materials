// Pick the next goal to work on from the topic's Sequence.
//
//   node workflows/learn/tools/next-goal.mjs <topic-folder> [--skip <goal-id> ...]
//
// Prints `goal: <id>` and `set: <n> of <total>`, and `sequence: not decided yet` when goals.md
// has no `## Sequence` section. Exits 2 with `nothing open in <topic>` when no goal can be chosen.
// A folder with no goals.md, or a `--skip` naming no goal, is a usage error (exit 1).
//
// WHY A PROGRAM PICKS. An agent asked to choose at random does not: it favours the first goal,
// or the one that reads best, and the same few come up every session. Math.random has no such
// habit, so the choice is made here and the agent is handed the result.
//
// THE CURRENT SET IS THE FIRST ONE WITH A CHOOSABLE GOAL. Choosable means open (not met,
// deferred or retired; surveyTopic works that out), not passed with --skip, and with something
// live to study. A set whose open goals are all skipped or unworkable is passed over rather than
// stalling the learner. The printed set number is that set.
//
// --SKIP LASTS FOR THE SITTING ONLY. The tutor passes every goal the learner set aside with
// "come back to it later" in this sitting, optional ones included; nothing is stored, so a new
// session starts with none.
//
// NOTHING LIVE, NOTHING OFFERED. A goal is workable when a live activity serves it (group
// `serves` already expanded; an activity whose generator runs live is still an entry) or a bank
// question names it. Otherwise the tutor would be handed a goal it has nothing to run for.

import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { surveyTopic, liveActivities } from './lib/topic.mjs';
import { readFolderBanks } from '../../quiz/tools/lib/bank.mjs';

const USAGE = `usage:
  node workflows/learn/tools/next-goal.mjs <topic-folder> [--skip <goal-id> ...]`;

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

// Every flag checked, same as record-status.mjs: --skip is the only one, and repeatable.
const argv = process.argv.slice(2);
const skip = new Set();
const rest = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--skip') {
    if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) die(`--skip needs a goal id.\n\n${USAGE}`);
    skip.add(argv[++i]);
  } else if (argv[i].startsWith('--')) die(`${argv[i]} is not a flag.\n\n${USAGE}`);
  else rest.push(argv[i]);
}
const [dir, ...extra] = rest;
if (!dir) die(USAGE);
if (extra.length) die(`Too many arguments: ${extra.map((a) => `"${a}"`).join(' ')}\n\n${USAGE}`);
if (!existsSync(dir)) die(`${dir} does not exist.`);
if (!existsSync(join(dir, 'goals.md'))) die(`${dir} has no goals.md, so it is not a topic folder.`);

const { decided, sets } = surveyTopic(dir).sequence;

const known = new Set(sets.flatMap((s) => s.goals.map((g) => g.id)));
for (const id of skip) if (!known.has(id)) die(`--skip ${id}: no such goal in ${dir}.`);

const live = new Set([
  ...liveActivities(dir).flatMap((e) => e.serves),
  ...readFolderBanks(dir).items.flatMap((i) => i.goals),
]);
const choosable = (g) => g.state === 'open' && !skip.has(g.id) && live.has(g.id);
const current = sets.findIndex((s) => s.goals.some(choosable));

if (current === -1) {
  console.error(`nothing open in ${basename(resolve(dir))}`);
  process.exit(2);
}

const open = sets[current].goals.filter(choosable);
console.log(`goal: ${open[Math.floor(Math.random() * open.length)].id}`);
console.log(`set: ${current + 1} of ${sets.length}`);
if (!decided) console.log('sequence: not decided yet');
