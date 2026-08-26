// evidence/status.jsonl — a topic's lifecycle, as a work queue.
//
// The second append-only log per topic, beside attempts.jsonl. It replaces progress.md, and it
// is A WORK QUEUE, NOT A DIARY: every line says something needs doing, or says that something
// no longer does.
//
// THE LINE BETWEEN THIS AND THE CONTENT FILES: the files say what things ARE, the log says what
// needs DOING. `status: dropped` stays on its activities.md entry, because it is a durable
// property of that activity and its reason is prose that only means anything next to the entry
// it is about. Everything that was "this needs doing" moves here — it was never a property of a
// file, which is precisely why it kept ending up in a cell nobody read.
//
// NON-DERIVABLE EVENTS ONLY. "Started studying" is *any attempt exists*; "first met" is a fold
// of the goal's bar over the attempt log. Writing either here would cache a derivation, which
// is the thing this workflow keeps taking back out. What is here is what no fold can produce:
// somebody decided something.
//
// --- what a line looks like --------------------------------------------------
//
//   at        ISO timestamp
//   kind      one of the seven below
//   goal      the id from goals.md, on the four goal-scoped kinds, and optionally on the two
//             that retire and revive
//   needs     curation | goal-setting, on the two that queue work
//   why       free prose, on `blocked` — what would have to change
//   reason    free prose, on `retired` — the learner's own words
//
//   { kind: created }                                    this folder is a topic
//   { kind: goal-added,  goal, needs: curation }         a goal exists with nothing built for it
//   { kind: curated,     goal }                          curation built or stamped its entries
//   { kind: blocked,     goal, needs, why }              it can't be worked on until X changes
//   { kind: unblocked,   goal }                          X changed
//   { kind: retired,     reason }                        the learner gave the topic up
//   { kind: retired,     goal, reason }                  ... or gave up on that one goal
//   { kind: revived }                                    they took it back
//   { kind: revived,     goal }                          ... or took that one goal back
//
// RETIRING TAKES AN OPTIONAL GOAL, AND THAT IS THE ONLY DIFFERENCE BETWEEN THE TWO SCOPES.
// With a goal, the event is about that goal; without one, about the whole topic. A learner
// deciding one word isn't worth the interval is the same decision as giving a topic up, at a
// smaller scale, and it would be a second mechanism if it were a second kind.
//
// THE LOOP CLOSES BY CONSTRUCTION. Curation either writes `curated` or writes `blocked`; there
// is no third outcome where it produces nothing and gets re-invited forever. That dead end —
// a goal re-entering curation with nobody present to fix it — is what this log was built for.
//
// TWO DESTINATIONS, AND THE ASYMMETRY IS THE POINT. `needs: curation` is agent-only work, which
// `learn` spawns in the background; `needs: goal-setting` needs the learner, and goes on the
// menu. That split used to be inferred from file states. Now it is read off the queue.

// --- the closed sets ---------------------------------------------------------

// Who has to act. Not a free field: `learn` splits on it, so a third value invented in passing
// would be work nobody sweeps for.
export const NEEDS = {
  curation: 'an agent can fix this alone — `learn` spawns it in the background',
  'goal-setting': 'the learner has to be there — `learn` puts it on the menu',
};

// `goal` says whether the kind is about one goal — `true`, `false`, or `'optional'`, which is
// the two scopes of retirement and nothing else. `needs` says whether it puts work on the
// queue; `clears` says whether it takes work off. A kind that does neither is topic-scoped.
export const KINDS = {
  created: { goal: false },
  'goal-added': { goal: true, needs: 'curation' },
  curated: { goal: true, clears: true },
  blocked: { goal: true, needs: 'given' },
  unblocked: { goal: true, clears: true },
  retired: { goal: 'optional', reason: true },
  revived: { goal: 'optional' },
};

// `goal-added` always means `needs: curation` — a goal is added in goal setting, so goal setting
// is not what it is waiting for. The field is written anyway rather than left to be inferred,
// so that every queueing line carries its destination and the fold has no special case.

// --- reading and writing -----------------------------------------------------

import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const statusFile = (dir) => join(dir, 'evidence', 'status.jsonl');

