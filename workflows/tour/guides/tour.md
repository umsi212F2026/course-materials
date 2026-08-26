# What a workflow is made of

You are about to run one. This is what you will be looking at while it happens.

Everything in this course works the same way, so the ten minutes you spend here are the ten
minutes you do not spend confused in week three.

## Three parts, and a place to put things

**A guide** — a document like this one. It explains something to a person. No agent is required
to read it; you can open it yourself, and you should.

**A skill** — a file the agent reads and follows. It is instructions, written for an agent
rather than for you, but written in plain English, and you can read it too. Nothing is hidden
in it. If the agent does something you did not expect, the skill is where you look to find out
why.

**A script** — a program. It does the part that has to come out exactly right every time:
creating folders with the correct names, recording what happened, checking that a file really
says what someone claims it says.

**A data directory** — where your work goes. Not where the workflow lives.

## Why the fourth one matters most

The three parts above are the same for all forty-eight of us. They arrive on your machine when
you clone `course-materials`, and they change when your instructor changes them.

Your work is yours, and it lives somewhere else entirely — in your own repositories. That
separation is deliberate, and it is what lets your instructor fix a mistake in a workflow in
week five without touching anything you have written.

So every workflow has to be **told which directory to work in**. It is never assumed. You will
see this in a moment: the script this workflow runs takes a `--dir` argument, and refuses to
run without one. A tool that guessed could write your work somewhere you would never find it.

## What that looks like from the outside

Two rules cover it, and they explain nearly every path you will see:

- **Course materials are named relative to the repository.** `workflows/tour/tools/tour.mjs`
  means the same thing on every machine in the class, whatever you named your folders.
- **Your data is named absolutely, and decided once.** The agent works out which directory you
  are in at the start of a sitting and carries it from there, rather than deciding again each
  time it does something.

## What happens next

The skill will ask you one question, run the script against your learning-topics directory, and
show you the file it wrote. Then open that file in your editor.

That last step is not ceremony. It is the first time you will have looked at one of your own
files in the editor rather than watching the agent describe it, and getting used to reading
your own work directly is most of what makes the rest of this course legible.
