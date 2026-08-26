# Learning goals — <AREA>

**What I want to be able to do, and what would count as having got there.**

<!--
  Everything in HTML comments is guidance, not content. It doesn't appear in a rendered
  view, so this reads clean if you leave it in — but delete each one as you fill its
  section and the file stays short.

  This is the layout for <area>-<yyyy>-<mm>/goals.md in your learning-topics repository,
  created blank by
  workflows/learn/tools/new-topic.mjs. Don't edit this file; edit the copy.
  Later phases read that file and answer to it; they write to their own.

  IDS LIVE HERE, in the Goals section below, and this is the only place they are assigned.
  Everything downstream keys on them: activities.md's `serves` and `checks`, and every line
  of evidence/attempts.jsonl and evidence/status.jsonl.

  The rule:

    Two to four lower-case words with hyphens between, conventionally prefixed — `c-` for a
    capability, `w-` for a word, `o-` for an orientation. `c-read-unseen-diagram`,
    `w-persistence`.

    THE PREFIX IS A READING AID AND NOTHING ELSE. No program decides anything from it; what
    kind of goal this is, if the question even arises, is answered by its slots. What is
    checked is that a goal id doesn't start with `a-`, which activities.md's entries do — a
    log line carries both side by side, and the prefix is what makes that parse at a glance.

    AIM AT WHAT THE THING IS, not at how the entry is phrased. `token, and what it costs` is
    `w-token-cost`, not `w-token-and-what-it-costs`. Stopwords carry nothing and you will be
    reading these in a log.

    UNIQUE WITHIN THE TOPIC — across the goals here and across activities.md's entries,
    including its dropped ones, which keep their ids. Nothing checks you as you write; a
    duplicate surfaces later when workflows/learn/tools/survey.mjs walks the folder, and by then attempts point
    at it.

  AN ID IS PERMANENT. Reword an entry and the id stays — the log already points at it, and a
  rename orphans everything recorded against it. An entry that becomes a genuinely different
  capability is a new entry with a new id, not a rename.

  Words added by workflows/learn/tools/new-word.mjs carry ids too; that script takes the id and never invents
  one. See workflows/learn/skills/add-topic/SKILL.md.
-->

## Where this came from

<!-- Which of A / B / C / D, and the answer to the follow-up. -->

## What I already have

<!--
  The nearest thing already known well, and where it stops.
  This is a claim, not a verified fact — it's a self-report about one's own knowledge,
  and the assessment may contradict it.
-->

## What I'll use it for

<!--
  The use, and a concrete occasion.
  If several uses apply, rank them: the top one sets the depth, the rest are cut first
  when time runs short.
-->

## Depth

<!--
  Which of: recognize it / read it / modify something existing / author from scratch /
  judge someone else's work. One line on why that's enough.
-->

## Goals

<!--
  ONE LIST, one entry per goal, whatever kind of goal it is. A capability, a word and an
  orientation are the same kind of thing here and reach every tool through one code path;
  what differs between them is which SLOTS they carry.

  THE SEVEN SLOTS, what each one asks, and every value in use, are in
  workflows/learn/skills/goal-setting/references/slots.md. Read it before writing a slot you haven't written
  before; a value nothing implements is refused at read time, by name. Every slot takes exactly
  one value.

  EVERY SLOT DEFAULTS, and an ordinary capability carries none of them:

      ### `c-read-unseen-diagram`

      - **goal:** read a diagram I haven't seen and say what it claims
      - **criterion:** given an unseen diagram, names every element and says what the flow
        does, including what it rules out

  That is a complete entry. `criterion` is the only field an ordinary capability writes, and
  it is the one that does the work: it may need a judgment call when the time comes — most
  will — but it has to say what's being examined, or whoever checks it later invents the
  object as well as the verdict.

  A WORD carries four slots, and workflows/learn/tools/new-word.mjs writes them for you. Don't type them:

      ### `w-schema`

      - **goal:** schema
      - **criterion:** vocabulary
      - **supply:** vocabulary
      - **bar:** one production pass
      - **group:** vocabulary
      - **what it names:** the promised shape of the thing, not the thing
      - **when it bites:** when two systems have to agree before either can run
      - **nearest confusable:** type

  The last three are not slots — they are INPUTS TO THE VOCABULARY SUPPLY, which reads them
  when it instantiates a move. DEFINE checks against *what it names*; DISTINGUISH needs the
  confusable; LOCATE relates to *when it bites*. Any future supply will want its own fields,
  and they go the same way: bullets nothing else reads.

  WHAT IT NAMES is a pointer, not a definition — "the promised shape", not what a schema is.
  Topology, the same latitude the interview has: enough to recognize the word when it turns
  up, never enough to pass DEFINE with.

  WHEN IT BITES is the situation that sends someone here. On a seeded entry it's the course's
  guess. It is NOT an answer to LOCATE, which asks for theirs, about their own work — same
  distinction as APPLY. A learner reciting this line has not met the word.

  NEAREST CONFUSABLE is one or more things the word sometimes gets confused with. Optional.
  The agent supplies it from its own knowledge rather than asking the learner.

  A word may carry a further line where this learner has a specific wrong idea waiting for
  them — `- **watch for:** thinks an API key is a password`. Rare. It is a HINT TO WHOEVER
  SETS THE MOVE, not an extra thing to satisfy: aim a CATCH or a DISTINGUISH at it and the
  confusion gets tested by the ordinary bar.

  Words are APPEND-ONLY and adding one is not a revision of these goals. A word that turns up
  mid-topic gets an entry and nothing else happens. That matters: hitting a word you don't
  have is the commonest way a topic grows, and it must not cost a goal-setting session.

  GIVING ONE UP IS NOT A DELETION EITHER. A learner who decides a word doesn't matter gets a
  `retired` line in the status log naming it — `record-status.mjs <topic> retired <goal-id>
  --reason "…"` — and the entry stays here untouched. It stops being offered, stops coming
  back in review and leaves its group's fraction, and the attempts it already has stay in the
  log pointing at an id that is still where they left it. Removing the entry instead would
  orphan those lines, which survey reports as a problem.

  If meeting the vocabulary bar would leave them unable to do the thing, it isn't a word —
  it's a capability, and it gets an ordinary entry with a criterion someone thought about.

  THE ORIENTATION ENTRY is shipped below, filled in, in every topic. It carries five slots and
  they are not yours to change. Delete it only if `what I already have` says this learner has
  seen the area laid out before; then say so there and let curation write
  `n/a — already oriented`.

  HOW MANY CAPABILITY ENTRIES. Usually one is enough — a second means the use needs a
  genuinely separate ability, not a restatement of the first. Past about three, something has
  been scoped wrong.

  THE ABSENCE OF ANY CAPABILITY ENTRY IS LOAD-BEARING. "This file has no goal in the default
  group" is what the rest of the workflow reads as *goal setting hasn't happened* — it's the
  state add-topic leaves, and it's what routes a topic to goal setting. Words and the
  orientation entry are in their own groups and don't count towards it. So never write a
  placeholder capability entry; an empty section is the honest signal.
-->

### `o-orientation`

- **goal:** get the shape of this area before working on any particular part of it
- **criterion:** orientation
- **adjudicator:** tutor
- **bar:** did it once
- **recurrence:** never
- **is_required:** no
- **group:** orientation
