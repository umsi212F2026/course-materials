// Pick the next goal to work on from the topic's Sequence.
//
//   node workflows/learn/tools/next-goal.mjs <topic-folder>
//
// Prints `goal: <id>` and `set: <n> of <total>`, and `sequence: not decided yet` when goals.md
// has no `## Sequence` section. Exits 2 with `nothing open in <topic>` when no goal is open.
//
// WHY A PROGRAM PICKS. An agent asked to choose at random does not: it favours the first goal,
// or the one that reads best, and the same few come up every session. Math.random has no such
// habit, so the choice is made here and the agent is handed the result.
//
// THE CURRENT SET IS THE FIRST ONE WITH AN OPEN GOAL. Met, deferred and retired goals do not
// count as open, so a set whose remaining goals were all deferred is passed over rather than
// stalling the learner on work they have said they will do elsewhere. surveyTopic works that
// out; this only chooses within it.

import { existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { surveyTopic } from './lib/topic.mjs';

const USAGE = `usage:
  node workflows/learn/tools/next-goal.mjs <topic-folder>`;

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

// Every flag checked, same as record-status.mjs: this tool takes none.
const argv = process.argv.slice(2);
for (const a of argv) if (a.startsWith('--')) die(`${a} is not a flag.\n\n${USAGE}`);
const [dir, ...extra] = argv;
if (!dir) die(USAGE);
if (extra.length) die(`Too many arguments: ${extra.map((a) => `"${a}"`).join(' ')}\n\n${USAGE}`);
if (!existsSync(dir)) die(`${dir} does not exist.`);

const { decided, sets, current } = surveyTopic(dir).sequence;

if (current === null) {
  console.error(`nothing open in ${basename(resolve(dir))}`);
  process.exit(2);
}

const open = sets[current].goals.filter((g) => g.state === 'open');
console.log(`goal: ${open[Math.floor(Math.random() * open.length)].id}`);
console.log(`set: ${current + 1} of ${sets.length}`);
if (!decided) console.log('sequence: not decided yet');
