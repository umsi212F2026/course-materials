// The seven slots, their defaults, and the closed sets they are refused against.
//
// One module because this is the definition site. A second copy of "what values does `bar`
// take" is a second answer to what the system can be asked to do, and the gap between them is
// where an agent writes `recurrence: sometimes` and nothing complains.
//
// The prose version, with the three strategy contracts written out, is
// workflows/learn/skills/goal-setting/references/slots.md. That file and this one say the same thing; this one
// is what refuses.
//
// NOTHING HERE READS A FILE. workflows/learn/tools/lib/topic.mjs parses goals.md and calls applySlots.

// --- the closed sets ---------------------------------------------------------
// A slot's value set is closed unless it is data. Data slots — `criterion` and `group` — take
// arbitrary text, which is why neither of them dispatches to anything.

export const SUPPLIES = {
  curated: 'offer among the live activities.md entries whose `checks` names this goal',
  vocabulary: 'instantiate one of the six moves',
};

export const ADJUDICATORS = {
  'study/judge': 'a fresh judge, two axes, in a fresh context',
  tutor: 'the running agent rules, in session, no extra call',
};

// The bars themselves are in bars.mjs — a predicate each, over an attempt history. Named here
// because this is where a value gets refused, and there is where it gets run.
export const BARS = {
  'one unaided pass': 'any attempt with unaided: yes and criterion: met',
  'one production pass': 'as above, and the attempt carried `production` in its tags',
  'did it once': 'any attempt with criterion: met, however aided',
};

export const RECURRENCES = {
  spaced: 'comes back on the system-wide intervals',
  never: 'once met, done',
};

export const REQUIREDNESS = {
  yes: 'the topic is not finished until this is met',
  no: 'the topic can be finished without it',
};

// Criterion values that are pointers to shared text rather than the learner's own words. A
// value that matches one of these exactly is a reference; anything else is literal.
//
// The adjudicator is handed TEXT, never a name — so each entry carries the sentence, and
// `where` says which file it is maintained in.
export const CRITERION_REFS = {
  vocabulary: {
    text:
      'Uses the word well — correctly, and in a way that shows it is not being read off a ' +
      'definition. What counts as showing it is the pass condition of the move that was set.',
    where: 'workflows/learn/skills/goal-setting/references/vocabulary-moves.md',
  },
  orientation: {
    text:
      'The learner has indicated they could now attempt the real thing with the artifact ' +
      'still beside them.',
    where: 'workflows/learn/skills/goal-setting/references/slots.md',
  },
};

// SYSTEM-WIDE AND CLOSED, not per supply. `bar` reads these, so a private vocabulary between
// one supply and one bar would be the pairing this design refuses — see slots.md.
export const TAGS = {
  production:
    'the learner brought something — a distinction, an error spotted, their own work, ' +
    'their own situation, the real artifact',
  reception: 'the learner recognised or recalled something they were given',
};

// --- the slots ---------------------------------------------------------------
// `values: null` means data: any text, nothing to refuse.

// EVERY SLOT TAKES ONE VALUE, `supply` included. It was briefly a list, so that one goal could
// draw on two supplies — reverted, because the union breaks the label contract: served.mjs hands
// a goal's labels back to its supply, and free-form is safe only because the supply that wrote a
// label is the only thing that reads it. Two supplies on one goal means each is handed labels it
// did not write and cannot parse, and it would work by accident.
//
// A goal that needs something a supply doesn't offer changes this one value, keeping its
// criterion, its bar and its group — an edit, not a cliff. If it needs a genuinely new source, the
// extension point is writing a supply implementation, which is why this slot names one rather than
// enumerating behaviours.

export const SLOTS = {
  criterion: { default: '', values: null, kind: 'data' },
  supply: { default: 'curated', values: SUPPLIES, kind: 'strategy' },
  adjudicator: { default: 'study/judge', values: ADJUDICATORS, kind: 'strategy' },
  bar: { default: 'one unaided pass', values: BARS, kind: 'strategy' },
  recurrence: { default: 'spaced', values: RECURRENCES, kind: 'flag' },
  is_required: { default: 'yes', values: REQUIREDNESS, kind: 'flag' },
  group: { default: 'capabilities', values: null, kind: 'data' },
};

export const DEFAULT_GROUP = SLOTS.group.default;

// --- applying them to one entry ----------------------------------------------
// Given the bullet fields of one goal entry, return the goal with every slot filled and every
// closed-set value checked.
//
// IT REFUSES BY NAME, and it refuses by collecting rather than by throwing. Survey already
// walks every topic and reports what it finds where someone is already looking; a throw would
// take the other nineteen topics down with the bad one. workflows/learn/tools/record-attempt.mjs is the thing
// that must not proceed, and it checks `problems` before it writes.
//
// Anything that isn't a slot is PAYLOAD — it belongs to whichever supply reads it, and nothing
// else looks at it. That is the mirror of the opaque label: data flowing into an
// implementation rather than out of one.
export function applySlots(id, fields) {
  const problems = [];
  const slots = {};

  for (const [name, spec] of Object.entries(SLOTS)) {
    const given = fields[name];
    if (given === undefined || given === '') {
      slots[name] = spec.default;
      continue;
    }
    if (spec.values && !Object.hasOwn(spec.values, given)) {
      problems.push(
        `${id} has ${name}: ${given}, which nothing implements. ` +
          `${name} is one of: ${Object.keys(spec.values).join(', ')}`
      );
      slots[name] = spec.default;
      continue;
    }
    slots[name] = given;
  }

  const payload = {};
  for (const [name, value] of Object.entries(fields)) {
    if (name === 'goal' || Object.hasOwn(SLOTS, name)) continue;
    payload[name] = value;
  }

  return {
    id,
    text: fields.goal ?? '',
    ...slots,
    // Resolved here so an adjudicator is handed the sentence rather than the pointer.
    criterionText: CRITERION_REFS[slots.criterion]?.text ?? slots.criterion,
    criterionRef: CRITERION_REFS[slots.criterion] ? slots.criterion : null,
    payload,
    problems,
  };
}

// Whether a goal is one of the ones the topic has to finish. One consumer: `nothing pending`.
export const isRequired = (goal) => goal.is_required === 'yes';

// Whether curation has to stamp this goal an entry, because its supply produces its own
// activities and so has nothing in activities.md to point at.
export const suppliesItsOwn = (goal) => goal.supply !== SLOTS.supply.default;

// Whether the scheduler runs for this goal at all. One consumer: record-attempt.mjs.
export const recurs = (goal) => goal.recurrence === 'spaced';

// Tags arrive from a supply, through the tutor, on the command line. Same treatment as a slot
// value: refuse what isn't recognized, and say what is.
export function checkTags(tags) {
  return tags.filter((t) => !Object.hasOwn(TAGS, t));
}
