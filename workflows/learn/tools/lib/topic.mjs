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

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { applySlots, ORIGINS, isRequired, DEFAULT_GROUP } from './slots.mjs';
import { met, describeAttempts } from './bars.mjs';
import { readStatus, foldStatus } from './status.mjs';
import { readFolderBanks } from '../../../quiz/tools/lib/bank.mjs';

// --- what a log line looks like ----------------------------------------------
// One JSON object per line in evidence/attempts.jsonl, appended and never rewritten.
//
//   at          ISO timestamp
//   goal        the id from goals.md — a capability, a word, an orientation, all the same here
//   label       what the activity served, in its own words. OPAQUE: nothing but the activity
//               that wrote it may parse it, which is what makes free-form safe. For a banked
//               question it is the question's path, which the picker matches; for an activity
//               run without a bank, the entry id; for a vocabulary move set live, the move
//   tags        from the system-wide closed set in slots.mjs. The one structured thing an
//               activity returns, and the only part of what it served that `bar` may read
//   source      study | review | scan
//   unaided     yes | no | unclear                        \  the adjudicator's two axes,
//   criterion   met | not met | unclear | unchecked        /  passed through raw
//   outcome     abandoned | declared | elsewhere: the caller's own observation, when there was
//               no attempt to rule on or the learner asserted it themselves. Exclusive with
//               the two axes
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

// ORIGIN IS SET ONCE FOR THE TOPIC, in a `**origin:** course` line between the title and
// `## Goals`, and each goal inherits it unless it writes its own. Whether the goal wrote one is
// read off the raw fields, because applySlots fills the default in and then "absent" and
// "wrote learner" look the same. An unknown header value reads as `learner`, the safe
// direction, and idProblems reports it. Comments are stripped first, as entries() does, so a
// line in the template's guidance comment is not read as the header. A line that starts
// `**origin:**` but isn't one word is returned as `malformed`, so idProblems can say so
// instead of the topic silently reading as learner.
function headerOrigin(text) {
  const at = text.search(GOALS_HEADING);
  const head = (at === -1 ? text : text.slice(0, at)).replace(/<!--[\s\S]*?-->/g, '');
  const m = head.match(/^\*\*origin:\*\*\s*(\S+)\s*$/m);
  if (m) return { value: m[1], malformed: null };
  const bad = head.match(/^\*\*origin:\*\*.*$/m);
  return { value: null, malformed: bad ? bad[0].trim() : null };
}

export function readGoals(dir) {
  const file = join(dir, 'goals.md');
  if (!existsSync(file)) return { goals: [], origin: 'learner' };
  const text = readFileSync(file, 'utf8');
  const { value: written, malformed } = headerOrigin(text);
  const origin = written && Object.hasOwn(ORIGINS, written) ? written : 'learner';
  const goals = entries(section(text, GOALS_HEADING)).map((e) => {
    const goal = applySlots(e.id, e.fields);
    if (!e.fields.origin) goal.origin = origin;
    return goal;
  });
  return { goals, origin, written, malformed };
}

// Every goal in the topic, keyed by id.
export function readIds(dir) {
  const byId = new Map();
  for (const goal of readGoals(dir).goals) byId.set(goal.id, goal);
  return byId;
}

// --- activities.md -----------------------------------------------------------
// Three questions are asked of this file here: which entries are live, which goal each one
// serves or checks, and which are legacy stamps rather than entries curation wrote. Everything
// else about an entry is for a tutor to read, not a program.
//
// A dropped entry stays in the file — that field is the only feedback curation ever gets — so
// "live" means present and not dropped, never merely present.
//
// `origin: generated` marks a LEGACY stamp, written when a goal's supply produced its own
// activities. The supply is retired and liveActivities skips these.

// A `serves` item `group <name>` is expanded HERE into the ids of every goal in that group, in
// goals.md order, so `serves` is always a list of goal ids and nothing downstream knows the form
// exists. Expanding at read time is the point: a word added to the group later is covered with
// no edit to activities.md. The names written come back as `servesGroups`, which is all
// idProblems needs to report a group nobody is in. Only `serves` takes it; `checks` does not.
const GROUP_ITEM = /^group\s+(\S+)$/;

function expandServes(items, goals) {
  const serves = [];
  const servesGroups = [];
  for (const item of items) {
    const m = item.match(GROUP_ITEM);
    if (!m) {
      serves.push(item);
      continue;
    }
    servesGroups.push(m[1]);
    for (const g of goals) if (g.group === m[1]) serves.push(g.id);
  }
  return { serves, servesGroups };
}

