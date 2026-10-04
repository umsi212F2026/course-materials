// Choose which bank question the tutor serves next.
//
// UNSEEN FIRST. A learner who has met a question has, at best, a memory of its answer; one they
// have not met tests the goal. So a never-served question always beats a served one.
//
// LONGEST AGO AMONG THE SERVED. Once the bank is exhausted for this goal, the question least
// likely to be remembered is the one served longest ago, so repeats do the most work.
//
// KEYED ON LABEL, NEVER ON ID. Question ids repeat across scenarios by design; the label
// (`<activity>/<scenario>/<question>`) is the only name that is unique.
//
// OLD LABELS ARE IGNORED. The attempt log also holds lines whose label names a question that
// has since been removed, or a free-text catch such as `CATCH: subject/verb agreement`. Only
// labels that match a candidate count, so those cannot make anything look served.
//
// CASES STILL TO SHOW COME FIRST, when the goal names cases (`caseRank`, lower is preferred). In
// study that is a question exercising a case not yet passed; in review, the one whose least
// recently passed case passed longest ago, so successive reviews rotate through the cases. It
// ranks before the rules above, and without cases every item ranks 0 and they decide alone.
//
// SCENARIO ORDER, IN STUDY ONLY. A later question in a scenario may give away an earlier one's
// answer, so an item waits while an earlier question in its scenario (bank order, every bank
// item, not just this goal's) has never been served and is still `needed`. One no longer needed
// is skipped for good, which is why its answer may then be given away. A question carrying
// another goal's undemonstrated case is still needed, so this goal's later question waits
// behind it rather than spoil it. Review has seen every question already and keeps no order.
//
// TIES go to the same `<activity>/<scenario>` as the question just served (`after`), so a
// scenario's setup is read once rather than re-read for every question, then to bank order.

import { met, casePasses } from './bars.mjs';

const group = (label) => label.split('/').slice(0, 2).join('/');

// Whether serving this question could still show anything: false when each goal it names is met,
// or has every case the question lists for it already passed. A question listing no case for a
// goal with cases (a bank written before the cases were) is needed while that goal is unmet. A
// goal the topic does not define cannot be shown met, so it keeps the question needed.
export function stillNeeded(item, goalsById, attemptsByGoal) {
  return item.goals.some((id) => {
    const goal = goalsById.get(id);
    if (!goal) return true;
    const attempts = attemptsByGoal.get(id) ?? [];
    if (met(goal, attempts)) return false;
    const listed = item.cases?.[id] ?? [];
    const passes = casePasses(goal, attempts);
    return !passes || !listed.length || listed.some((c) => !passes[c]?.passed);
  });
}

// The `caseRank` for one goal: in study 0 for a question exercising a case not yet passed, else
// 1; in review the latest pass of its least recently passed case. A question listing no case for
// the goal exercises every case, as its attempts are counted. A goal without cases ranks all 0.
export function rankByCase(goal, attempts, { review = false } = {}) {
  const passes = goal ? casePasses(goal, attempts) : null;
  if (!passes) return () => 0;
  return (item) => {
    const listed = item.cases?.[goal.id]?.length ? item.cases[goal.id] : Object.keys(passes);
    const known = listed.filter((c) => passes[c]);
    if (review) return Math.min(...known.map((c) => passes[c].at));
    return known.some((c) => !passes[c].passed) ? 0 : 1;
  };
}

export function pick(items, log, { goal, activity, after, review = false, needed = () => true, caseRank = () => 0 } = {}) {
  const served = new Set(log.map((line) => line.label));
  // In study an item waits behind any earlier unserved, still-needed question in its scenario.
  const waiting = new Set();
  if (!review) {
    const open = new Set();
    for (const it of items) {
      const g = group(it.label);
      if (open.has(g)) waiting.add(it);
      else if (!served.has(it.label) && needed(it)) open.add(g);
    }
  }
  const candidates = items.filter((it) => !waiting.has(it) && (goal ? it.goals.includes(goal) : it.activity === activity));
  if (!candidates.length) return null;

  const latest = new Map();
  for (const line of log) {
    // An `at` that does not parse is skipped like a missing one, or NaN would scramble the sort.
    if (typeof line.label !== 'string' || typeof line.at !== 'string' || Number.isNaN(Date.parse(line.at))) continue;
    const prev = latest.get(line.label);
    if (prev === undefined || Date.parse(line.at) > Date.parse(prev)) latest.set(line.label, line.at);
  }

  const afterGroup = after ? group(after) : null;
  const ranked = candidates
    .map((item, order) => ({ item, order, rank: caseRank(item), at: latest.get(item.label) ?? null }))
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank < b.rank ? -1 : 1;
      if ((a.at === null) !== (b.at === null)) return a.at === null ? -1 : 1;
      if (a.at !== null && Date.parse(a.at) !== Date.parse(b.at)) return Date.parse(a.at) - Date.parse(b.at);
      const ag = afterGroup && group(a.item.label) === afterGroup;
      const bg = afterGroup && group(b.item.label) === afterGroup;
      if (ag !== bg) return ag ? -1 : 1;
      return a.order - b.order;
    });

  const best = ranked[0];
  return { item: best.item, repeat: best.at !== null, lastServed: best.at };
}
