---
name: superpowers
description: Design and build software in the assignments repository with Superpowers, which brainstorms an idea into a spec, turns the spec into a plan, and carries the plan out. Use when someone wants to build, design or change an app or other code in their assignments repository, or asks for Superpowers by name. Not for studying or anything else in learning-topics, which stays with learn, study, review and quiz even when it involves making something.
---

# Superpowers

Superpowers is `obra/superpowers`, a workflow for designing a piece of software before building
it and then building it in small, reviewed steps. It is not the course's own. The course
neither copies it nor registers it: it is a clone beside the course repositories, pinned to one
commit, and this file is how you read it. Where it is, what its names mean, and the places
where what it says is not true on a student's machine.

## Operates on

Two folders. **Establish both from `~/.codex/AGENTS.md`**, which names the course
repositories, before you say anything:

- **`assignments`**, the student's repository, where what they build goes. The project
  Superpowers works in is one folder inside it, and its specs, its plans and its code all go
  there. **If the work belongs to a problem set**, because the student says so or is already
  working in its folder (`ps1-data-analysis`, say), that problem set's folder is the project.
  Anything else gets a new folder of its own: agree a name with the student when brainstorming
  first needs somewhere to write.
- **the clone**, `superpowers`, in the same folder as `course-materials`. Read it, and never
  edit it, commit in it or pull it. It stays on the commit the course pins, and a newer
  Superpowers arrives only when the course moves the pin and the student runs
  `setup-superpowers` again.

Do not open with a question about either. Ask only where `~/.codex/AGENTS.md` is missing or
names a folder that is not there, and say that is what happened.

**If there is no clone there, or the student asked to set up, install or check Superpowers**,
follow [`setup-superpowers`](workflows/bootstrap/skills/setup-superpowers/SKILL.md) instead. It
ends its turn on a line for Canvas, and the build starts when they ask for it again.

## How its names resolve

Superpowers' skills name each other as `superpowers:<name>`. Nothing on this machine registers
them, so that name means nothing until you turn it into a path:

- **`superpowers:<name>`** is `<clone>/skills/<name>/SKILL.md`. Invoking it means reading that
  file and following it.
- **A path that starts `skills/`** is from the clone's root.
- **Any other relative path** is from the folder of the file that names it: `references/codex-tools.md`,
  named in `using-superpowers`, is `<clone>/skills/using-superpowers/references/codex-tools.md`.

**Read it from the clone even if this session offers Superpowers some other way**, as a plugin
or as a skill the app lists. The clone is the version the course pins, and the others need not
be.

## Where it is wrong here

Four things it says are not true on a student's machine. They come before where to start
because the first file you open sends you straight to the first of them. Where Superpowers and
this file disagree, this file wins.

**The subagent tools.** `using-superpowers` sends you to `references/codex-tools.md`, which says
"current presets run V2" and names the tools `spawn_agent`, `wait_agent` and so on. The version
follows the model, and the course starts every student on Luna, which gets V1. On V1 the tools
are `multi_agent_v1__spawn_agent` and the rest of the `multi_agent_v1__` family, and you call
them as JavaScript from inside `functions.exec`. So a missing `spawn_agent` does not mean you
cannot start a subagent. Believe your own tool list, as that file itself says to.

**`~/.codex/config.toml`.** The same file asks you to have the student add lines to it, to turn
on multi-agent support and to set a default model for subagents. Do neither, and do not suggest
them. The course's setup owns that file, and the tools above are there without it.

**How far it reaches.** `using-superpowers` says to use a skill if there is a 1% chance it
applies, and `brainstorming` says it must come before any creative work. Here both mean the
building work in `assignments` and nothing else. When the conversation turns to studying,
anything in `learning-topics`, Superpowers' rules stop, and the course's own workflows take
over as this repository's AGENTS.md lists them.

**Its scripts, on Windows.** Every script Superpowers ships is bash: the brainstorming server's
`start-server.sh` and `stop-server.sh`, and the three under
`skills/subagent-driven-development/scripts/`. Its notes say to run them as they are, which
assumes a bash shell, and on Windows yours is PowerShell, which does not run a bash script
itself. Run each one through the bash that came with git, by its full path, with forward
slashes in every path you hand it:

```powershell
& "C:\Program Files\Git\bin\bash.exe" <clone>/skills/brainstorming/scripts/start-server.sh --project-dir <project>
```

That path is a constant, like `C:\Program Files\Git\cmd\git.exe`: git was installed there
machine-wide in the first setup session. Do not go looking for another bash, and do not
rewrite a script in PowerShell. If it fails through that bash, say what it said and stop.

## Start

Read `superpowers:using-superpowers` and follow it. It is how Superpowers begins a session, and
it sends a request to build something to `superpowers:brainstorming` first.

## Depends on

- [`setup-superpowers`](workflows/bootstrap/skills/setup-superpowers/SKILL.md) - skill
- [`superpowers.bpmn`](workflows/develop/superpowers.bpmn) - diagram, this workflow drawn from
  the pinned commit