export function readActivities(dir) {
  const file = join(dir, 'activities.md');
  if (!existsSync(file)) return [];
  const { goals } = readGoals(dir);
  return entries(readFileSync(file, 'utf8')).map(({ id, fields }) => ({
    id,
    ...expandServes(listField(fields.serves), goals),
    checks: listField(fields.checks),
    origin: fields.origin ?? '',
    generated: /^generated\b/i.test(fields.origin ?? ''),
    status: fields.status ?? '',
    dropped: /^dropped\b/i.test(fields.status ?? ''),
  }));
}

// LEGACY STAMPS ARE NOT LIVE. An `origin: generated` entry was written for a goal whose supply
// produced its own activities; the supply is retired, so a stamp points at nothing the tutor can
// run. It is skipped everywhere and never reported as an entry (idProblems still reports a stamp
// that names a missing goal), which is also why a topic whose only entries
// for its words are stamps still derives its phase from the entries that are real.
export const liveActivities = (dir) =>
  readActivities(dir).filter((e) => !e.dropped && !e.generated);

// --- the lifecycle log -------------------------------------------------------
// status.jsonl, folded. Its shape and the fold are in status.mjs; this is where the
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
// A label is a private channel between an activity and its future self: it wrote the string, it
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

// Six phases, and `in review` is deliberately not one of them: a goal enters review the moment
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
  const open = rows.filter((r) => isRequired(r) && !r.retired);

  // WAITING ELSEWHERE: all that is left is what the learner said they will learn somewhere else.
  // Nothing here can be studied, but the topic is not finished either, so the tutor's job is to
  // check in. Checked before `nothing pending`, which it would otherwise be mistaken for.
  if (open.every((r) => r.met || r.deferred) && open.some((r) => r.deferred))
    return 'waiting elsewhere';

  if (open.every((r) => r.met)) return 'nothing pending';

  if (goals.length && !live.length) return 'in curation';

  return 'studying';
}

const CAPABILITY_SLUG = /^[a-z0-9]+(-[a-z0-9]+){1,3}$/;

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

    // PARTS OF ONE CAPABILITY, in order of first appearance, by the same rule as the group
    // fraction: a retired part leaves both halves, a deferred one stays in the total. `goals`
    // below is untouched, so everything that reads it sees what it always did.
    const capabilities = [];
    for (const g of active) {
      if (!g.capability) continue;
      let cap = capabilities.find((c) => c.slug === g.capability);
      if (!cap) capabilities.push((cap = { slug: g.capability, met: 0, total: 0 }));
      cap.total++;
      if (g.met) cap.met++;
    }
    return {
      name,
      capabilities,
      // A RETIRED GOAL LEAVES BOTH HALVES OF THE FRACTION. `vocabulary 7/12` with one given up
      // is `7/11`, not `7/12` with an unreachable twelfth. A GOAL YOU ABANDONED IS NOT A GOAL
      // YOU FAILED, and a denominator that keeps counting it says otherwise every time the
      // learner looks. It also makes the fraction reachable again: `11/11` is attainable,
      // `11/12` where the twelfth never can be is a number that can only ever disappoint.
      met: active.filter((g) => g.met).length,
      total: active.length,
      // UNMET FIRST, THEN DEFERRED, THEN MET, THEN RETIRED. Everything is listed (seeing the
      // finished ones is half of what a progress report is for), but what is left comes first,
      // where someone deciding what to do next will look. A deferred goal is not work for this
      // sitting but is not done either, so it sits between the two, and it stays in `total`.
      // The retired ones are neither outstanding nor achievements, so they go last. Original
      // order within each part.
      goals: [
        ...active.filter((g) => !g.met && !g.deferred),
        ...active.filter((g) => g.deferred),
        ...active.filter((g) => g.met),
        ...goals.filter((g) => g.retired),
      ],
    };
  });
}

