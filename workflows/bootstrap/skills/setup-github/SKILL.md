---
name: setup-github
description: Give a student a GitHub account and publish their two course repositories as their own private copies, adding the teaching team to the one they hand work in through. Runs as the Installation 3 Canvas assignment, and is the only part of setup that needs an account.
---

# Set up GitHub

The **Remote** phase, seventh of seven, and the whole of **Installation 3** — the last of the
three setup sessions. **Not part of the first day**: it runs after the other two, ahead of the
first thing due in week 3.

Until now everything has been local, and deliberately so: day 1 finished without a single new
account because all three course repositories are public and cloning needs no credentials. That
ends here. From today their work is backed up somewhere other than their laptop, and there is
somewhere to hand things in.

## Operates on

`learning-topics` and `assignments` — the student's two clones, wherever `~/.codex/AGENTS.md`
records them.

Read that file for the paths. Do not ask and do not guess: the student chose the location in
week 1 and it was written down precisely so that nobody has to remember it.

## What you do, in order

**1. Get them a GitHub account, if they have not got one.** Free, at github.com. They will be
required to set up two-factor authentication — an authenticator app on their phone. This is the
slowest step and there is no way around it.

Their username is theirs to choose and will be visible to the teaching team. Say so before they
choose, in case that changes what they pick.

**2. Install the GitHub CLI.**

**On Windows:**

```powershell
winget install --id GitHub.cli --silent --accept-package-agreements --accept-source-agreements
```

`winget` and nothing else — the rule and the reason are in
[`setup-repos`](workflows/bootstrap/skills/setup-repos/SKILL.md). **Unlike git and Node, expect
an administrator prompt**: this package has no user-scope variant, so no flag avoids it. That is
the ordinary case, not a wall.

**On macOS**, download `gh_2.83.1_macOS_arm64.pkg` (Apple Silicon) or `gh_2.83.1_macOS_amd64.pkg`
(Intel) from `https://github.com/cli/cli/releases/download/v2.83.1/` and open it. **Not
Homebrew** — this course does not put a package manager on a student's machine to get one
program.

If that address 404s it no longer resolves, and why is not something you can know. Only then ask
`https://api.github.com/repos/cli/cli/releases/latest` for the current version and take the
equivalently-named asset. Not the API first: sixty requests an hour from one address, and a lab
section shares one.

**`PATH` does not update in a session that is already running**, so `gh` may not be found by name
straight afterwards. Not a failed install, and not a reason to install again.

**3. Have the student sign in, in their own terminal. Not you.**

```
gh auth login
```

Choose **HTTPS** for git operations and let it authenticate git. It offers a device flow — a
code to paste into a browser page. That is normal, and it is how a program gets permission
without ever seeing their password.

**Why it has to be them.** `gh` keeps its token in `%AppData%\GitHub CLI`, which is the one place
this course touches that Windows redirects for a packaged app — see the Windows rule in
`setup-repos`. Created by you, the token goes to the package store: your own `gh` commands would
work, and no `git push` they ever run in their own terminal would find it. Created by them, it is
an ordinary file, and everything you do afterwards reads and updates it normally.

Have them run `gh auth status` in that same terminal and read you the result before you go on.

On macOS nothing is redirected and it is still theirs to run, because it is their credential.

**4. Warn them about the credential prompt before it happens.** On a Mac, the first push puts up
a system dialog:

> "git-credential-osxkeychain" wants to use your confidential information stored in
> "github.com" in your keychain.

with **Always Allow / Deny / Allow**, asking for their Mac login password. **Always Allow** is
the answer, or it comes back on every git operation from now on.

Tell them this **before** it appears, and tell them why it is safe: it is the machine's own
password store being asked to hand a credential to git, which is the program that needs it. It
is worth naming out loud rather than letting it surprise them — it is an unrequested password
box arriving minutes after they were told this credential matters, which is exactly the kind of
thing they should otherwise stop at. A student who picks Deny gets a push that fails for
reasons the error message will not explain.

**On Windows there is usually no such box**, because `gh auth login` sets git up to ask `gh` for
the credential and `gh` already has it. If one does appear it is Windows Credential Manager
asking to store the token, and the answer is yes. Do not go looking for the Mac dialog there,
and do not tell a Windows student to expect one — the absence is correct.

**5. Publish each repository, one at a time.** From inside each clone:

```
gh repo create si212-learning-topics-<uniqname> --private --source=. --remote=origin --push
gh repo create si212-assignments-<uniqname>     --private --source=. --remote=origin --push
```

Both **private**. The prefix is there because these live in their personal account, which has
no organisation name to scope them.

**If the repository already exists, this errors, and that is not a failure.** A student is
usually back here because something further down stopped last time, so check before creating:

```
gh repo view si212-assignments-<uniqname>
```