// THE ONLY WRITER. workflows/learn/tools/record-status.mjs is the command line onto this; new-topic.mjs and
// new-word.mjs call it directly, because a program that has just created the thing shouldn't
// shell out to announce it. One writer, so there is one place the closed sets are enforced.
//
// It throws rather than exiting, so the CLI can print usage and the two scripts can fail with
// their own message. What it refuses, it refuses by name.
//
// APPENDING IS SAFE FROM ANY WRITER. A review sitting can be inside this topic at the same time
// as a study session; nothing here rewrites a file, so nothing can lose another process's line.
export function appendStatus(dir, kindName, { goal, needs, why, reason } = {}) {
  const kind = KINDS[kindName];
  if (!kind) throw new Error(`"${kindName}" is not a kind. One of: ${Object.keys(KINDS).join(', ')}`);

  const event = { at: new Date().toISOString(), kind: kindName };

  // Three states, not two. `optional` is what carries the scope of a retirement: the goal id is
  // present or it isn't, and that is the whole of what says which one the learner meant.
  if (kind.goal === 'optional') {
    if (goal) event.goal = goal;
  } else if (kind.goal) {
    if (!goal) throw new Error(`${kindName} is about one goal, and no goal id was given.`);
    event.goal = goal;
  } else if (goal) {
    throw new Error(`${kindName} is about the whole topic, not one goal — drop "${goal}".`);
  }

  // `needs` says who has to act, and `learn` splits on it. `goal-added` fixes its own, because
  // a goal is added in goal setting and so cannot be waiting on goal setting.
  if (kind.needs === 'given') {
    if (!needs) throw new Error(`${kindName} has to say who it needs: --needs ${Object.keys(NEEDS).join(' | ')}`);
    if (!Object.hasOwn(NEEDS, needs))
      throw new Error(`--needs is one of: ${Object.keys(NEEDS).join(', ')} — not "${needs}".`);
    event.needs = needs;
  } else if (kind.needs) {
    event.needs = kind.needs;
  }

  // The `why` on a blocked line is the only thing whoever picks it up will have. A queue entry
  // that says a goal is blocked and not what would unblock it gets looked at twice and
  // understood neither time.
  if (kindName === 'blocked') {
    if (!why) throw new Error(`blocked has to say why — what would have to change.`);
    event.why = why;
  }

  // Retiring is a decision, and the reason is the learner's own words. Don't ask them for one;
  // write down what they said. Nothing here records how far they got — survey derives that from
  // the attempt log and it stays derivable after retirement.
  //
  // REQUIRED AT EITHER SCOPE. The reason is the only part of a retirement no fold can
  // reconstruct, and a word given up for no recorded reason is one nobody can later judge
  // whether to offer back.
  if (kindName === 'retired') {
    if (!reason) throw new Error(`retired has to carry the learner's reason.`);
    event.reason = reason;
  }

  mkdirSync(join(dir, 'evidence'), { recursive: true });
  appendFileSync(statusFile(dir), JSON.stringify(event) + '\n');
  return event;
}

export function readStatus(dir) {
  const file = statusFile(dir);
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

// --- the fold ----------------------------------------------------------------
// What is outstanding, and whether the learner is needed for it.
//
//   created       whether this folder was ever made a topic
//   retired       the learner's reason, or null. Reviving is an event, not a deletion
//   retiredGoals  goal id → their reason, for the goals given up one at a time
//   outstanding   one item per goal that has work waiting, in the order the work arrived
//   announced     every goal the queue has ever heard of
//
// TWO SCOPES, ONE PAIR OF KINDS. A `retired` line with a goal lands in the map; without one it
// sets the topic-level value. `revived` undoes whichever of those its own scope names. THE MAP
// IS NOT A SUBSET OF THE TOPIC VALUE and neither implies the other: reviving a topic restores
// the topic, not the separate decisions made about goals inside it. A word dropped on its own
// stays dropped, which is right — nobody said otherwise.
//
// ORDER DECIDES, same as the outstanding map. Retire, revive, retire again is three events and
// the last one wins.
//
// `announced` is what makes the divergence visible. The queue is authoritative for what needs
// doing and the content files for what exists, so hand-adding a goal to goals.md with no
// `goal-added` event means the work never queues. Survey cross-checks the two and reports it in
// the same PROBLEMS line as a duplicate id — a disagreement becomes a finding rather than
// silence.
//
// ONE OUTSTANDING ITEM PER GOAL, AND THE LAST EVENT WINS. A goal added and then curated is
// clear; a goal added and then blocked is blocked; a goal blocked for goal-setting and then
// unblocked is clear. Two simultaneous claims on one goal would be a queue nobody could work
// off in an order, so there is only ever one.
//
// IN ORDER, like the attempt log — this file is appended as things happen and nothing sorts it.
export function foldStatus(events) {
  let created = false;
  let retired = null;
  const retiredGoals = new Map();
  const outstanding = new Map();
  const announced = new Set();

  for (const e of events) {
    const kind = KINDS[e.kind];
    // A line naming a kind nothing implements is skipped rather than thrown on. record-status
    // refuses to write one; a hand-written line shouldn't take a cross-topic sweep down.
    if (!kind) continue;

    if (e.kind === 'goal-added') announced.add(e.goal);

    if (e.kind === 'created') created = true;
    else if (e.kind === 'retired') {
      if (e.goal) retiredGoals.set(e.goal, e.reason ?? '');
      else retired = e.reason ?? '';
    } else if (e.kind === 'revived') {
      if (e.goal) retiredGoals.delete(e.goal);
      else retired = null;
    } else if (kind.clears) outstanding.delete(e.goal);
    else if (kind.needs)
      outstanding.set(e.goal, {
        goal: e.goal,
        needs: e.needs,
        why: e.why ?? '',
        since: (e.at ?? '').slice(0, 10),
      });
  }

  return { created, retired, retiredGoals, announced, outstanding: [...outstanding.values()] };
}
