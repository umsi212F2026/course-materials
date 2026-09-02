---
name: setup-editors
description: Install Zettlr and Camunda Modeler, watch the student open a real file in each, and get .md opening in Zettlr and .bpmn opening in Camunda. The whole of Installation 2, the second of the three setup sessions, and required like every other phase — without an editor a student cannot read or write their own work.
---

# Set up the editors

The **Editors** phase, sixth of seven, and the whole of **Installation 2** — the second of the
three setup sessions, on its own class day. Nothing else runs today.

Two applications, and they matter more than they look. `study` has the student writing
`notes.md` while the agent prompts, and the class session this runs in is the one about
workflows — so the diagram at the end of it is the day's material rather than a file produced
to be screenshotted. Without these, a student can watch an agent describe their own work and
never read or write it — so this is not the optional trimming it might seem.

**Installing them is half the phase.** The other half is watching the student open a real file
in each, which is the only thing that establishes they can actually use them.

## Operates on

You install two applications, and you write one small file — `<parent>/.si212-editors.json` —
recording what you watched the student do.

## What you do, in order

**Do the work first, then say one thing.** The app shows the student only the **last** message
of your turn; everything before it collapses into `Worked for 31s` and is never seen. So check,
download, install and open before you speak, and let the message be the end of the turn. Adding
a short restatement after a quoted block below replaces it — the student gets the restatement
and not the block, and the block is where the path is.

**1. Say what these are for, in two sentences,** before installing anything. Zettlr is for
reading and writing their own notes and goals directly, rather than only ever seeing them
through an agent. Camunda Modeler is for the workflow diagrams this course is built out of,
starting with the one they open at the end of today.

**2. Install Zettlr.** Download and install; they open it in step 4.

**Say what you are about to do in one sentence, then do it. Do not ask.** "Installing Zettlr
now" — not _may I install Zettlr?_ The machine puts up its own prompt if permission is needed,
which is one click; a question in the chat stops the student until they notice it.

**On Windows, install it with `winget` and nothing else:**

```powershell
winget install --id Zettlr.Zettlr --version 4.7.0 --silent --accept-package-agreements --accept-source-agreements
```

**On macOS**, download `Zettlr-4.7.0-arm64.dmg` (Apple Silicon) or `Zettlr-4.7.0-x64.dmg`
(Intel) from `https://github.com/Zettlr/Zettlr/releases/download/v4.7.0/`, mount it, and copy
the one application into `/Applications`. Not the download buttons on `zettlr.com` — those
addresses serve a web page, and you get HTML named like an installer.

**If that macOS address returns 404, it no longer resolves — and why is not something you can
know.** Withdrawn release, renamed asset, or a mistake in this file; same remedy for all three.
Only then, ask `https://api.github.com/repos/Zettlr/Zettlr/releases/latest` for the current
version and take the equivalently-named asset. Say what you asked and what you found, and do
not assert a cause. Do not reach for the API first: it allows sixty requests an hour from one
address, and a room full of students shares one.

**Zettlr should not need an administrator password on either platform.** Camunda on Windows
may; step 3 says why.

**But a prompt is not a blocked machine.** Three situations, and only the last stops the day:

- **A password box they can fill in.** Say what it is — the machine asking permission to put a
  new application in the shared Applications folder — and have them type their own login
  password. Say that it will not show as they type, because a box that does not react reads as
  broken. Ordinary, not a failure.
- **"Zettlr can't be opened because Apple cannot check it for malicious software."** macOS
  only, nothing to do with administrator rights, and it arrives at first launch rather than at
  install. Right-click the app, choose **Open**, then **Open** again — once per application.
  Double-clicking will keep failing for as long as they keep trying it, which is what makes
  students think they broke something.
- **A password they do not have.** Stop; see the rule below. The distinction is whether the
  password exists and they know it, not whether a box appeared.

**3. Install Camunda Modeler**, pinned to 5.50.1.