Found means the create already happened. Do not create it again and do not create it under
another name — make sure the clone points at it and push whatever is new:

```
git -C <repo> remote add origin https://github.com/<username>/si212-assignments-<uniqname>.git
git -C <repo> push -u origin main
```

Skip the `remote add` if `origin` is already there; `git -C <repo> remote -v` says. Getting this
wrong is how a student ends up owning two repositories with nearly the same name, one of which
the teaching team has been added to and the other of which holds their work.

`upstream` is untouched and still points at the course copies, so `git pull upstream main`
keeps bringing new assignments and corrections. Because their clone carries the real history
rather than a fresh copy of the files, that merge works from the first day with nothing to
reconcile.

**6. Add the teaching team to `assignments` only.**

```
gh api -X PUT repos/<username>/si212-assignments-<uniqname>/collaborators/presnick \
  -f permission=push
```

`presnick` is the whole teaching team this term. Add individuals, one call each — a repository
in someone's personal account cannot grant access to a GitHub team at all, only to named
people.

`push` is not a choice either. A private repository owned by a personal account has exactly two
tiers, owner and collaborator, and a collaborator gets write access; read-only is not on offer.

**This sends an invitation, not access.** It is accepted on the instructor's side, so the
student is finished the moment the call succeeds and should not be told to wait for anything.
The check below counts an unaccepted invitation as done, for the same reason.

**Do not skip this step, and do not carry on if it errors.** It is the only thing in setup that
the student alone can repair: nobody on the teaching team can add themselves to a repository in
a student's account afterwards. A failure discovered now costs one retry; discovered at grading
in week 3 it costs an email to that student and a late submission.

**Running it twice is harmless**, so a student coming back does it again rather than working out
whether it took. Adding somebody who is already a collaborator, or who has an invitation
outstanding, succeeds and changes nothing.

**Do not offer to do the same for `learning-topics`, and do not ask whether they want to.**
That repository is theirs and the teaching team does not see it. It is a record of learning,
not work being graded, and that is a property of the design rather than a courtesy.

**7. Check the phase.** Run `node course-materials/workflows/bootstrap/tools/check-setup.mjs`.
It should report **reached 7 of 7 — Remote**, and print the `assignments` URL.

**8. Have them submit that output to the Installation 3 assignment on Canvas.** The
`assignments` URL in it is how their instructor knows which repository is theirs.

## Rules

**Never run `gh auth login` yourself, not even to check whether it is needed.** On Windows the
first one to create `%AppData%\GitHub CLI` wins: a copy in the package store is served ahead of
the real file for every later read of yours, so one stray sign-in leaves you reading a token the
student does not have, permanently and invisibly. `gh auth status`, run by them, is how you find
out where things stand.

**Both repositories are private.** If either was created public, say so immediately and fix it
— `gh repo edit <repo> --visibility private`. A student's coursework being world-readable is
not something to leave until later.

**Retry a network operation once, and only once.** A clone or a download that dies on a
connection reset or a timeout has not told you anything about the machine — it is worth doing
the same thing one more time before deciding it failed.

What counts: connection reset, timed out, could not resolve host, an interrupted transfer. What
does not: anything asking for credentials, a 404, permission denied, no space left. Those are
the machine or the address telling you something true, and doing it again just says it twice.

**This never applies to a check.** Retry the operation that visibly failed, at the moment it
failed. A check that fails is a disagreement, not a hiccup — see above.

**Never print the API key**, and never print the `learning-topics` URL. The setup check output
is pasted into Canvas by a student who will not think about either.

**The student may share `learning-topics` if they want to.** With a study partner, say. That is
their call and not a mistake. If the setup check reports collaborators on it, ask whether they
meant to — do not remove anyone, and do not treat it as a failure.

**Do not push anything to `course-materials`.** It is pull-only and not theirs. Its `origin`
points at the course copy, which they cannot write to, so an attempt will fail confusingly.

## When you cannot finish

Say which step stopped and show the error. The most likely one is authentication, and
`gh auth status` — **run in the student's own terminal, not by you** — is what says whether it
took. On a Mac the usual cause is a Deny on the keychain prompt. On Windows, suspect that the
sign-in happened on the wrong side of the app's private store, and see step 3.

Have them submit the setup check output to the **Installation 3** assignment on Canvas either
way. A student who is stuck here still has every local thing working and has lost nothing; they
just have no backup yet, which is worth saying out loud so they are not worried.

## Depends on

- [`setup-workspace`](workflows/bootstrap/skills/setup-workspace/SKILL.md) — skill
- [`setup-repos`](workflows/bootstrap/skills/setup-repos/SKILL.md) — skill
- [`setup-editors`](workflows/bootstrap/skills/setup-editors/SKILL.md) — skill
- [`check-setup.mjs`](workflows/bootstrap/tools/check-setup.mjs) — tool
