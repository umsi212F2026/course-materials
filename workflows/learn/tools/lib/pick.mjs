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
// GOAL-LESS LAST. A question whose goals line is empty is practice: it records nothing, so it is
// only worth serving when no goal-bearing question is on offer. Among themselves, goal-less
// items follow the same rules as everything else.
//
// TIES go to the same `<activity>/<scenario>` as the question just served (`after`), so a
// scenario's setup is read once rather than re-read for every question, then to bank order.

const group = (label) => label.split('/').slice(0, 2).join('/');

export function pick(items, log, { goal, activity, after } = {}) {
  const candidates = items.filter((it) => (goal ? it.goals.includes(goal) : it.activity === activity));
  if (!candidates.length) return null;

  const latest = new Map();
  for (const line of log) {
    if (typeof line.label !== 'string' || typeof line.at !== 'string') continue;
    const prev = latest.get(line.label);
    if (prev === undefined || Date.parse(line.at) > Date.parse(prev)) latest.set(line.label, line.at);
  }

  const afterGroup = after ? group(after) : null;
  const ranked = candidates
    .map((item, order) => ({ item, order, at: latest.get(item.label) ?? null }))
    .sort((a, b) => {
      if ((a.item.goals.length === 0) !== (b.item.goals.length === 0)) return a.item.goals.length === 0 ? 1 : -1;
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
