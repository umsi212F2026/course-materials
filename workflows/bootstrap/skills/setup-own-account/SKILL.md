---
name: setup-own-account
description: Move the student's Codex app off the U-M gateway and onto their own ChatGPT account, or back again. Changes the settings, then ends on what the student does by hand to finish: log out, restart the app and sign in.
---

# Switch to your own account

The app has been reaching the model through the University's gateway, signed in with a U-M
Toolkit key. After running this, it reaches the vendor directly, signed in with the student's
own ChatGPT account. Their projects, folders and repositories are not touched.

**You do half of it and the student does the other half.** The app reads its settings only when
it starts, so you change them, and the student finishes by logging out, restarting the app and
signing in with their own account.

## Operates on

`~/.codex/config.toml`, through
[`switch-account.mjs`](workflows/bootstrap/tools/switch-account.mjs) and nothing else. **Do not
edit it yourself.** The tool also reads how the app is signed in from `~/.codex/auth.json`.
Never open or print that file, and never sign the app out yourself: it holds the student's key,
and this turn is running on it.

The tool lives in `<parent>/course-materials`. `<parent>` is the folder holding the `Course
materials` path in `~/.codex/AGENTS.md`. Read it there. Do not ask the student, and do not take
the folder you happen to be running in as the answer.

## What you do, in order

**Do the work first, then say one thing.** The app shows the student only the **last** message
of your turn, and everything before it collapses out of sight. So run the tool before you speak,
and let step 3's message end the turn.

**1. Make sure `course-materials` holds the tool.** Look for
`workflows/bootstrap/tools/switch-account.mjs` in the student's clone. If it is not there, you
were read from the network rather than the clone: follow
[`update`](workflows/update/skills/update/SKILL.md) on `course-materials` alone, then carry on
from the clone.

**2. Run it.** From `<parent>`:

```
node course-materials/workflows/bootstrap/tools/switch-account.mjs
```

If the student asked to go **back** to the U-M key, add `--back`. If it prints a STOPPED line, end
on the STOPPED message below. Otherwise your last message is this, and nothing comes after it:

> Your settings point at the U-M gateway again. Four things to do now:
>
> 1. **Log out of this app**: the **ChatGPT** menu, then **Logout**.
> 2. **Quit it completely**, not just its window. On a Mac, press Command+Q.
> 3. **Reopen it**, choose **Sign in another way**, and paste your key from
>    toolkit.umgpt.umich.edu, as you did on the first day.
> 4. Check the bottom left of the window says **UM GPT Toolkit**.

Run it once. It prints one line beginning `SWITCHED`, `ALREADY SWITCHED` or `STOPPED`, and that
line decides your message. Never write out what it would have said.

**3. End the turn on the message for that line.**

If it says **SWITCHED**, your last message is this, and nothing comes after it:

> Your settings are changed. Six things to do now, and this chat cannot do them for you:
>
> 1. **Have a personal ChatGPT account ready.** If you don't have one, start the free student
>    trial at https://chatgpt.com/students/2026/ in your browser first.
> 2. **Log out of this app**: the **ChatGPT** menu, then **Logout**.
> 3. **Quit it completely**, not just its window. On a Mac, press Command+Q.
> 4. **Reopen it.** On the sign-in screen, choose **Continue to sign in**, the large dark
>    button, and sign in with your own ChatGPT account. On the first day you used *Sign in
>    another way*; use the other button now.
> 5. **Check the bottom left of the window.** It used to say **UM GPT Toolkit**. It shouldn't
>    any more, and the app should answer when you type to it.
> 6. **Change your model.** Click the model name at the bottom of the window, then click it
>    again in the little slider popup that opens. Select **default**, and then in the slider
>    select **GPT-6.1 Sol Light**.

If it says **ALREADY SWITCHED**, this, with nothing after it:

> You're already on your own ChatGPT account. There is nothing to change.

If it says **STOPPED**, this, with nothing after it:

> The switch stopped before changing anything. Show your instructor this line:
>
> ```
> <the line the tool printed, exactly as it printed it>
> ```

## Rules

**Do not fix a STOPPED.** It means the files are not what the course installed, and the tool
leaves those alone on purpose. Whatever is there, it is not yours to rewrite. End on the
STOPPED message.

**Run the tool once.** A second run straight after SWITCHED finds nothing to change and says the
app is not signed in with a ChatGPT account yet, which is true and not news. Only the logout and
restart move it on.

**Report what failed, not why you think it failed.** Quote the tool's line. A cause you did not
establish reads as a diagnosis, and the student will act on it.

## Depends on

- [`switch-account.mjs`](workflows/bootstrap/tools/switch-account.mjs) - tool
- [`update`](workflows/update/skills/update/SKILL.md) - skill
