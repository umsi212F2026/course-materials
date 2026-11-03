---
name: submit-for-feedback
description: Save the session you are in as a file the student uploads to Canvas for coaching on their prompting. Use when someone asks to submit this session, send it for feedback, or get coaching on how they prompted.
---

# Submit for feedback

The session the student is in, saved as a Markdown file in their Downloads folder for them to
read and upload to Canvas. A tool does the saving; you ask one question and hand over.

## Operates on

`course-materials`, named in `~/.codex/AGENTS.md`. Run the tool from inside it. Nothing else is
read or written except the new file.

## What you do

**1. Ask.** Send this, and end the turn:

> I'll save this session as a file in your Downloads folder so you can post it to Canvas for
> coaching on your prompting. You'll read it first, and nothing leaves your computer until you
> upload it.
>
> Is there anything in particular you'd like feedback on? For example, a moment where you
> weren't sure how to ask for what you wanted. Or say "skip".

**2. Save and hand over.** Run, from inside `course-materials`:

```
node workflows/feedback/tools/export-session.mjs
```

It takes their reply from the session itself, so do not pass it. It prints the path of the file
it wrote. If it says two sessions are active, rerun it once with
`--transcript <path>` set to whichever of the two named files ends with the reply you just
received.

Do all of that first. Then send exactly one of these as the last thing in the turn, with nothing
after it.

When it printed a path, give it as a link they can click to open the file, with the full path as
the link's text. Put the target in angle brackets if the path has a space in it.

> Your session is saved at:
>
> [<the path the tool printed>](<the path the tool printed>)
>
> Read it through before you send it. It has your messages and my replies, word for word. If
> there's anything in it you'd rather not share, delete it from the file first.
>
> To send it:
>
> 1. Open https://umich.instructure.com/courses/878316/assignments/3338681
> 2. Click **Start Assignment** (or **New Attempt** if you've sent one before).
> 3. Under **Upload File**, choose the file above from your Downloads folder.
> 4. Click **Submit Assignment**.
>
> You can send another session later the same way. Each one is kept.

When it failed:

> I couldn't save this session. The tool said: `<its message>`. Nothing was sent. Want me to
> look into why?

## Depends on

- [`export-session.mjs`](workflows/feedback/tools/export-session.mjs) - tool
