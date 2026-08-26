# Scenario: a learner's first sitting

A scripted stand-in for a student opening the learn workflow with nothing set up yet, adding
one topic, setting a goal, and attempting one activity. Run identically on two models; the
comparison is the result.

**The learner turns are deliberately terse and slightly underspecified**, because real students
are. A scenario in which the learner explains themselves perfectly measures the wrong thing —
the question is whether a cheap model keeps its footing when the human doesn't, which is the
case `gpt-5.6-luna`'s weak OSWorld and long-context scores predict it will fail.

**What to watch for, beyond the cost table.** Turns-to-completion is the number that decides
whether a cheap model is cheap. But also: does it lose the data directory part-way through (the
skill warns about exactly this), does it write to `notes.md` when it was told never to, does it
invent a rung or a progress file that the design deliberately does not have, and does it read
`evidence/attempts.jsonl` directly instead of going through `survey.mjs`. Those are design
violations rather than errors, so nothing will flag them; they have to be read out of the
transcript.

Chat breaks below are placed where the design says state is safely on disk. Override them with
`--chats-per` to sweep granularity.

## turn

Read `workflows/learn/skills/learn/SKILL.md` and follow it. My learning topics directory is
`../learning-topics`. I have not set anything up yet.

## turn

I want to get better at reading BPMN diagrams. I keep having to ask someone what the shapes
mean.

## turn

Mostly I want to be able to look at one of the course workflow diagrams and say what happens in
what order without help.

## turn

Something like that, yes. I don't need to draw them, just read them.

## new chat

## turn

Read `workflows/learn/skills/learn/SKILL.md` and follow it. My learning topics directory is
`../learning-topics`. Pick up where I left off.

## turn

Let's do whichever one you think is the right place to start.

## turn

The oval on the left is where it starts and the one with the thick edge on the right is where
it ends. The diamonds are decisions. I'm not sure what the difference between the two kinds of
diamond is.

## turn

I'll guess: one of them means you pick one path and the other means you do both?

## new chat

## turn

Read `workflows/learn/skills/learn/SKILL.md` and follow it. My learning topics directory is
`../learning-topics`. Where are we?

## turn

Can you show me what I still owe this topic?

## turn

Let's do the one that's been sitting there longest.

## turn

I think I've got it now. Write down what I said in my notes and let's stop there.
