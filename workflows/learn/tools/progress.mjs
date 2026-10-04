// Draw a topic's progress through its sequence of sets, as ASCII text or JSON.
//
//   node workflows/learn/tools/progress.mjs <topic-folder> [--json] [--set <n>] [--after <goal-id>]
//
// With no flag, prints the full view: a header, a row per set (marks, met/total, `<- next` on the
// current set), the current set's remaining goals, and a legend. `--set <n>` prints only that
// set's one line, with its place in the sequence. `--json` prints the data the text is drawn
// from, for a panel that draws it another way. `--after <goal-id>` is what study runs after
// recording an attempt, a deferral or a retirement: it finds the goal's set itself (a retired goal
// too, from the survey's own sequence) and prints that set's one line, or the full view when the
// set is finished, so the tutor never has to work out either. Nothing is stored; everything
// comes from surveyTopic. A folder with no goals.md, or a `--set` outside the sequence, is a usage error
// (exit 1). The drawing itself lives in lib/progress.mjs so the tests can reach it without a
// topic folder.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { surveyTopic } from './lib/topic.mjs';
import { buildProgress, renderFull, renderSet } from './lib/progress.mjs';

const USAGE = `usage:
  node workflows/learn/tools/progress.mjs <topic-folder> [--json] [--set <n>] [--after <goal-id>]`;

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

// Every flag checked, same as record-status.mjs: a misspelling is an error, not a silent no-op.
const argv = process.argv.slice(2);
const rest = [];
let json = false;
let setArg;
let after;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--json') json = true;
  else if (argv[i] === '--set') {
    setArg = argv[++i];
    if (setArg === undefined || setArg.startsWith('--')) die(`--set needs a set number.\n\n${USAGE}`);
  } else if (argv[i] === '--after') {
    after = argv[++i];
    if (after === undefined || after.startsWith('--')) die(`--after needs a goal id.\n\n${USAGE}`);
  } else if (argv[i].startsWith('--')) die(`${argv[i]} is not a flag.\n\n${USAGE}`);
  else rest.push(argv[i]);
}
const [dir, ...extra] = rest;
if (!dir) die(USAGE);
if (extra.length) die(`Too many arguments: ${extra.map((a) => `"${a}"`).join(' ')}\n\n${USAGE}`);
if (json && setArg !== undefined) die(`--json and --set cannot be combined.\n\n${USAGE}`);
if (after !== undefined && (json || setArg !== undefined))
  die(`--after cannot be combined with --json or --set.\n\n${USAGE}`);
if (!existsSync(dir)) die(`${dir} does not exist.`);
if (!existsSync(join(dir, 'goals.md'))) die(`${dir} has no goals.md, so it is not a topic folder.`);

const survey = surveyTopic(dir);
const view = buildProgress(survey);

if (after !== undefined) {
  // The survey's sets still list retired goals, which the view omits, so place the goal there.
  const at = survey.sequence.sets.findIndex((set) => set.goals.some((g) => g.id === after));
  if (at === -1) die(`${after} is not a goal in the sequence of ${dir}.`);
  console.log(view.sets[at].finished ? renderFull(view) : renderSet(view, at + 1));
} else if (json) console.log(JSON.stringify(view, null, 2));
else if (setArg !== undefined) {
  const n = Number(setArg);
  if (!Number.isInteger(n) || n < 1 || n > view.sets.length)
    die(`--set ${setArg}: this topic has ${view.sets.length} sets, numbered 1 to ${view.sets.length}.`);
  console.log(renderSet(view, n));
} else console.log(renderFull(view));
