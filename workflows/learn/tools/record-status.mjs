// Record one lifecycle event in evidence/status.jsonl.
//
//   node workflows/learn/tools/record-status.mjs <topic> goal-added <goal-id>
//   node workflows/learn/tools/record-status.mjs <topic> curated    <goal-id>
//   node workflows/learn/tools/record-status.mjs <topic> blocked    <goal-id> --needs curation|goal-setting --why "..."
//   node workflows/learn/tools/record-status.mjs <topic> unblocked  <goal-id>
//   node workflows/learn/tools/record-status.mjs <topic> retired    --reason "..."
//   node workflows/learn/tools/record-status.mjs <topic> retired    <goal-id> --reason "..."
//   node workflows/learn/tools/record-status.mjs <topic> revived
//   node workflows/learn/tools/record-status.mjs <topic> revived    <goal-id>
//
// RETIRING TAKES AN OPTIONAL GOAL. With one, the learner gave that goal up — a word they
// decided wasn't worth the interval. Without one, they gave the whole topic up. Same decision,
// two scopes, and `--reason` is required either way: it is the only part of a retirement a
// fold cannot reconstruct.
//
// THIS IS A WORK QUEUE, NOT A DIARY. Every line either puts something on it or takes something
// off. There is nothing here for "how the session went" or "what we were in the middle of" —
// the first is colour and the second is the last attempt and its ruling, which
// workflows/learn/tools/survey.mjs prints from the attempt log.
//
// WHY A PROGRAM AND NOT A HAND-APPENDED LINE. Same reason as record-attempt.mjs: an agent
// writing JSON by hand writes `needs: curating` one time in ten, and a queue entry nobody
// sweeps for is silence rather than an error. The event shapes and the closed sets are in
// lib/status.mjs, which is the only writer; this is the command line onto it.
//
// `created` is not offered here. It is what workflows/learn/tools/new-topic.mjs writes when it makes the
// folder, and a topic that needs it added by hand is one that was made by hand.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readIds } from './lib/topic.mjs';
import { KINDS, NEEDS, appendStatus } from './lib/status.mjs';

const USAGE = `usage:
  node workflows/learn/tools/record-status.mjs <topic> <kind> [goal-id] [flags]

  kinds:
${Object.entries(KINDS)
  .filter(([k]) => k !== 'created')
  .map(
    ([k, spec]) =>
      `    ${k.padEnd(11)} ${
        spec.goal === 'optional' ? '[goal-id]   one goal, or the whole topic' : spec.goal ? '<goal-id>' : '(no goal)'
      }`
  )
  .join('\n')}

  --needs ${Object.keys(NEEDS).join(' | ')}   who has to act; required on: blocked
  --why "..."                       what would have to change; required on: blocked
  --reason "..."                    the learner's own words; required on: retired`;

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

// --- arguments ---------------------------------------------------------------
// Every flag checked, same as record-attempt.mjs and for the same reason: a misspelling stored
// under its own name is a required field silently missing, and the line lands on the queue
// saying less than it was meant to.
const FLAGS = ['needs', 'why', 'reason'];

const argv = process.argv.slice(2);
const positional = [];
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) {
    positional.push(argv[i]);
    continue;
  }
  const name = argv[i].slice(2);
  if (!FLAGS.includes(name)) die(`--${name} is not a flag.\n\n${USAGE}`);
  const value = argv[++i];
  if (value === undefined || value.startsWith('--')) die(`--${name} needs a value.\n\n${USAGE}`);
  flags[name] = value;
}

const [dir, kindName, goalId, ...extra] = positional;
if (!dir || !kindName) die(USAGE);
if (extra.length) die(`Too many arguments: ${extra.map((a) => `"${a}"`).join(' ')}\n\n${USAGE}`);
if (!existsSync(dir)) die(`${dir} does not exist.`);

// --- validate the goal -------------------------------------------------------
// A typo would otherwise queue work against a goal that doesn't exist, and nothing would
// complain until somebody wondered why curation never ran. lib/status.mjs checks the shape of
// an event; this checks that the id names something, which needs the folder.
if (KINDS[kindName]?.goal && goalId) {
  const ids = readIds(dir);
  if (!ids.has(goalId)) {
    const near = [...ids.keys()].filter((k) => k.startsWith(goalId.slice(0, 4)));
    die(
      `${goalId} is not in ${join(dir, 'goals.md')}.` +
        (near.length ? `\nDid you mean: ${near.join(', ')}` : '')
    );
  }
}

// --- append ------------------------------------------------------------------
let event;
try {
  event = appendStatus(dir, kindName, {
    goal: goalId,
    needs: flags.needs,
    why: flags.why,
    reason: flags.reason,
  });
} catch (err) {
  die(`${err.message}\n\n${USAGE}`);
}

console.log(
  [event.kind, event.goal, event.needs && `needs ${event.needs}`].filter(Boolean).join(' · ')
);
