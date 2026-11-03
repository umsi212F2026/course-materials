// Record one attempt. The only thing that writes evidence/attempts.jsonl.
//
//   Adjudicated — the usual path. Give it what the adjudicator returned, untouched:
//     node workflows/learn/tools/record-attempt.mjs <topic> <goal-id> <label> --axes '<json>'
//     node workflows/learn/tools/record-attempt.mjs <topic> <goal-id> <label> --axes '<json>' --tags production
//
//   Unadjudicated — when there was no attempt to rule on, or the learner asserted it:
//     node workflows/learn/tools/record-attempt.mjs <topic> <goal-id> <label> --outcome abandoned
//     ... --outcome declared    the learner saying they've got it
//     ... --outcome elsewhere   the learner did it in class or on a problem set (put where in --note)
//
//   --tags a,b                   what the activity returned. From the closed set in lib/slots.mjs
//   --source study|review|quiz|scan  defaults to study. `quiz` is a practice quiz, whose passes
//                                re-date a goal without moving it along the intervals. `scan` is
//                                for the daily transcript scan, which is designed but not built
//   --cases a,b                  which of the goal's cases the question exercised. Required on a ruled
//                                attempt (--axes) for a goal that has cases, unless its criterion is
//                                unchecked; refused for one that has none
//   --note "..."                 optional, e.g. why they stopped
//   --progress                   then print where that leaves the topic, as `progress.mjs --after
//                                <goal-id>` does. Study passes it; review and the quiz do not show it
//
// ONE CODE PATH FOR EVERY GOAL. A capability, a word and an orientation all arrive here the
// same way; what differs is the slots the goal carries, and the only thing this file does with
// them is dispatch. There is no branch on what kind of goal it is, because there is no longer
// anything that knows.
//
// INCLUDING A RETIRED ONE, which is recorded like any other and says so in the output. A
// learner who changed their mind mid-session shouldn't meet an error and have to know the word
// `revive` — see the note beside the printing at the bottom.
//
// <label> IS WHAT THE ACTIVITY SERVED, in its own words, and it goes in opaque. For a banked
// question it is the question's path, `a-words/w-schema/q1`, which the picker in lib/pick.mjs
// matches to know what has been served; for an activity run without a bank it is the entry id,
// and for a vocabulary move set live it is the move and a note, `CATCH: subject/verb agreement`.
// Nothing here or in a bar parses it.
//
// THE TWO AXES GO IN RAW. `{"unaided":"yes|no|unclear","criterion":"met|not met|unclear|
// unchecked"}` is stored as given and never collapsed on the way in. What reads a verdict back
// out — the bars and the scheduler — reads the axes directly.
//
// `criterion: unchecked` MEANS NOBODY RULED, and it is the honest record of the times an
// adjudicator wasn't invoked. A tutor who knows it gave aid records `unaided: no, criterion:
// unchecked` and calls nobody; an attempt at something that could not have settled anything is
// `unaided: yes, criterion: unchecked`, which moves no date and establishes nothing. Distinct
// from `unclear`, which means an adjudicator looked and could not tell.
//
// It writes no level anywhere, and there is no level to write: workflows/learn/tools/survey.mjs derives where
// things stand from this log whenever anyone asks.

import { existsSync } from 'node:fs';
import { TAGS } from './lib/slots.mjs';
import { RecordError, checkAttempt, appendAttempt, progressAfter } from './lib/record.mjs';

const USAGE = `usage:
  node workflows/learn/tools/record-attempt.mjs <topic> <goal-id> <label> --axes '<json>'
  node workflows/learn/tools/record-attempt.mjs <topic> <goal-id> <label> --outcome <what>

  --axes '{"unaided":"yes|no|unclear","criterion":"met|not met|unclear|unchecked"}'
  --outcome abandoned | declared | elsewhere
  --tags ${Object.keys(TAGS).join(',')}
  --cases <case>,<case>   which of the goal's cases the question exercised
  --source study | review | quiz | scan   (default study)
  --note "..."
  --progress              then print where that leaves the topic`;

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

// --- arguments ---------------------------------------------------------------
// EVERY FLAG IS CHECKED, AND SO IS EVERY POSITIONAL. `--sorce review` used to be stored under
// its own misspelling and ignored: the attempt recorded as `study`, the review date never moved,
// and the tool printed "next review …" over the top of it. A typo produced the exact failure the
// three-way rule exists to make impossible, with a success message on it.
//
// The same for an extra positional. The call this file taught for months had a fourth one, and
// it went into the void — which is worse than being refused, because nothing said so.
const FLAGS = ['axes', 'outcome', 'tags', 'cases', 'source', 'note'];

const argv = process.argv.slice(2);
const positional = [];
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) {
    positional.push(argv[i]);
    continue;
  }
  const name = argv[i].slice(2);
  if (name === 'progress') {
    flags.progress = true;
    continue;
  }
  if (!FLAGS.includes(name)) {
    const near = FLAGS.filter((f) => f.startsWith(name.slice(0, 2)) || name.startsWith(f.slice(0, 2)));
    die(
      `--${name} is not a flag.` +
        (near.length ? ` Did you mean --${near.join(' or --')}?` : '') +
        `\n\n${USAGE}`
    );
  }
  const value = argv[++i];
  if (value === undefined || value.startsWith('--')) die(`--${name} needs a value.\n\n${USAGE}`);
  flags[name] = value;
}

const [dir, goalId, label, ...extra] = positional;
if (!dir || !goalId || !label) die(USAGE);
if (extra.length) {
  die(
    `Too many arguments: ${extra.map((a) => `"${a}"`).join(' ')}\n` +
      `The ruling is not a positional — it goes in --axes, or --outcome.\n\n${USAGE}`
  );
}
if (!existsSync(dir)) die(`${dir} does not exist.`);

const source = flags.source ?? 'study';
if (!['study', 'review', 'quiz', 'scan'].includes(source))
  die(`--source must be study, review, quiz or scan.`);

if (!!flags.axes === !!flags.outcome) {
  die('Give exactly one of --axes and --outcome.\n\n' + USAGE);
}

const list = (s) =>
  (s ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

let axes;
if (flags.axes) {
  try {
    axes = JSON.parse(flags.axes);
  } catch {
    die(`--axes is not JSON. Pass the adjudicator's object through unchanged.\n\n${USAGE}`);
  }
}

// --- validate, append, say what happened -------------------------------------
let record;
try {
  record = checkAttempt(dir, goalId, {
    axes,
    outcome: flags.outcome,
    tags: list(flags.tags),
    cases: list(flags.cases),
    source,
    note: flags.note,
    label,
  });
} catch (e) {
  if (e instanceof RecordError) die(e.message);
  throw e;
}
for (const line of appendAttempt(dir, record)) console.log(line);

if (flags.progress) {
  const text = progressAfter(dir, goalId);
  if (text !== null) console.log(`--- progress ---\n${text}`);
}