**On Windows, with `winget`, machine-wide, and tell it where to put things:**

```powershell
winget install --id Camunda.Modeler --version 5.50.1 --scope machine --location "C:\Program Files\Camunda Modeler" --silent --accept-package-agreements --accept-source-agreements
```

**This is the only install in the course that names a location, and the reason is that Camunda
ships no installer** — the package is a zip holding a portable `.exe`. git and Node need no such
flag because their installers already land in `Program Files` on their own. Left to itself with
a portable, `winget` unpacks into
`…\WinGet\Packages\Camunda.Modeler_Microsoft.Winget.Source_8wekyb3d8bbwe\` — a path carrying the
package source, which no file can state in advance, and which is the shape that broke Node on
2026-08-31. Naming the location buys Camunda what git and Node get for free.

The zip has no wrapping folder — measured 2026-09-01, its first entry is `Camunda Modeler.exe` —
so what lands is exactly `C:\Program Files\Camunda Modeler\Camunda Modeler.exe`. **That is a
constant, like `C:\Program Files\Git\cmd\git.exe`.** Step 5 hands it to the student to point
Windows at, and runs it directly if it has to. Do not go searching for it.

**`--scope machine` belongs with it.** `Program Files` needs the elevation it asks for, and a
per-user portable would land under `%LOCALAPPDATA%`, where your sandbox can neither read nor
execute what you just installed — the rule `setup-repos` states, and the reason it says never
`--scope user`.

**Measured 2026-09-02 on Windows 11**: the combination is accepted and the executable lands at
that path. If a machine ever rejects it, stop and say so — do not retry without the flags. A
per-user Camunda in a folder nobody can name looks like success and fails step 5.

**A Windows administrator prompt may appear here, and may not. Say so before installing, and do
not promise it.** Machine scope needs the right; whether a box appears depends on whether the
sandbox already holds it, and both outcomes are normal. This is the same prerequisite
`setup-repos` states for git and Node, checked in the bootstrap prompt before anything is
downloaded — so a student who has no such password is the loaner conversation, not a reason to
retry per-user.

**On macOS**, download `camunda-modeler-5.50.1-mac-arm64.dmg` (Apple Silicon) or
`camunda-modeler-5.50.1-mac-x64.dmg` (Intel) from
`https://github.com/camunda/camunda-modeler/releases/download/v5.50.1/`, mount it, and copy the
one application into `/Applications`. Same 404 rule as Zettlr, against `camunda/camunda-modeler`.

The "Apple cannot check it" dialog above comes again for this one, at its first launch in step
5, and it is the same right-click **Open**.

### On Windows, install with `winget` and nothing else

**The rule and the reference are in
[`setup-repos`](workflows/bootstrap/skills/setup-repos/SKILL.md).** In short: a file this app
creates under `AppData` goes to a private per-package store, `%LOCALAPPDATA%\Programs` is where
Zettlr's installer wants to put itself, and a read of that path is served from the store first —
so a download-and-run install succeeds, reports success, reaches nobody, and the setup check run
from in here agrees with you. `winget` hands the install to a service outside the package, which
is why it lands.

**Never test for `winget` by running `winget --version`** — it says _"not recognized"_ on a
machine where `winget install` works perfectly. Run the install command; let it report.

**You cannot register a file type from in here.** `HKCU` writes go to the package store the same
way, so `HKCU:\Software\Classes`, `assoc` and `ftype` are all equally useless however carefully
aimed. Do not try. Zettlr's own installer registers `.md` perfectly well when `winget` runs it,
because that runs outside the package; if the type still opens something else, the student sets
it by hand in step 4.

**No installer registers `.bpmn` on Windows, and you cannot register it either.** Camunda's
package is a zip, so nothing runs that would claim the type, and your own `HKCU` writes go to
the package store like every other one. **So the student claims it, from Explorer or Settings,
and that is step 5.** It is the one association in this phase that has to take, because unlike
Markdown there is no second application that would open the file anyway.

