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
// A SCENARIO'S FRAMING HEADS THE LEARNER'S VIEW only above the first question served from it; see
// lib/serve.mjs.
//
// EXIT 2 MEANS THE BANK HAS NOTHING FOR THIS, which is not a failure of the call: the activity
// has no stored questions, or in study none still needed while something is left to show, and
// the tutor falls back to generating one live. Exit 1 is a misuse
// of the command, as in record-status.mjs.
//
// A BANK IS SERVED ONLY WHILE ITS ACTIVITY HAS A LIVE ENTRY in activities.md; see lib/serve.mjs.

import { existsSync } from 'node:fs';
import { readFolderBanks } from '../../quiz/tools/lib/bank.mjs';
import { serveNext } from './lib/serve.mjs';

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

const { problems } = readFolderBanks(dir);
if (problems.length) console.error(`warning: ${problems.length} bank problem(s):\n  ${problems.join('\n  ')}`);

const served = serveNext(dir, { goal: flags.goal, activity: flags.activity, after: flags.after, review: !!flags.review });
if (!served) {
  console.error(`no bank questions for ${flags.goal ?? flags.activity}; run the activity's generator live`);
  process.exit(2);
}

const lines = [...served.header, '--- learner sees ---', served.learner];
if (flags.key) lines.push('--- key ---', served.key);
console.log(lines.join('\n'));
