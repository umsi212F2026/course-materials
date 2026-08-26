// Everything that reads a topic folder and works out what it means.
//
// One module because the rules in here are the ones that must not be implemented twice.
// record-attempt.mjs, survey.mjs, served.mjs and review-due.mjs all need some of them, and a
// second copy of the met rule is a second answer to "has this been learned".
//
// What one attempt established, and what an accumulation makes true, is next door in bars.mjs.
// What a goal may carry is in slots.mjs. This file is the parser and the roll-up.
//
// NOTHING HERE WRITES. Callers do that.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { applySlots, isRequired, suppliesItsOwn, DEFAULT_GROUP } from './slots.mjs';
import { met, describeAttempts } from './bars.mjs';
import { readStatus, foldStatus } from './status.mjs';

// --- what a log line looks like ----------------------------------------------
// One JSON object per line in evidence/attempts.jsonl, appended and never rewritten.
//
//   at          ISO timestamp
//   goal        the id from goals.md — a capability, a word, an orientation, all the same here
//   label       what the supply served, in the supply's own words. OPAQUE: nothing but the
//               supply that wrote it may parse it, which is what makes free-form safe. For the
//               curated supply it happens to be the activity id, and a bank item after a slash
//   tags        from the system-wide closed set in slots.mjs. The one structured thing a supply
//               returns, and the only part of what it served that `bar` may read
//   source      study | review | scan
//   unaided     yes | no | unclear                        \  the adjudicator's two axes,
//   criterion   met | not met | unclear | unchecked        /  passed through raw
//   outcome     abandoned | declared — the caller's own observation, when there was no attempt
//               to rule on or the learner asserted it themselves. Exclusive with the two axes
//   note        optional free text, e.g. why they stopped
//
// THE AXES ARE STORED RAW AND NEVER COLLAPSED ON THE WAY IN. What reads a verdict back out —
// the bars and the scheduler, both in bars.mjs — reads the axes directly. A collapsed word
// written at record time would be a cached derivation, which is the thing this workflow keeps
// taking back out.

export function readLog(dir) {
  const file = join(dir, 'evidence', 'attempts.jsonl');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l, i) => {
      try {
        return JSON.parse(l);
      } catch {
        throw new Error(`${file} line ${i + 1} is not JSON. Nothing hand-edits this file.`);
      }
    });
}

// --- reading entries ---------------------------------------------------------
// goals.md and activities.md have one shape for one kind of thing: `### <id>`, then a bullet
// per field. Two tables became one list when orientation became a goal — a third kind would
// have needed a third table, which settled it.
//
// A `|` inside a value is now just a character, and a header row can't desynchronize from its
// separator, because there is no longer either of those things.

// Trim before stripping the backticks, not after: a comma-separated list writes `` `a`, `b` ``
// and the second value arrives with a leading space, which anchored patterns then miss.
const unquote = (s) => s.trim().replace(/^`|`$/g, '').trim();

function section(text, heading) {
  const m = text.match(heading);
  if (!m) return '';
  const rest = text.slice(m.index + m[0].length);
  const next = rest.search(/^##\s/m);
  return next === -1 ? rest : rest.slice(0, next);
}

// A bullet may wrap. A continuation is an indented line with no bullet marker; a blank line
// ends the field. Anything not matching either is left alone — an entry may carry prose.
function bulletFields(body) {
  const fields = {};
  let current = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*-\s*\*\*([^*:]+):\*\*\s*(.*)$/);
    if (m) {
      current = m[1].trim();
      fields[current] = m[2].trim();
      continue;
    }
    if (!line.trim()) {
      current = null;
      continue;
    }
    if (current && /^\s+\S/.test(line)) {
      fields[current] = `${fields[current]} ${line.trim()}`.trim();
      continue;
    }
    current = null;
  }
  return fields;
}

