// Print everything study-judge needs about one attempt except the record: the goals it rules on,
// each criterion resolved, the cases the question exercises, and for a bank question its text and
// rubric. The judge runs it; the caller sends the command line and the record.
//
//   node workflows/learn/tools/judge-input.mjs <topic> <label>                         a bank question
//   node workflows/learn/tools/judge-input.mjs <topic> <label> --goal <id>             a question set live
//   ... --cases <goal>:<case>,<case>   which cases it exercises, for a question set live or a bank
//                                      question that lists none for a goal that has them. Repeatable
//
// THE CALLER NO LONGER COPIES THE INPUTS. A tutor writing the criterion, the case texts and the
// rubric into its message to the judge spent most of the judging time generating them, and could
// copy one wrong. Read from the topic folder, they are the ones the goals and the bank say.
//
// A MISSING INPUT IS AN ERROR, never a guess, for the judge's reason: a verdict built on an
// inferred criterion is recorded exactly like a real one. Exit 1 says what is missing.

import { existsSync } from 'node:fs';
import { readFolderBanks } from '../../quiz/tools/lib/bank.mjs';
import { readIds } from './lib/topic.mjs';
import { learnerText, keyText } from './lib/item.mjs';

const USAGE = `usage:
  node workflows/learn/tools/judge-input.mjs <topic> <label> [--goal <id>] [--cases <goal>:<case>,<case>]...`;

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

// Every flag checked, as in next-item.mjs.
const argv = process.argv.slice(2);
const positional = [];
let goalFlag;
const casesFlag = new Map();
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) {
    positional.push(argv[i]);
    continue;
  }
  const name = argv[i].slice(2);
  if (name !== 'goal' && name !== 'cases') die(`--${name} is not a flag.\n\n${USAGE}`);
  const value = argv[++i];
  if (value === undefined || value.startsWith('--')) die(`--${name} needs a value.\n\n${USAGE}`);
  if (name === 'goal') goalFlag = value;
  else {
    const m = value.match(/^([^:]+):(.+)$/);
    if (!m) die(`--cases takes <goal>:<case>,<case>, not "${value}".\n\n${USAGE}`);
    casesFlag.set(m[1], m[2].split(',').map((c) => c.trim()).filter(Boolean));
  }
}

const [dir, label, ...extra] = positional;
if (!dir || !label) die(USAGE);
if (extra.length) die(`Too many arguments: ${extra.map((a) => `"${a}"`).join(' ')}\n\n${USAGE}`);
if (!existsSync(dir)) die(`${dir} does not exist.`);

// Any bank question, live entry or not: it was served, so it is what was attempted.
const item = readFolderBanks(dir).items.find((it) => it.label === label);
if (item && goalFlag) die(`${label} is a bank question, which names its own goals; --goal is for a question set live.`);
if (!item && !goalFlag) die(`${label} is not a bank question in ${dir}. For a question set live, name its goal with --goal.`);

const ids = readIds(dir);
const goalIds = item ? item.goals : [goalFlag];
if (!goalIds.length) die(`${label} names no goal, which is a fault in the bank; nothing can be ruled.`);
for (const g of casesFlag.keys())
  if (!goalIds.includes(g)) die(`--cases names ${g}, which ${label} does not credit (${goalIds.join(', ')}).`);

const entries = goalIds.map((id) => {
  const goal = ids.get(id);
  if (!goal) die(`${id} is not in ${dir}/goals.md.`);
  if (goal.problems.length) die(`${id} can't be ruled on until its goals.md entry is fixed:\n  ${goal.problems.join('\n  ')}`);
  if (!goal.criterionText) die(`${id} has no criterion in goals.md, so there is nothing to rule against.`);
  const entry = { goal: id, criterion: goal.criterionText };
  if (!goal.cases.length) {
    if (casesFlag.has(id)) die(`${id} has no cases, so --cases does not apply to it.`);
    return entry;
  }
  // The bank's own list wins; --cases is for a question that has none.
  const listed = item?.cases?.[id] ?? [];
  if (listed.length && casesFlag.has(id)) die(`${label} already lists its cases for ${id}; --cases is for a question that lists none.`);
  const named = listed.length ? listed : casesFlag.get(id) ?? [];
  if (!named.length) {
    die(
      `${id} has cases, and nothing says which this question exercises. Name them with ` +
        `--cases ${id}:<case>,<case> (cases are: ${goal.cases.map((c) => c.id).join(', ')}).`
    );
  }
  entry.cases = named.map((c) => {
    const found = goal.cases.find((x) => x.id === c);
    if (!found) die(`${c} is not a case of ${id}; cases are: ${goal.cases.map((x) => x.id).join(', ')}.`);
    return found;
  });
  return entry;
});

// The shapes study-judge reads: one goal as `goal` and `criterion`, several as `goals`.
const head = entries.length === 1 ? { ...entries[0], label } : { goals: entries, label };
const out = [JSON.stringify(head)];
if (item) out.push('--- question ---', learnerText(item), '--- rubric ---', keyText(item));
console.log(out.join('\n'));
