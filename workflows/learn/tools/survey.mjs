// Where every topic stands, worked out from the files.
//
//   node workflows/learn/tools/survey.mjs --dir <d>                  every topic, as JSON
//   node workflows/learn/tools/survey.mjs --dir <d> <topic-folder>   one topic, as JSON
//   node workflows/learn/tools/survey.mjs --dir <d> --report         every topic, for a person
//
// <d> is the directory holding the topic folders — see lib/workdir.mjs for why it
// is an argument and not derived from where this file happens to live.
//
// NOTHING STORES ANY OF THIS. The phase, what is met, the group fractions and when a topic was
// last touched are all derived — from goals.md's entries, activities.md's live entries, and
// evidence/attempts.jsonl. There is no table to disagree with, and no cache to go stale. Ask
// this instead of looking for a number in a file.
//
// What it can't derive it folds out of the other log: evidence/status.jsonl, which says what is
// outstanding and whether the learner is needed for it. Nobody can compute a decision to give a
// topic up, or a judgement that a criterion can't be checked by anything constructible.
//
// THIS IS ALSO WHERE A LEARNER READS WHERE THEY STAND. progress.md is gone, so `--report` is
// the answer to "show me where I am" — and it is a better answer than a file, because it
// cannot be stale.
//
// IT NAMES NO RUNG. What a goal has done is how many attempts it has had and how the most
// recent one was ruled — generic across any bar, which the four rungs were not. Within each
// group, what is left comes first.

import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { surveyTopic } from './lib/topic.mjs';
import { takeDir } from './lib/workdir.mjs';

const USAGE = 'node workflows/learn/tools/survey.mjs --dir <learning-topics> [<topic-folder>] [--report]';
const { dir: learning, rest: argv } = takeDir(process.argv.slice(2), USAGE);
const report = argv.includes('--report');
const target = argv.find((a) => !a.startsWith('--'));

function topicFolders() {
  if (!existsSync(learning)) return [];
  return readdirSync(learning)
    .map((name) => join(learning, name))
    .filter((p) => statSync(p).isDirectory())
    .sort();
}

const folders = target ? [target] : topicFolders();

if (target && !existsSync(target)) {
  console.error(`${target} does not exist.`);
  process.exit(1);
}

const surveys = folders.map(surveyTopic);

if (!report) {
  console.log(JSON.stringify(target ? surveys[0] : surveys, null, 2));
  process.exit(0);
}

// --- the printed form --------------------------------------------------------
// For a person reading it, not an agent parsing it. Ordered so the thing you most often want —
// what is waiting on somebody — is nearest.

if (!surveys.length) {
  console.log('No topics yet. learning/ is empty.');
  process.exit(0);
}

const name = (dir) => dir.split('/').pop();

for (const s of surveys) {
  console.log(`\n${name(s.dir)}  —  ${s.phase}`);

  // A retired topic is compressed to why and how far. Its outstanding goals aren't outstanding
  // — they were given up, and listing them as work invites someone to offer it. How far it got
  // still shows: retired with everything met and retired with nothing attempted are different
  // facts about a person.
  if (s.retired) {
    console.log(`  ${s.retired}`);
    console.log(`  last touched: ${s.lastTouched ?? 'never'}`);
    const counts = s.groups.map((g) => `${g.name} ${g.met}/${g.total}`).join('  ·  ');
    if (counts) console.log(`  ${counts}`);
    if (s.problems.length) console.log(`  PROBLEMS: ${s.problems.join('; ')}`);
    continue;
  }

  console.log(`  last touched: ${s.lastTouched ?? 'never'}`);

  // One width across the whole topic, so the columns line up between groups — both the id
  // column and the tick, which is why the lines are built before any of them is printed.
  const width = Math.max(0, ...s.groups.flatMap((g) => g.goals.map((x) => x.id.length)));
  const render = (goal) => `    ${goal.id.padEnd(width)}  ${goal.last}`;
  const tick = Math.max(0, ...s.groups.flatMap((g) => g.goals.map((x) => render(x).length))) + 2;

  // A RETIRED GOAL IS NEITHER OUTSTANDING NOR AN ACHIEVEMENT. It prints last within its group,
  // marked with the learner's own reason, and it is in neither half of the group's fraction —
  // a goal you abandoned is not a goal you failed. How far it got still shows, because the
  // attempt log is untouched and the row is derived from it like any other.
  for (const group of s.groups) {
    console.log(`\n  ${group.name} ${group.met}/${group.total}`);
    for (const goal of group.goals) {
      if (goal.retired) {
        console.log(`${render(goal).padEnd(tick)}retired — ${goal.retired}`);
        continue;
      }
      console.log(goal.met ? `${render(goal).padEnd(tick)}✓` : render(goal));
    }
  }

  // The work queue, split by who has to act. The learner's half is printed second, nearest the
  // problems line, because it is the half that only moves when they are sitting here.
  const waiting = (needs) => s.outstanding.filter((o) => o.needs === needs);
  const printWaiting = (heading, items) => {
    if (!items.length) return;
    console.log(`\n  ${heading}`);
    for (const o of items) console.log(`    ${o.goal}${o.why ? ` — ${o.why}` : ''}  (${o.since})`);
  };
  printWaiting('waiting on curation:', waiting('curation'));
  printWaiting('waiting on you:', waiting('goal-setting'));

  // Malformed ids and slot values nothing implements are rare and always worth acting on, so
  // they print last, where the eye stops. Nothing else in the workflow catches them until an
  // attempt is recorded against one, which record-attempt.mjs then refuses.
  if (s.problems.length) {
    console.log('\n  PROBLEMS:');
    for (const p of s.problems) console.log(`    ${p}`);
  }
}

console.log('');
