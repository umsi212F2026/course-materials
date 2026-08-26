# Teaching yourself something: how the whole thing works

Start here. This is the shape of the process; the other guides cover the parts you'll spend
time in.

## The idea

You're going to learn things by working with an agent, and the process is deliberately built so
that "I read about it and it made sense" doesn't count as having learned it.

For each topic you decide what you want to be able to do and what would count as proof,
_before_ anyone explains anything. Then you work. Then you check whether you've met your
learning goals.

## One folder per topic

Everything for a topic lives in one folder, and you can read any of it any time, though mostly
you'll want to have an agent summarize stuff from it instead.

| file            | what it is                                           | who writes it                       |
| --------------- | ---------------------------------------------------- | ----------------------------------- |
| `goals.md`      | what you want to be able to do, and what would count | you, with an agent asking questions |
| `activities.md` | things to study from and things to attempt           | an agent, on its own                |
| `notes.md`      | your understanding, in your words                    | you                                 |
| `evidence/`     | a log of everything you attempted and how it went    | programs only, never by hand        |

**There's no file that says where you are.** That's on purpose: a file like that goes stale the
moment anything happens and then quietly lies to you. Where you stand is worked out from the
evidence log every time you ask, so **ask** — _"show me where I stand_ on all the topics" or
"on this topic". Similar phrasings should work fine; you don't need to memorize that.

## The phases

For each topic, there are four phases.

**Goal setting.** A short conversation where you work out what you're actually after. It ends
when you say it does. See [the goal-setting guide](../goal-setting/howto.md).

**Curation** happens without you. An agent finds things to read and builds tasks to attempt,
and another checks its work. You don't have to be there. If it can't find anything workable
it'll tell you and you can offer it suggestions. Usually when it gets stuck it means something
in your goals needs rethinking.

**Study.** Sessions, as many as you want, whenever you want. This is where the time goes. See
[the study guide](../study/howto.md).

**Review.** Once you've shown you can do something, it comes back days or weeks later to see
whether you still can. This is the part that helps with long-term retention. Most of us skip
it, and then we regret it, "I knew that once, but have no idea now...". See
[the review guide](../review/howto.md).

Running underneath all of it: **[words](../vocabulary/howto.md)**, which are goals like any
other but deliberately cheap to add and cheap to meet. Most topics carry a dozen.

## Getting started, and picking up again

Start up the /learn skill, and you'll get a survey: what's due for review, what you were
part-way through, anything waiting on a decision from you, and the option of starting something
new.

Pick one and it opens a session for that topic. You can have more than one open at a time and
move between them — it's best to stick to one per topic, though, or two tutors will overwrite
each other's notes.

Closing a session loses at most the learning activity you were partway through but hadn't
completed. You should be able to start a fresh session on that topic. Everything that matters
should have been written down when it happened.

## What progress looks like

Your goals file holds a list of **goals** — separate things you want to be able to do, or words
you want to master. "Read one of these diagrams and say what it claims" is a goal, "spot a
broken one" is another, and so is a vocabulary word _gateway_.

**Each goal is either met or not**, and what counts as met is set per goal, before you start.
For most it's one unaided pass at something that checks it; for a word it's one use that shows
you're not reading it off a definition.

When you ask for your learning status on a topic, you'll see a summary like:

```
  capabilities 1/3
    c-read-diagram     not started
    c-merge-conflict   2 attempts, last: met, with help
    c-write-one        3 attempts, last: passed          ✓

  vocabulary 7/12
    w-gateway          not started
    w-pool             1 attempt, last: passed           ✓
```

Goals are grouped — your capabilities, your vocabulary — and each group shows how many are met
out of how many. **What's left comes first**, because that's what you'd be deciding about.

The `c-` and `w-` are just labels saying which kind each one is. You don't type them.

The misses are in there on purpose. Nothing here is graded and nothing reaches an instructor,
so a visible miss costs you nothing and is the only thing that tells you where you actually
are.

The moment a goal is met, **it goes into review**: it comes back in a few days, then a week or
two later, then a month or two, each time to see whether it stuck. Passing a review pushes the
next one further out; missing one brings them closer together again.

**A miss never takes back what you showed.** What's met is read off the record of what you did,
and that record only ever grows. A failed review means it comes back sooner, not that you've
lost something.

**"Done" is a claim about evidence, not permission to stop.** You can stop at any point, for
any reason, without anyone's agreement — and the record will say exactly where you got to, with
no verdict attached. What it won't do is say _done_ when you haven't shown it, because then it
would mislead you when you read it back a few weeks later.

## Things you can ask for at any time

- **"Show me everything."** The menu the main learning loop shows is deliberately three or four
  options. You can ask for a more complete list.
- **"What's actually waiting on me?"** Some things stall until you decide something — usually a
  goal that turned out to be untestable.
- **"I want to change my goals for X."** You can raise it here, though it more often comes up
  mid-session, when you're attempting something and realize the target was wrong. Normal either
  way, and not a failure — see [the study guide](../study/howto.md).
- **"Let's retire this topic."** Worth saying out loud rather than just not coming back to it —
  it stops appearing in your survey, and the record says you retired it rather than leaving a
  half-finished topic that looks abandoned. Warning: if you retire a topic, you'll stop getting
  it in your review as well. It's reversible, though. You can unretire a topic whenever you
  want.
- **"I'm giving up on this one goal."** A single goal can go the same way, without touching the
  rest of the topic — most often a word you've decided isn't worth the trouble. It stops coming
  back for review and drops out of the count, anything you already attempted stays in the
  record, and you can have it back whenever you want. See
  [the words guide](../vocabulary/howto.md).
