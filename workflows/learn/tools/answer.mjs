// Rule a bank question, record it, and write the learner's feedback, in one call.
//
//   node workflows/learn/tools/answer.mjs <topic> <label> --unaided yes --choice 3
//   node workflows/learn/tools/answer.mjs <topic> <label> --unaided yes --choice a=2,c=1 --criterion met
//   node workflows/learn/tools/answer.mjs <topic> <label> --unaided no --criterion "not met"
//
// ONE CALL PER ANSWER. Study used to spawn a judge, run record-attempt.mjs once per goal, then
// run next-item.mjs, and the learner waited through all of it for a multiple choice answer. Here
// the tutor states what only it knows, whether the learner was unaided and (for an open part) the
// criterion ruling, and this does the rest.
//
// A PROGRAM RULES THE CHOICES. A multiple choice part is right or wrong by the bank's key, so no
// judge reads it; --criterion is refused for a plain multiple choice question and required only
// for a question with an open part. lib/rule.mjs holds the rules.
//
// THE TUTOR STATES --unaided ON EVERY CALL. A default would record an attempt the tutor helped
// with as unaided, the one error the bars cannot recover from, so there is none.
//
// EVERYTHING IS CHECKED BEFORE ANYTHING IS WRITTEN. A question crediting two goals records an
// attempt for each, and a refusal on the second must not leave the first behind.
//
// WHAT FOLLOWS `--- learner sees ---` IS FOR THE LEARNER, and the tutor relays it verbatim. The
// lines above it are the tutor's own. The scenario key is never printed below the line.

import { existsSync } from 'node:fs';
import { readFolderBanks } from '../../quiz/tools/lib/bank.mjs';
import { readIds } from './lib/topic.mjs';
import { RecordError, checkAttempt, appendAttempt, progressAfter } from './lib/record.mjs';
import { RuleError, ruleItem } from './lib/rule.mjs';

const USAGE = `usage:
  node workflows/learn/tools/answer.mjs <topic> <label> --unaided yes|no|unclear [--choice <n> | --choice a=<n>,c=<n>] [--criterion met|"not met"|unclear]

  --unaided     required on every call: whether the learner had no help
  --choice      a multiple choice question's choice, or a compound's choice per lettered part (1-based)
  --criterion   your ruling on an open question, or on the open part of a compound`;

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

// Every flag checked, as record-attempt.mjs does and for the same reason: a misspelling silently
// ignored would record an attempt the tutor did not mean.
const FLAGS = ['unaided', 'choice', 'criterion'];
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

const [dir, label, ...extra] = positional;
if (!dir || !label) die(USAGE);
if (extra.length) die(`Too many arguments: ${extra.map((a) => `"${a}"`).join(' ')}\n\n${USAGE}`);
if (!existsSync(dir)) die(`${dir} does not exist.`);
if (!['yes', 'no', 'unclear'].includes(flags.unaided)) {
  die(`--unaided is required, and is yes, no or unclear.\n\n${USAGE}`);
}

const item = readFolderBanks(dir).items.find((it) => it.label === label);
if (!item) {
  die(`${label} is not a question in ${dir}'s bank. A question set live is recorded through record-attempt.mjs.`);
}
if (!item.goals.length) die(`${label} credits no goal, so there is nothing to record. Fix its rubric entry.`);

// --- rule, then validate every goal ------------------------------------------
let ruling;
const records = [];
try {
  ruling = ruleItem(item, { choice: flags.choice, criterion: flags.criterion });
  const ids = readIds(dir);
  for (const goalId of item.goals) {
    const slots = ids.get(goalId)?.cases ?? [];
    const cases = item.cases?.[goalId] ?? [];
    if (slots.length && !cases.length) {
      die(`${goalId} has cases and ${label} lists none for it. Record that goal through record-attempt.mjs, as before.`);
    }
    records.push(
      checkAttempt(dir, goalId, {
        label,
        axes: { unaided: flags.unaided, criterion: ruling.criterion },
        tags: item.tags,
        cases,
        source: 'study',
      })
    );
  }
} catch (e) {
  if (e instanceof RuleError || e instanceof RecordError) die(e.message);
  throw e;
}

// --- record, then show -------------------------------------------------------
const out = [];
for (const record of records) out.push(...appendAttempt(dir, record));
out.push(...ruling.partLines);
out.push('--- learner sees ---');

const ids = readIds(dir);
const hasCases = item.goals.some((g) => (ids.get(g)?.cases ?? []).length);
const sections = [];
if (ruling.verdict.length) sections.push(ruling.verdict.join('\n'));
const progress = progressAfter(dir, item.goals.at(-1));
if (progress !== null) sections.push('```text\n' + progress + '\n```');
if (ruling.criterion === 'not met') {
  sections.push(
    [
      'What next?',
      '1. Try again now, with another question.',
      '2. Come back to it later.',
      hasCases ? '3. Count this one as right and go on to the next question.' : '3. Mark it as learned.',
    ].join('\n')
  );
}
console.log([...out, ...(sections.length ? [sections.join('\n\n')] : [])].join('\n'));
