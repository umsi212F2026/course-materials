// Print the next bank question to serve, chosen by lib/pick.mjs.
//
//   node workflows/learn/tools/next-item.mjs <topic> --goal <id>     [--after <label>] [--key]
//   node workflows/learn/tools/next-item.mjs <topic> --activity <id> [--after <label>] [--key]
//
// THE LEARNER'S VIEW AND THE KEY ARE SEPARATE SECTIONS, and the key is printed only on --key,
// so an agent that wants the question can read the output without also reading the answer.
//
// EXIT 2 MEANS THE BANK HAS NOTHING FOR THIS, which is not a failure of the call: the activity
// has no stored questions and the tutor falls back to generating one live. Exit 1 is a misuse
// of the command, as in record-status.mjs.

import { existsSync } from 'node:fs';
import { readFolderBanks } from '../../quiz/tools/lib/bank.mjs';
import { readLog, readActivities } from './lib/topic.mjs';
import { pick } from './lib/pick.mjs';

const USAGE = `usage:
  node workflows/learn/tools/next-item.mjs <topic> (--goal <id> | --activity <id>) [--after <label>] [--key]`;

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
  if (name === 'key') {
    flags.key = true;
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

// A DROPPED ACTIVITY'S QUESTIONS ARE NOT SERVED. The entry stays in activities.md as curation's
// feedback, but the learner is not to meet it. A folder with no entry at all is still served:
// a bank may exist before curation has written anything about it.
const dropped = new Set(readActivities(dir).filter((e) => e.dropped).map((e) => e.id));
const result = pick(items.filter((it) => !dropped.has(it.activity)), readLog(dir), { goal: flags.goal, activity: flags.activity, after: flags.after });
if (!result) {
  console.error(`no bank questions for ${flags.goal ?? flags.activity}; run the activity's generator live`);
  process.exit(2);
}

const { item, repeat, lastServed } = result;
const lines = [
  `label: ${item.label}`,
  `goals: ${item.goals.join(', ')}`,
  `tags: ${item.tags?.length ? item.tags.join(', ') : 'none'}`,
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