export function surveyTopic(dir) {
  const { goals, origin } = readGoals(dir);
  const log = readLog(dir);
  const live = liveActivities(dir);
  const status = statusOf(dir);
  const retired = status.retired;

  const rows = goals.map((goal) => {
    const attempts = log.filter((r) => r.goal === goal.id);
    const isMet = goal.problems.length ? false : met(goal, attempts);
    const isRetired = status.retiredGoals.has(goal.id);
    return {
      id: goal.id,
      text: goal.text,
      group: goal.group,
      capability: goal.capability,
      is_required: goal.is_required,
      // The learner's own words, or null. GOAL-SCOPED ONLY — a retired topic keeps its goals'
      // rows intact, so `retired with everything met` and `retired with nothing attempted` stay
      // different facts about a person. `isGoalRetired` is where the two scopes are ORed, for
      // consumers deciding whether to offer something.
      retired: status.retiredGoals.get(goal.id) ?? null,
      // ONE CODE PATH, no branch on what kind of goal it is. The dispatch is on its own `bar`.
      met: isMet,
      // WHERE THE LEARNER SAYS THEY WILL LEARN IT, or null. MET AND RETIRED WIN: a goal that has
      // been passed, or given up, is no longer waiting on anything, whatever the log last said
      // about a deferral.
      deferred: isMet || isRetired ? null : (status.deferredGoals.get(goal.id) ?? null),
      // EVER RESUMED, whatever the goal's state now. The study tutor reads this to tell a goal the
      // learner already chose to do here from one it has not yet offered the first-encounter menu.
      resumed: status.resumedGoals.has(goal.id),
      attempts: attempts.length,
      last: describeAttempts(attempts),
    };
  });

  return {
    dir,
    phase: derivePhase({ retired, goals, live, rows }),
    retired,
    origin,
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
  const { goals, written, malformed } = readGoals(dir);
  const found = [];
  const seen = new Map();

  if (malformed) found.push(`goals.md has an origin line that isn't one word: "${malformed}"`);

  if (written && !Object.hasOwn(ORIGINS, written))
    found.push(`goals.md has origin: ${written}, which is not one of: ${Object.keys(ORIGINS).join(', ')}`);

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

    if (goal.capability && !CAPABILITY_SLUG.test(goal.capability))
      found.push(
        `${goal.id} has capability ${goal.capability}, which isn't a slug (two to four lower-case words with hyphens)`
      );

    found.push(...goal.problems);
  }

  // A capability is made of parts, so one goal alone under a slug is a grouping of nothing.
  const parts = new Map();
  for (const goal of goals)
    if (goal.capability && CAPABILITY_SLUG.test(goal.capability))
      parts.set(goal.capability, [...(parts.get(goal.capability) ?? []), goal.id]);
  for (const [slug, ids] of parts)
    if (ids.length === 1) found.push(`capability ${slug} has only one part (${ids[0]})`);

  for (const entry of readActivities(dir)) {
    if (seen.has(entry.id)) found.push(`${entry.id} is both an activity and a goal`);
    if (!entry.id.startsWith('a-')) found.push(`activity ${entry.id} doesn't start with a-`);
    for (const id of [...entry.serves, ...entry.checks])
      if (id !== 'all' && !seen.has(id))
        found.push(`${entry.id} names ${id}, which is not in goals.md`);
    for (const name of entry.servesGroups)
      if (!goals.some((g) => g.group === name))
        found.push(`${entry.id} serves group ${name}, which no goal is in`);
  }

  // A tasks/ folder with no entry is a bank nobody offers: no tutor method, no generator, and
  // next-item.mjs refuses to serve it, so it is dead weight or a misnamed folder. Only
  // directories count: a plain tasks/*.md is a single-file bank or a study artifact. Checked
  // only where activities.md exists, since before curation there is nothing to be missing from.
  if (existsSync(join(dir, 'activities.md'))) {
    const entered = new Set(readActivities(dir).map((e) => e.id));
    const tasks = join(dir, 'tasks');
    if (existsSync(tasks))
      for (const d of readdirSync(tasks, { withFileTypes: true }))
        if (d.isDirectory() && !entered.has(d.name))
          found.push(`tasks/${d.name}/ is a bank with no entry in activities.md`);
  }

  // FOLDER BANKS get a mechanical floor for curation: what readFolderBanks cannot parse, plus
  // the two checks that need goals.md. A question naming a goal that isn't there can never be
  // credited, and a multi-goal question whose credit has no `<id>`: statement for one of its
  // goals leaves the grader nothing to judge that goal by. mcq has no credit text, so it is
  // exempt from the second. Single-file banks are untouched.
  const banks = readFolderBanks(dir);
  found.push(...banks.problems);
  for (const item of banks.items) {
    for (const id of item.goals)
      if (!seen.has(id)) found.push(`${item.label} names goal ${id}, which is not in goals.md`);
    if (item.goals.length < 2 || item.type === 'mcq') continue;
    for (const id of item.goals)
      if (!item.rubric.includes(`\`${id}\`:`))
        found.push(`${item.label} names goals ${item.goals.join(', ')} but its credit has no statement for ${id}`);
  }

  // The content files and the lifecycle queue can diverge, and the mitigation is that the
  // disagreement is reportable rather than silent. Hand-add a goal to goals.md, no `goal-added`
  // event fires, and the work never queues — nothing would ever curate it and nothing would say
  // why. See lib/status.mjs.
  if (!status.created) {
    found.push(`no status.jsonl — this folder was never recorded as a topic`);
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
