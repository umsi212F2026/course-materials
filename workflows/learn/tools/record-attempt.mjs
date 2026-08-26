// Record one attempt. The only thing that writes evidence/attempts.jsonl.
//
//   Adjudicated — the usual path. Give it what the adjudicator returned, untouched:
//     node workflows/learn/tools/record-attempt.mjs <topic> <goal-id> <label> --axes '<json>'
//     node workflows/learn/tools/record-attempt.mjs <topic> <goal-id> <label> --axes '<json>' --tags production
//
//   Unadjudicated — when there was no attempt to rule on, or the learner asserted it:
//     node workflows/learn/tools/record-attempt.mjs <topic> <goal-id> <label> --outcome abandoned
//     ... --outcome declared    the learner saying they've got it
//
//   --tags a,b                   what the supply returned. From the closed set in lib/slots.mjs
//   --source study|review|scan   defaults to study. `scan` is for the daily transcript scan,
//                                which is designed but not built
//   --note "..."                 optional, e.g. why they stopped
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
// <label> IS WHAT THE SUPPLY SERVED, in the supply's own words, and it goes in opaque. Nothing
// but that supply parses it back. For the curated supply it is an activities.md entry id, with
// a bank item after a slash — `a-annotate-specimen/specimen-14` — because that is what the
// curated supply chose to write; it is not a format anything else relies on.
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

import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readIds, attemptsFor, isGoalRetired } from './lib/topic.mjs';
import { met, describeRuling } from './lib/bars.mjs';
import { TAGS, checkTags } from './lib/slots.mjs';
import { reviewSchedule } from './lib/schedule.mjs';

const USAGE = `usage:
  node workflows/learn/tools/record-attempt.mjs <topic> <goal-id> <label> --axes '<json>'
  node workflows/learn/tools/record-attempt.mjs <topic> <goal-id> <label> --outcome <what>

  --axes '{"unaided":"yes|no|unclear","criterion":"met|not met|unclear|unchecked"}'
  --outcome abandoned | declared
  --tags ${Object.keys(TAGS).join(',')}
  --source study | review | scan      (default study)
  --note "..."`;

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
const FLAGS = ['axes', 'outcome', 'tags', 'source', 'note'];

const argv = process.argv.slice(2);
const positional = [];
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) {
    positional.push(argv[i]);
    continue;
  }
  const name = argv[i].slice(2);
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
if (!['study', 'review', 'scan'].includes(source)) die(`--source must be study, review or scan.`);

if (!!flags.axes === !!flags.outcome) {
  die('Give exactly one of --axes and --outcome.\n\n' + USAGE);
}

// --- validate the goal -------------------------------------------------------
// A typo would otherwise write a log line for a goal that doesn't exist, and nothing would
// complain until someone noticed the report was wrong.
const ids = readIds(dir);
const goal = ids.get(goalId);
if (!goal) {
  const near = [...ids.keys()].filter((k) => k.startsWith(goalId.slice(0, 4)));
  die(
    `${goalId} is not in ${join(dir, 'goals.md')}.` +
      (near.length ? `\nDid you mean: ${near.join(', ')}` : '')
  );
}

// A goal carrying a slot value nothing implements can't be derived from, so an attempt recorded
// against it would be evidence for a claim nobody can evaluate. Refuse here rather than write
// a line survey will have to explain away.
if (goal.problems.length) {
  die(`${goalId} can't be recorded against until its goals.md entry is fixed:\n  ` +
    goal.problems.join('\n  '));
}

// --- the tags ----------------------------------------------------------------
// The one structured thing a supply returns, and the only part of what was served that a bar
// may read. Closed and system-wide, so a bar can be written against them.
const tags = (flags.tags ?? '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);
const unknownTags = checkTags(tags);
if (unknownTags.length) {
  die(
    `unknown tag${unknownTags.length > 1 ? 's' : ''}: ${unknownTags.join(', ')}\n` +
      `tags are one or more of: ${Object.keys(TAGS).join(', ')}`
  );
}

// --- build the record --------------------------------------------------------
const record = {
  at: new Date().toISOString(),
  goal: goalId,
  label,
  ...(tags.length ? { tags } : {}),
  source,
};

if (flags.axes) {
  let axes;
  try {
    axes = JSON.parse(flags.axes);
  } catch {
    die(`--axes is not JSON. Pass the adjudicator's object through unchanged.\n\n${USAGE}`);
  }
  const UNAIDED = ['yes', 'no', 'unclear'];
  const CRITERION = ['met', 'not met', 'unclear', 'unchecked'];
  if (!UNAIDED.includes(axes.unaided)) die(`unaided must be one of: ${UNAIDED.join(', ')}`);
  if (!CRITERION.includes(axes.criterion)) die(`criterion must be one of: ${CRITERION.join(', ')}`);
  record.unaided = axes.unaided;
  record.criterion = axes.criterion;
} else {
  // `aided` used to live here and is gone. It is now an ordinary attempt with ordinary axes —
  // `unaided: no, criterion: unchecked` — which says more than the outcome word did.
  const OUTCOMES = ['abandoned', 'declared'];
  if (!OUTCOMES.includes(flags.outcome)) die(`--outcome must be one of: ${OUTCOMES.join(', ')}`);
  record.outcome = flags.outcome;
}
if (flags.note) record.note = flags.note;

// --- append ------------------------------------------------------------------
// Appending is safe from any writer, which matters: a review sitting can be inside this topic
// at the same time as a study session. Nothing here rewrites a file, so nothing can lose
// another process's line.
const before = met(goal, attemptsFor(dir, goalId));

mkdirSync(join(dir, 'evidence'), { recursive: true });
appendFileSync(join(dir, 'evidence', 'attempts.jsonl'), JSON.stringify(record) + '\n');

const attempts = attemptsFor(dir, goalId);
const after = met(goal, attempts);

// --- the review date ---------------------------------------------------------
// NOTHING IS WRITTEN HERE, and there is nothing that could be forgotten. The schedule is a fold
// over the attempts this file has just appended to, so recording the attempt IS setting the
// date. There used to be a second write to review.json in this call, put here so a session
// couldn't record an attempt and skip the date; now it isn't a second write at all.
//
// `recurrence: never` is the goal saying it doesn't come back. reviewSchedule reads it.
const scheduled = reviewSchedule(goal, attempts);

// --- a retired goal is recorded anyway ---------------------------------------
// AND IT IS SAID OUT LOUD. Refusing would mean a learner who changed their mind hits an error
// mid-session and has to know the word `revive`; accepting keeps the one code path every other
// kind of goal comes through, and the note points at the way back without nagging.
//
// IT DOES NOT SILENTLY UN-RETIRE. Reviving stays an explicit event, so the evidence accumulates
// while the reviews stay off until somebody asks for them.
//
// The next review date is not printed, because it will not be consulted: retirement filters
// before the schedule is folded, in review-due.mjs. Nothing was written that has to be undone.
const retired = isGoalRetired(dir, goalId);

// --- say what happened -------------------------------------------------------
console.log(`${goalId}: ${describeRuling(record)}`);
if (after !== before) console.log(`  bar met (${goal.bar})`);
else console.log(`  bar ${after ? 'already met' : 'not met'} (${goal.bar})`);
if (retired) console.log(`  this goal was retired — recorded anyway. Say so if you want it back in review.`);
else if (scheduled) console.log(`  next review ${scheduled.due} (${scheduled.days} days)`);
