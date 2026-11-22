---
name: start-project
description: Set up a student's final project, asking what it extends, what kind it is and where its code will live, then creating or adopting a public repository for it when that is where it goes, copying in the problem set it extends and the starter files, and filling in project/SUBMIT.md. Use when the student asks to start their final project, or to create its repository.
---

# Start the final project

The project's folder, ready for its base: a new public repository, an existing public PS3
repository adopted as it is, or `project/` in the student's `assignments` repository. Three
questions, one per turn, decide which. **You never create a public repository until the student
has confirmed its name**, because anything pushed to it is public for good.

## Operates on

**Establish the folders from `~/.codex/AGENTS.md`**, which names `course-materials` and the
student's `assignments` repository, before you say anything. Ask only where it is missing or
names a folder that is not there, and say that is what happened. `<parent>` below is the folder
that holds `assignments`.

This skill writes the project folder's address. For a public repository it adds a line to
`~/.codex/AGENTS.md`, `Final project: <absolute path>`, which every other `rounds` skill reads.
For `Work: project/` it adds nothing there: the other skills read `Work: project/` in
`<assignments>/project/SUBMIT.md` as `<assignments>/project`.

## Before you ask anything

1. **If `~/.codex/AGENTS.md` already has a `Final project:` line**, or `project/SUBMIT.md`
   already has `Work:` filled in, send this and stop:

   > Your final project is already started, in `<the folder>`.

2. **If `<assignments>/project/SUBMIT.md` does not exist**, send this and stop:

   > Your assignments repository doesn't have the final project's folder yet. Ask me to update
   > your assignments repository, then ask me again to start your final project.

## What you do

Ask each question below in its own call to `request_user_input_async`, with the options exactly
as written and in this order. Then send this as the last thing in the turn:

> Please answer the question about your final project.

If you have no `request_user_input_async`, send the question as a plain message instead, with
its options as a numbered list, and end the turn. If an answer is free text that is not one of
the options, or is unclear, ask that question again; do not pick one for them.

**1. What it extends.**

- **Title:** "Does your final project extend one of your problem sets, or is it something new?
  An extension needs two new features beyond what that problem set required."
- **Options:** "Something new", "Problem Set 1", "Problem Set 2", "Problem Set 3", "Problem
  Set 4", "Problem Set 5"

Its `Extends:` value is `new`, `PS1`, `PS2`, `PS3`, `PS4` or `PS5`.

**2. What kind.** Only for "Something new" or "Problem Set 5". An extension of Problem Sets 1 to
4 is `deployed`, and you skip this question.

- **Title:** "Will your project be a site anyone can open on the web, or a workflow that runs on
  your laptop? A workflow goes in a public repository, with a web page that explains it."
- **Options:** "A deployed site", "A workflow on my laptop"

Its `Kind:` value is `deployed` or `workflow`. If the student says the instructor has agreed
negotiated terms for their project, its `Kind:` is `negotiated`; ask question 3 as for
`deployed`.

**3. Where the code lives.** Only for `deployed` or `negotiated`. A workflow always goes in a new
public repository, and you skip this question.

- **Title:** "Where should your project's code live? In `project/` in your private assignments
  repository, only the teaching team can see it, and your showcase card has no code link. In a
  public repository, anyone can see it."
- **Options:** "Private, in project/", "A new public repository", and, only for an extension of
  Problem Set 3, "The public repository my Problem Set 3 is already in"

**4. For a Problem Set 5 extension going public, check the inputs first.** List the folders in
`<assignments>/ps5/examples/`, then ask:

- **Title:** "Everything in `ps5/examples/` will be public. Have you replaced every input with
  personal details (names, email addresses, anything about a real person) with a stand-in? The
  inputs are: <the folder names>."
- **Options:** "No, not yet", "Yes, every one is a stand-in or has nothing personal"

If they answer "No, not yet", send this and stop:

> Replace each input that has personal details with a stand-in first, in `ps5/examples/`, and
> commit that. Then ask me again to start your final project. Nothing has been created yet.

**5. For a new public repository, confirm its name.** Run `gh auth status` and
`gh api user --jq .login`. If either fails, send this and stop:

> I can't reach GitHub as you yet: <its message>. Sign in with `gh auth login`, then ask me
> again to start your final project. Nothing has been created yet.

Choose a short name that says what the project is, in lowercase words joined by hyphens, and
check that the student has no repository by that name: `gh repo view <login>/<name>` must
fail. For an extension, do steps 1 and 2 of "The copy" below first, and list the top-level
files and folders left in `<tmp>`. Then ask:

- **Title:** "I'll create a **public** repository, `<login>/<name>`, at
  https://github.com/<login>/<name>. Anyone on the internet will be able to see everything you
  push to it. <For an extension: "It will start with these, copied from your Problem Set <n>
  folder: <the top-level names in `<tmp>`>, plus `AGENTS.md` and `ROUNDS.md`."> Is that name
  OK?"
- **Options:** "No, use a different name", "Yes, create it"

If they answer "No, use a different name", send this and end the turn:

> What would you like the repository to be called?

When they give a name, or give one as their answer, check it the same way and ask again with
it. **Do not run `gh repo create` until they have answered "Yes, create it" to a name.**

## Then set it up

Do all of this before you say anything more, in the case that applies.

**The copy**, for an extension, from the problem set's folder in `assignments`
(`ps1-data-analysis`, `ps2-web-app`, `ps3`, `ps4` or `ps5`) into `<target>`, the project folder:

1. Make an empty temporary folder, `<tmp>`, outside every repository, and run
   `git -C <assignments> archive HEAD:<folder> | tar -x -C <tmp>`. It takes committed files
   only.
2. Delete from `<tmp>`, at any depth: every `AGENTS.md`, `INSTRUCTIONS.md`, `CHANGES.md`,
   `REFLECTION.md` and `QUESTIONS.md`; every folder named `rubrics` or `tasks`; and every file
   named `.env` or `.env.<something>` except `.env.example`. The student's answers and the
   course's own files stay out of the project.
3. `cp -Rn <tmp>/. <target>/`, which never replaces a file already there, then delete `<tmp>`.

For something new, copy nothing.

**A new public repository.** From `<parent>`:

1. `gh repo create <name> --public --clone`. The new folder is `<parent>/<name>`.
2. For an extension, finish the copy into `<parent>/<name>`.
3. Copy `<assignments>/project/AGENTS.md` and `<assignments>/project/ROUNDS.md` into the root.
4. `git -C <parent>/<name> add -A`, commit with the message `Start the final project`, then
   `git -C <parent>/<name> branch -M main` and `git -C <parent>/<name> push -u origin main`.

**The public repository a Problem Set 3 is already in.** Look in `<parent>` for a folder, other
than `course-materials`, `learning-topics` and `assignments`, whose `git remote get-url origin`
is on github.com. If there is exactly one, it is the repository. Otherwise send this and end
the turn:

> Which repository is your Problem Set 3 in? Give me its folder on this laptop, or its URL on
> GitHub.

For a URL, clone it into `<parent>` with `gh repo clone`. Run
`gh repo view <url> --json visibility`: if it is not `PUBLIC`, send this and stop:

> That repository is private, so it can't be your project's public repository. Make it public
> on GitHub, or ask me to start your final project again and keep the code in `project/`.

Then copy in `<assignments>/project/ROUNDS.md` unless the repository already has one, and
`<assignments>/project/AGENTS.md`, adding its contents at the end of an existing `AGENTS.md`
rather than replacing it. Commit with the message `Start the final project`, and push.

**For either public repository**, add `Final project: <absolute path of the repository>` to
`~/.codex/AGENTS.md`, on the line after `Assignments:`. Leave the rest of the file as it is.

**Private, in `project/`.** Create no repository: `project/` already has its `AGENTS.md`,
`ROUNDS.md`, `INSTRUCTIONS.md`, `SUBMIT.md` and `README.md`, and `~/.codex/AGENTS.md` gets no
line. For an extension, do the copy into `<assignments>/project`; step 3 keeps those five files
as they are. Then `git -C <assignments> add project` and commit with the message
`project: copy Problem Set <n>`.

**In every case**, fill in `Kind:`, `Extends:` and `Work:` in `<assignments>/project/SUBMIT.md`,
replacing only those three lines' values and leaving `Showcase:` as it is. `Work:` is the
repository's URL as `https://github.com/<owner>/<name>`, with no `.git` and no trailing slash,
or `project/`. Commit it with `git -C <assignments> commit -m "project: started" --
project/SUBMIT.md`.

## The turn that ends the skill

Send this, filled in, as the last thing in the turn. Keep the line that fits the case and drop
the others:

> Your final project is set up in `<the absolute path of the project folder>`.
>
> (New public repository, extension) It has your Problem Set <n> work in it, copied from
> `assignments`, at https://github.com/<owner>/<name>.
>
> (New public repository, something new) It's empty apart from `AGENTS.md` and `ROUNDS.md`, at
> https://github.com/<owner>/<name>.
>
> (Adopted Problem Set 3) It's your Problem Set 3 repository, with `ROUNDS.md` added.
>
> (Private, in `project/`, extension) It has your Problem Set <n> work in it, copied from its
> folder in `assignments`.
>
> (Private, in `project/`, something new) Your code goes in that folder.
>
> **Next, get your base working and commit it:** <for an extension of Problem Set 1 to 4, "your
> problem set's work, publicly deployed"; for a Problem Set 5 extension, "your Problem Set 5
> workflow, running"; for something new and deployed, "a live URL anyone can open"; for a new
> workflow, "a diagram, a skill, a step done by a program or by you, and at least ten real
> inputs processed, each saved beside its output">. If it already works, the commit you have
> now is your base. Then put that commit's hash on the `Base:` line of `ROUNDS.md` and commit
> that too.
>
> **Nothing before your base can be a round.** A round starts with a Superpowers spec and plan
> committed after it.

## Depends on

- [`record-round`](workflows/rounds/skills/record-round/SKILL.md) - skill
