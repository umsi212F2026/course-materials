---
name: setup-github
description: Give a student a GitHub account and publish their two course repositories as their own private copies, adding the teaching team to the one they hand work in through. Runs in week 2, before the first submission, and is the only part of setup that needs an account.
---

# Set up GitHub

The **Remote** phase, seventh of seven, and **not part of the first day**. It runs in week 2,
ahead of the first thing due in week 3.

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

**2. Install the GitHub CLI**, and sign in:

```
gh auth login
```

Choose **HTTPS** for git operations and let it authenticate git. It offers a device flow: a
code to paste into a browser page. That is normal — it is how a program gets permission without
ever seeing their password.

**3. Warn them about the keychain prompt before it happens.** On a Mac, the first push puts up
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

**4. Publish each repository, one at a time.** From inside each clone:

```
gh repo create si212-learning-topics-<uniqname> --private --source=. --remote=origin --push
gh repo create si212-assignments-<uniqname>     --private --source=. --remote=origin --push
```

Both **private**. The prefix is there because these live in their personal account, which has
no organisation name to scope them.

`upstream` is untouched and still points at the course copies, so `git pull upstream main`
keeps bringing new assignments and corrections. Because their clone carries the real history
rather than a fresh copy of the files, that merge works from the first day with nothing to
reconcile.

**5. Add the teaching team to `assignments` only.**

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

**Do not offer to do the same for `learning-topics`, and do not ask whether they want to.**
That repository is theirs and the teaching team does not see it. It is a record of learning,
not work being graded, and that is a property of the design rather than a courtesy.

**6. Check the phase.** Run `node course-materials/workflows/bootstrap/tools/doctor.mjs`. It
should report **reached 7 of 7 — Remote**, and print the `assignments` URL.

**7. Have them submit that output to Canvas.** The `assignments` URL in it is how their
instructor knows which repository is theirs.

## Rules

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
failed. A doctor check that fails is a disagreement, not a hiccup — see above.

**Never print the API key**, and never print the `learning-topics` URL. The doctor output is
pasted into Canvas by a student who will not think about either.

**The student may share `learning-topics` if they want to.** With a study partner, say. That is
their call and not a mistake. If the doctor reports collaborators on it, ask whether they meant
to — do not remove anyone, and do not treat it as a failure.

**Do not push anything to `course-materials`.** It is pull-only and not theirs. Its `origin`
points at the course copy, which they cannot write to, so an attempt will fail confusingly.

## When you cannot finish

Say which step stopped and show the error. The most likely one is authentication, and the most
likely cause is a Deny on the keychain prompt — `gh auth status` will say whether git is
authenticated.

Have them submit the doctor output to Canvas either way. A student who is stuck here still has
every local thing working and has lost nothing; they just have no backup yet, which is worth
saying out loud so they are not worried.

## Depends on

- [`doctor.mjs`](workflows/bootstrap/tools/doctor.mjs) — tool
