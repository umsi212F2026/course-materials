// Choose the next bank question to serve and lay out what is printed for it: the header lines, what
// the learner sees, and the key. next-item.mjs prints them; answer.mjs serves the next question
// after recording an attempt, so the choosing lives here and both reproduce the same text.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readFolderBanks } from '../../../quiz/tools/lib/bank.mjs';
import { readLog, readGoals, liveActivities, statusOf } from './topic.mjs';
import { pick, stillNeeded, rankByCase } from './pick.mjs';
import { met } from './bars.mjs';
import { learnerText, keyText, hasOpenPart, criterionText, RULING } from './item.mjs';

// NULL MEANS THE BANK HAS NOTHING FOR THIS, which next-item.mjs reports as exit 2.
export function serveNext(dir, { goal, activity, after, review }) {
  const { items } = readFolderBanks(dir);

  // ONLY A LIVE ACTIVITY'S QUESTIONS ARE SERVED, once the topic has an activities.md at all. A
  // dropped entry stays in the file as curation's feedback, but the learner is not to meet it. A
  // folder with no entry is an orphan: it has no tutor method, no offer and no generator behind
  // it, so the tutor would be serving a question it cannot teach from, and every route to one is
  // a mistake (survey reports it, see idProblems). Without activities.md curation has not run,
  // there is nothing to be live or orphaned against, and banks are served as before.
  const hasEntries = existsSync(join(dir, 'activities.md'));
  const live = new Set(liveActivities(dir).map((e) => e.id));
  // WHAT IS STILL TO SHOW comes from the goals and the log, the same reading `met` gives survey and
  // progress, so the picker and the progress view never disagree about which cases are passed.
  const log = readLog(dir);
  const goalsById = new Map(readGoals(dir).goals.map((g) => [g.id, g]));
  const attemptsByGoal = new Map();
  for (const r of log) {
    if (!attemptsByGoal.has(r.goal)) attemptsByGoal.set(r.goal, []);
    attemptsByGoal.get(r.goal).push(r);
  }
  // A DEFERRED OR RETIRED GOAL WANTS NOTHING HERE, the topic retired included, so it is set aside:
  // no question is needed for it, and it counts as done. A GOAL WHOSE ENTRY HAS A PROBLEM IS NOT
  // MET, whatever its attempts say, the same as survey: it is frozen until goals.md is fixed.
  const status = statusOf(dir);
  const setAside = new Set(
    [...goalsById.keys()].filter((id) => status.retired !== null || status.retiredGoals.has(id) || status.deferredGoals.has(id))
  );
  const done = (id) => {
    const goal = goalsById.get(id);
    if (!goal) return false;
    return setAside.has(id) || (!goal.problems.length && met(goal, attemptsByGoal.get(id) ?? []));
  };
  const result = pick(hasEntries ? items.filter((it) => live.has(it.activity)) : items, log, {
    goal,
    activity,
    after,
    review: !!review,
    needed: (it) => stillNeeded(it, goalsById, attemptsByGoal, setAside),
    caseRank: rankByCase(goalsById.get(goal), attemptsByGoal.get(goal) ?? [], { review: !!review }),
    done,
  });
  if (!result) return null;

  const { item, repeat, lastServed, keepsOrder } = result;
  // A SCENARIO'S FRAMING IS PRINTED HERE, ABOVE THE FIRST QUESTION SERVED FROM IT, and this script
  // decides that rather than the tutor: it holds the label and --after, so the rule lives in one
  // place. --after in the same scenario means the run has been introduced already. A review sitting
  // re-attempts one question cold, as a draw does, so it never gets framing. learnerText leaves it
  // out, which is what keeps it from judge-input.mjs: the framing carries no fact an answer needs.
  const [afterActivity, afterScenario] = (after ?? '').split('/');
  const continuing = afterActivity === item.activity && afterScenario === item.scenario;
  const framing = item.framing && !review && !continuing ? [item.framing, ''] : [];
  const header = [
    `label: ${item.label}`,
    `goals: ${item.goals.join(', ')}`,
    `tags: ${item.tags?.length ? item.tags.join(', ') : 'none'}`,
    // ONE LINE PER GOAL THE QUESTION GIVES CASES FOR, so the tutor passes them to record-attempt --cases.
    ...Object.entries(item.cases ?? {})
      .filter(([, c]) => c.length)
      .map(([g, c]) => `cases: ${g}: ${c.join(', ')}`),
    `repeat: ${repeat ? `yes (last served ${lastServed.slice(0, 10)})` : 'no'}`,
    // SERVED IN PLACE OF THIS GOAL'S QUESTION, which waits behind it; see lib/pick.mjs. It may name
    // another goal, and the tutor records an attempt per goal it names, as for any question.
    ...(keepsOrder ? [`served first: keeps ${keepsOrder} in order`] : []),
  ];
  // AN OPEN QUESTION'S KEY ENDS WITH THE CRITERION AND THE RULING RULES, because the tutor rules
  // the answer itself and needs both beside the key. An mcq-only question has nothing to rule.
  const key = [keyText(item), ...(hasOpenPart(item) ? [criterionText(dir, item), RULING] : [])].join('\n');
  return { item, header, learner: [...framing, learnerText(item)].join('\n'), key };
}