**If `winget` comes back "not recognized", run the same command again with escalated
permissions** — it is an alias under `%LOCALAPPDATA%`, which your sandbox refuses to read, and
that refusal reaches PowerShell as "not recognized" rather than as a denial. `setup-repos` has
the full statement. One retry, then believe it.

**If the install fails for any other reason**, say what it said and stop. Do not download the
installer instead.

None of this applies to macOS, where you install onto the real machine directly.

**4. Have them open the file themselves, by double-clicking it.** From here on their notes and
goals are `.md`, and this is the first file in the course they handle without an agent in
between — so the move is theirs, and it is the ordinary one they already know.

The file is the one the smoke test wrote — `<parent>/learning-topics/setup.md`. It names the
two directories their machine now knows about, so it is worth the look on its own.

Send them this, filling in the real path, and send nothing after it:

> Open `<parent>/learning-topics` in your file browser and double-click `setup.md`. Send me a
> screenshot of whatever opens — even if it is not what you expected.

**"Even if it is not what you expected" is doing real work there**, so keep it. What opens
depends on what else claims Markdown on that machine, you cannot know that in advance, and a
student who thinks they have got it wrong will fiddle instead of showing you.

**If it opened in Zettlr, this step is done.** Do not send them to set an association they
already have.

**Expect that on Windows and not on a Mac**, so that neither answer throws you. The Windows
installer registers Zettlr for `.md`, and on a machine where nothing else claims the type it
wins. Zettlr's macOS bundle declares no priority for the type at all, so it loses to whatever
else claims Markdown — TextEdit or a browser on the emptiest machine, one of a dozen editors on
a machine that has seen any development work. **On a Mac, setting the association by hand is
the ordinary path through this step rather than the exception**, and treating it as a fault
will tell a student something is wrong with their machine when nothing is.

**If it opened in something else,** Markdown is contested and they have to choose. You cannot
choose for them: macOS has no supported way short of an extra tool, and on Windows your
registry writes may be redirected. Send whichever fits:

> macOS: in Finder, click once on `setup.md` — one click, not two. Press ⌘I, find **Open
> with**, choose **Zettlr**, then click **Change All…** and confirm. Now double-click
> `setup.md` again and send me a screenshot.

> Windows: right-click `setup.md`, choose **Open with → Zettlr**, and tick **Always use this
> app to open .md files**. Then double-click it again and send me a screenshot.

**If Zettlr is not in the Windows list at all, the install did not reach them.** Its installer
registers the file type, so an absence here means the files went somewhere they cannot see — do
not send them hunting for the executable by path. Say what happened and stop.

**Look at the screenshot yourself.** You are checking that Zettlr is open with the right file
in it — not that they say so. If it shows an empty editor, a different file, or an error, work
through it with them rather than accepting it.

**What this step needs is the file open in Zettlr. The association is worth having and is not
worth the day.** If **Change All** or **Always** did not take — it opened in the other
application again — try once more, and then stop trying. Send this, and send nothing after it:

> Right-click `setup.md`, choose **Open With → Zettlr** — just this once, nothing about
> "always" — and send me that screenshot.

That screenshot finishes the step. Then say, in a sentence, that double-clicking a `.md` file
will still open the other application and that they can ask for help changing it any time —
otherwise they meet it again next week believing it was settled today.

**5. Have them open the diagram themselves — which on Windows means claiming `.bpmn` first.**
The file is `workflows/bootstrap/bootstrap.bpmn` in their `course-materials` clone: the setup
they have just been through, drawn, which is what makes it a diagram they can read rather than
one they are shown.

**Why the association is the step rather than a nicety.** After today a diagram is something
they meet on their own. If double-clicking one does nothing, the only way in is an executable
path inside `Program Files` — and nobody remembers that a week later. Doing it once now, with
you supplying the path, is exactly what means they never need the path again.

**On macOS there is nothing to set**: `.bpmn` has no other claimant, so Camunda wins by default.
Send this, and send nothing after it:

> Open `<parent>/course-materials/workflows/bootstrap` in Finder and double-click
> `bootstrap.bpmn`. Send me a screenshot of whatever opens.

**If nothing opens on a Mac, it is Gatekeeper at first launch** — the same dialog as Zettlr's,
and the most common way a student decides an install failed. Right-click **Camunda Modeler** in
Applications, **Open**, **Open** again, then double-click the diagram once more.

**On Windows, check the executable is there before you send them anywhere** —
`Test-Path "C:\Program Files\Camunda Modeler\Camunda Modeler.exe"`. If it is not, step 3 did not
happen: go and do it, then come back. A missing application here is a step you skipped, not an
install that failed, and it is only worth reporting as a failure once step 3 has actually run.
Sending a student to browse to something that was never installed costs them the trip and reads
as their machine being broken.

**Then they claim the type, and Camunda will not be in the list** — a zip has no installer to
register it, so the offer is Notepad and a browser. That leaves the browse route, which works
only because step 3 put the application somewhere a person can navigate to:

> Right-click `bootstrap.bpmn` → **Open with** → **Choose another app**. Camunda will not be
> listed, so click **Choose an app on your PC** — older builds call it **Look for another app on
> this PC** — and pick `C:\Program Files\Camunda Modeler\Camunda Modeler.exe`. Tick **Always use
> this app** if the dialog offers it. Camunda will open the diagram.
>
> Now **close Camunda**, and double-click `bootstrap.bpmn` again. Send me a screenshot of what
> happens this time.

**The second double-click is the evidence, and it is not the same event as the first.** Choosing
an application in that dialog opens the file once whether or not it also sets the default, so a
screenshot taken while Camunda is still up from choosing it proves nothing about next week. Ask
for it with the app closed, and say in a few words why — otherwise it reads as not believing
them.

**Measured 2026-09-02**: the dialog said **Choose an app on your PC**, picking the executable did
set the default, and a fresh double-click afterwards opened the diagram. Two events all the
same, because the screenshot has to show the association working and one taken while Camunda is
still up from choosing it cannot — the two look identical on screen.

**If the dialog comes back instead of the diagram, the choice did not stick.** Expect that
rather than treating it as a fault, and send them to Settings, which has not moved between
builds:

> **Settings → Apps → Default apps**, type `.bpmn` into **Set a default for a file type**, and
> choose Camunda Modeler. Then double-click `bootstrap.bpmn` and send me a screenshot.

**Look at the screenshot yourself**, the way you looked at the first one: the diagram open in
Camunda, not a file browser, not an error, not an empty editor.

**If Camunda does not open at all, establish which of two things failed before doing anything
else.** Open it yourself, by path:

- macOS —
  `open -a "Camunda Modeler" "<parent>/course-materials/workflows/bootstrap/bootstrap.bpmn"`
- Windows —

  ```powershell
  Start-Process "C:\Program Files\Camunda Modeler\Camunda Modeler.exe" -ArgumentList "<parent>\course-materials\workflows\bootstrap\bootstrap.bpmn"
  ```

  **The full path, not the bare name.** `PATH` does not update in a session that is already
  running and yours started before the install — the same rule `setup-repos` states for git and
  Node.

**If that opens it, the install is fine and the association is what failed.** Say so in those
words and work the association with them. **If it does not open it either**, the install did not
land where it was told: say what happened and stop. Do not go hunting under `AppData` or
`WinGet\Packages` for a copy to run instead — a Camunda the student cannot find is the outcome
step 3 exists to prevent.

**What this step needs is the diagram opening when they double-click it, and that is stricter
than the Markdown association above on purpose.** A `.md` that opens in the wrong editor still
opens, and Markdown has a dozen claimants; a `.bpmn` claimed by nothing does not open at all.
If you cannot get there, write no record for Camunda and say plainly what is outstanding — an
instructor is in the room today, which is the cheapest hour in the term to fix it.