// Every `### <id>` block in the given text, as { id, fields }. The template's placeholder
// headings — `<activity-id>` and friends — are skipped: they are layout, not content.
function entries(text) {
  const clean = text.replace(/<!--[\s\S]*?-->/g, '');
  const found = [];
  for (const part of clean.split(/^###\s+/m).slice(1)) {
    const id = unquote(part.split('\n')[0].trim());
    if (!id || id.startsWith('<')) continue;
    found.push({ id, fields: bulletFields(part.slice(part.indexOf('\n') + 1)) });
  }
  return found;
}

const listField = (value) =>
  (value ?? '')
    .split(',')
    .map((s) => unquote(s))
    .filter(Boolean);

// --- goals.md ----------------------------------------------------------------
// The only place an id is assigned. ONE LIST, whatever kind of goal it is — a capability, a
// word and an orientation reach everything downstream through one code path, and what differs
// between them is which slots they carry.
//
// The `c-` / `w-` / `o-` prefix is a reading aid and nothing decides anything from it. What is
// checked, in idProblems, is that a goal id doesn't start with `a-`: a log line used to carry
// a goal id and an activity id side by side, and keeping the two namespaces visibly apart is
// still worth the one rule.

const GOALS_HEADING = /^##\s+Goals\s*$/m;

export function readGoals(dir) {
  const file = join(dir, 'goals.md');
  if (!existsSync(file)) return { goals: [] };
  const text = readFileSync(file, 'utf8');
  return { goals: entries(section(text, GOALS_HEADING)).map((e) => applySlots(e.id, e.fields)) };
}

// Every goal in the topic, keyed by id.
export function readIds(dir) {
  const byId = new Map();
  for (const goal of readGoals(dir).goals) byId.set(goal.id, goal);
  return byId;
}

// --- activities.md -----------------------------------------------------------
// Three questions are asked of this file here: which entries are live, which goal each one
// serves or checks, and which were stamped by curation rather than written by it. Everything
// else about an entry is for a tutor to read, not a program.
//
// A dropped entry stays in the file — that field is the only feedback curation ever gets — so
// "live" means present and not dropped, never merely present.
//
// `origin: generated` marks an entry curation stamped for a goal whose supply produces its own
// activities. verify and critique skip those: there is no artifact to confirm and no menu to
// judge, and dropping one would take the goal's only entry with it.

export function readActivities(dir) {
  const file = join(dir, 'activities.md');
  if (!existsSync(file)) return [];
  return entries(readFileSync(file, 'utf8')).map(({ id, fields }) => ({
    id,
    serves: listField(fields.serves),
    checks: listField(fields.checks),
    origin: fields.origin ?? '',
    generated: /^generated\b/i.test(fields.origin ?? ''),
    status: fields.status ?? '',
    dropped: /^dropped\b/i.test(fields.status ?? ''),
  }));
}

export const liveActivities = (dir) => readActivities(dir).filter((e) => !e.dropped);

// --- the lifecycle log -------------------------------------------------------
// evidence/status.jsonl, folded. Its shape and the fold are in status.mjs; this is where the
// rest of the system asks. progress.md is gone and both of these used to be read out of it.

export const statusOf = (dir) => foldStatus(readStatus(dir));

// Retiring is the one fact about where a topic stands that no fold over evidence can produce —
// nobody can compute a decision to stop. Reviving is a second event, not a deletion.
export const isRetired = (dir) => statusOf(dir).retired;

// THE TOPIC IS RETIRED, OR THIS GOAL IS. One function rather than an invariant every consumer
// has to remember: ask this before offering a learner a goal, whatever the reason you were
// going to offer it for.
//
// Both halves, because a consumer that consulted the goal map alone would see live goals
// inside a retired topic and have nothing to tell it that was wrong. TOPIC RETIREMENT IS NOT
// STAMPED ONTO GOALS to get the same effect — `review-due.mjs` already skips the whole folder,
// so the promise holds without it, and stamping would leave a revival guessing about words the
// learner had separately given up.
export const isGoalRetired = (dir, goalId) => {
  const status = statusOf(dir);
  return Boolean(status.retired) || status.retiredGoals.has(goalId);
};

// --- what has been served ----------------------------------------------------
// The labels this goal has already been given, most recent first, unmodified.
//
// A label is a private channel between a supply and its future self: it wrote the string, it
// is the only thing that reads it, and the worst case if it repeats itself is "repeats
// sometimes" rather than a wrong claim about learning. So this returns them and does nothing
// else — no parsing, no grouping, no interpretation.
//
// Recomputed rather than cached. A generator's labels grow for as long as the goal keeps coming
// back in review, which is not a thing that fits in a cell.

export function served(dir, goal) {
  return readLog(dir)
    .filter((r) => r.goal === goal)
    .reverse()
    .map((r) => r.label)
    .filter(Boolean);
}

export function attemptsFor(dir, goal) {
  return readLog(dir).filter((r) => r.goal === goal);
}

// --- the whole picture of one topic ------------------------------------------
// What survey.mjs reports and review-due.mjs filters. Derived every time, stored nowhere.

// Five phases, and `in review` is deliberately not one of them: a goal enters review the moment
// it is met, while the rest of the topic is still being studied, so a topic is routinely both.
export function derivePhase({ retired, goals, live, rows }) {
  if (retired) return 'retired';

  // GOAL SETTING HASN'T HAPPENED. The absence of any goal in the default group is what says so
  // — it is the state add-topic leaves, with a word list and nothing else. The orientation
  // entry the template ships is in its own group and doesn't count towards this.
  if (!goals.some((g) => g.group === DEFAULT_GROUP)) return 'not started';

  // Before asking whether curation has anything to offer, ask whether anything still needs
  // offering. A topic that is finished but whose entries were all dropped is done, not waiting
  // on curation — and curation would have nothing to generate for it.
  //
  // REQUIRED goals only. An orientation nobody bothered with doesn't hold a topic open.
  //
  // AND NOT THE RETIRED ONES, or a topic could never finish once a goal was given up. Note
  // `is_required: no` does not already cover this: that says the goal never blocked completion,
  // which is a different claim from the learner having stopped wanting it.
  if (rows.filter((r) => isRequired(r) && !r.retired).every((r) => r.met)) return 'nothing pending';

  if (goals.length && !live.length) return 'in curation';

  return 'studying';
}

// Groups exist because goals name them. No declaration, no properties, no report strategy —
// the name is the label and the report is always count-then-list. Default group first, then
// others in order of first appearance.
function groupRows(rows) {
  const order = [];
  const byName = new Map();
  for (const row of rows) {
    if (!byName.has(row.group)) {
      byName.set(row.group, []);
      order.push(row.group);
    }
    byName.get(row.group).push(row);
  }
  order.sort((a, b) => (b === DEFAULT_GROUP) - (a === DEFAULT_GROUP));
  return order.map((name) => {
    const goals = byName.get(name);
    const active = goals.filter((g) => !g.retired);
    return {
      name,
      // A RETIRED GOAL LEAVES BOTH HALVES OF THE FRACTION. `vocabulary 7/12` with one given up
      // is `7/11`, not `7/12` with an unreachable twelfth. A GOAL YOU ABANDONED IS NOT A GOAL
      // YOU FAILED, and a denominator that keeps counting it says otherwise every time the
      // learner looks. It also makes the fraction reachable again: `11/11` is attainable,
      // `11/12` where the twelfth never can be is a number that can only ever disappoint.
      met: active.filter((g) => g.met).length,
      total: active.length,
      // UNMET FIRST, THEN MET, THEN RETIRED. Everything is listed — seeing the finished ones is
      // half of what a progress report is for — but what is left comes first, where someone
      // deciding what to do next will look. The retired ones are neither outstanding nor
      // achievements, so they go last. Original order within each part.
      goals: [
        ...active.filter((g) => !g.met),
        ...active.filter((g) => g.met),
        ...goals.filter((g) => g.retired),
      ],
    };
  });
}

export function surveyTopic(dir) {
  const { goals } = readGoals(dir);
  const log = readLog(dir);
  const live = liveActivities(dir);
  const status = statusOf(dir);
  const retired = status.retired;

  const rows = goals.map((goal) => {
    const attempts = log.filter((r) => r.goal === goal.id);
    return {
      id: goal.id,
      text: goal.text,
      group: goal.group,
      is_required: goal.is_required,
      // The learner's own words, or null. GOAL-SCOPED ONLY — a retired topic keeps its goals'
      // rows intact, so `retired with everything met` and `retired with nothing attempted` stay
      // different facts about a person. `isGoalRetired` is where the two scopes are ORed, for
      // consumers deciding whether to offer something.
      retired: status.retiredGoals.get(goal.id) ?? null,
      // ONE CODE PATH, no branch on what kind of goal it is. The dispatch is on its own `bar`.
      met: goal.problems.length ? false : met(goal, attempts),
      attempts: attempts.length,
      last: describeAttempts(attempts),
    };
  });

  return {
    dir,
    phase: derivePhase({ retired, goals, live, rows }),
    retired,
    groups: groupRows(rows),
    lastTouched: log.length ? log[log.length - 1].at.slice(0, 10) : null,
    // What is waiting, and whether the learner is needed for it. `learn` splits on `needs`:
    // `curation` is agent-only and gets spawned in the background, `goal-setting` goes on the
    // menu. That split used to be inferred from file states and is now read off the queue.
    //
    // A RETIRED GOAL'S ITEM IS NOT WAITING ON ANYBODY. A word blocked for goal setting and then
    // given up would otherwise keep being raised as a decision the learner owes, which is the
    // opposite of what they said. Filtered rather than cleared: the `blocked` line stays in the
    // log, so reviving the goal brings its item back with its own `why` intact.
    outstanding: status.outstanding.filter((o) => !status.retiredGoals.has(o.goal)),
    problems: idProblems(dir, status),
  };
}

// D12: nothing checks an id at the moment an agent writes it, so a duplicate or a misfiled
// prefix would otherwise surface only when someone recorded an attempt against it — weeks
// later, mid-session. Survey already walks every topic, so it reports them where someone is
// already looking.
//
// It reports slot refusals the same way, and for the same reason: a goal carrying a value
// nothing implements is a goal nobody can record an attempt against, and record-attempt.mjs
// refuses it there rather than writing a line about a goal it can't derive anything from.
export function idProblems(dir, status = statusOf(dir)) {
  const { goals } = readGoals(dir);
  const found = [];
  const seen = new Map();

  for (const goal of goals) {
    if (!goal.id) {
      found.push(`a goal has no id: "${goal.text}"`);
      continue;
    }
    if (seen.has(goal.id)) found.push(`${goal.id} is used twice`);
    seen.set(goal.id, goal);

    if (goal.id.startsWith('a-'))
      found.push(`goal ${goal.id} starts with a-, which is activities.md's namespace`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(goal.id))
      found.push(`goal ${goal.id} isn't an id — lower case, single hyphens between words`);

    found.push(...goal.problems);
  }

  for (const entry of readActivities(dir)) {
    if (seen.has(entry.id)) found.push(`${entry.id} is both an activity and a goal`);
    if (!entry.id.startsWith('a-')) found.push(`activity ${entry.id} doesn't start with a-`);
    for (const id of [...entry.serves, ...entry.checks])
      if (id !== 'all' && !seen.has(id))
        found.push(`${entry.id} names ${id}, which is not in goals.md`);

    // A stamp is for a goal whose supply produces its own activities. On any other goal it is
    // a candidate nobody can run: the tutor would go looking for an instruction that the entry
    // doesn't carry and no supply is going to return.
    if (entry.generated)
      for (const id of entry.checks)
        if (seen.has(id) && !suppliesItsOwn(seen.get(id)))
          found.push(
            `${entry.id} is marked origin: generated, but ${id} has no supply that produces its own activities`
          );
  }

  // The content files and the lifecycle queue can diverge, and the mitigation is that the
  // disagreement is reportable rather than silent. Hand-add a goal to goals.md, no `goal-added`
  // event fires, and the work never queues — nothing would ever curate it and nothing would say
  // why. See lib/status.mjs.
  if (!status.created) {
    found.push(`no evidence/status.jsonl — this folder was never recorded as a topic`);
  } else {
    for (const goal of goals)
      if (goal.id && !status.announced.has(goal.id))
        found.push(`${goal.id} is in goals.md with no goal-added event — nothing will curate it`);
  }

  // The log points at goals; goals.md is where they are. A line naming an id that isn't there
  // means an id was renamed and took a learner's evidence with it, which the goal then
  // re-derives as not started. Nothing enforces permanence at write time, so it is reported
  // here — where survey is already walking every topic.
  const orphans = new Set(readLog(dir).map((r) => r.goal).filter((id) => id && !seen.has(id)));
  for (const id of orphans)
    found.push(`attempts.jsonl records ${id}, which is not in goals.md — a renamed or deleted id`);

  return found;
}