**6. Record what you saw.** Write `<parent>/.si212-editors.json`, creating or replacing it:

```json
{
  "zettlr": { "opened": "learning-topics/setup.md", "on": "YYYY-MM-DD" },
  "camunda": { "opened": "workflows/bootstrap/bootstrap.bpmn", "on": "YYYY-MM-DD" }
}
```

**One file, one JSON object, written once — after both screenshots, not after each.** Writing
it when Zettlr opened and again when Camunda did leaves two objects end to end, which is not
JSON, and the check then fails **both** lines for two editors that both worked. Measured
2026-09-02, on the first machine ever to run this step.

**If the file already exists** — a resumed session, or a second attempt — **read it, change the
object, and write the whole thing back.** Never append to it.

**Only write an entry for a screenshot you actually saw.** The setup check reads this file and
reports those two lines as `CONFIRMED` rather than `PASS`, because they are your word rather
than something it established. Writing an entry for something you did not see puts a false
statement into a report an instructor uses to decide who needs help.

**The Camunda entry means they double-clicked the diagram and it opened**, not that you opened
it for them. If you had to launch it by path, the install works and the association does not,
and that is not what this line claims.

**If one editor worked and the other did not, write the one that did and leave the other out.**
The phase does not pass on half, which is the correct outcome, and the report then says which
half it was. If neither opened, write nothing and say so — a missing file is the honest answer.

**7. Check the phase.** Run `node course-materials/workflows/bootstrap/tools/check-setup.mjs`
and read the last line it prints.

- **`Reached 6 of 7 — Editors`** — hand back to `setup-workspace`.
- **`is not valid JSON`** — you wrote the record twice, or appended to it. Rewrite it as one
  object holding both entries and run the check again. This is the one failure here you repair
  rather than report: it is a file you got wrong a minute ago, not the machine disagreeing with
  you, and nothing about the student's setup changes.
- **Anything else** — stop, and show the student the output as it came out.

**Never say what the check would have said.** The number is the one thing here that is not your
judgment, and the only way to have it is to have run the program. Reporting a frontier you
worked out yourself is indistinguishable from a real one to everybody downstream, including the
instructor deciding whether this student needs help.

## Rules

**Stop at the first install you cannot complete**, and say which. Do not go looking for another
way to get the same application onto the machine, and do not tell the student they are finished
when they are not — a machine that half-works is worse than one that visibly didn't.

**Do not substitute a different application.** If Zettlr will not install, the student does not
get a Markdown editor today. They do not get Obsidian, or a browser-based editor, or TextEdit
proposed as an equivalent — a student set up differently from everyone else is a support
problem that surfaces in week five, when nobody remembers this conversation. The same goes for
Camunda: no other modeller, and no web page that draws the diagram instead.

**If an install needs an administrator password the student does not have, stop and say so.**
That is a loaner-laptop conversation with their instructor, not something to work around.

**Help with a prompt; stop at a wall.** The rules above are about not routing around a machine
that has refused you, not a reason to abandon a student at a dialog box. Work through those
with them, in plain words, as many times as it takes.

## When you cannot finish

Say which application failed and show the error, and have them submit the setup check output to
the **Installation 2** assignment on Canvas.

Be accurate about where it leaves them, because the gap is real but narrow: everything the
agent does for them works, and what they cannot yet do is open their own files. That is worth
their instructor knowing today rather than in week three.

## Depends on

- [`study`](workflows/learn/skills/study/SKILL.md) — skill
- [`setup-workspace`](workflows/bootstrap/skills/setup-workspace/SKILL.md) — skill
- [`setup-repos`](workflows/bootstrap/skills/setup-repos/SKILL.md) — skill
- [`check-setup.mjs`](workflows/bootstrap/tools/check-setup.mjs) — tool
- [`bootstrap.bpmn`](workflows/bootstrap/bootstrap.bpmn) — diagram, the one they open in
  Camunda
