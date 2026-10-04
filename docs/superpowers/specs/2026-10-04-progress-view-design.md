# Progress view

**Status:** approved design, 2026-10-04. Branch `learn-student-feedback`.

## Why

Students benefit from seeing where they are in a topic: which sets of goals are done, which is
next, and what they have tried. The sequence of sets (queue item 5) gives the structure; this
draws it. It is text in the chat now; the web side panel (queue item 7) will later draw the same
data as HTML.

## The tool

`node workflows/learn/tools/progress.mjs <topic-folder> [--json] [--set <n>]`

The output is plain ASCII, so it renders the same in every terminal, Windows consoles included.

Everything comes from `surveyTopic(dir)` (its `sequence` block and rows); nothing new is stored.

### The full view (default)

An example, for a made-up state of a cloud-hosting topic (the examples below use the same one):

```
cloud-hosting - set 2 of 3 is next

 1 Orientation   #              1/1
 2 Words         ##~....>       2/8   <- next
 3 Capabilities  #~...          1/5

 Next set: w-static-host (tried), w-server-host, w-free-tier, w-dns,
 w-domain, w-https, ...  (w-cdn deferred: PS3)

 # met  ~ tried  . not started  > deferred
```

- **Header:** the topic folder name, then `set <n> of <total> is next`, or `every set is done`
  when no set has anything left, or `sequence not decided yet` when the topic has no Sequence
  section (the default order is drawn).
- **A row per set:** its number; a label; its marks; `<met>/<total>`; `<- next` on the current
  set. The label is the set's single group named in title case (`Words` for `vocabulary`,
  `Capabilities`, `Orientation`), or `Set <n>` when the set mixes groups.
- **Marks:** `#` met (however: passed, marked learned, done elsewhere); `~` attempted and not met;
  `.` not attempted; `>` deferred. Retired goals are left out of the marks and the count, as
  they are from survey's fractions. Marks are ordered met, tried, not started, deferred, so a
  row reads like a progress bar.
- **Next set line:** the current set's goals that are not met: tried ones first, then the rest in
  goals.md order. A split capability appears once, as its slug with a fraction
  (`weigh-hosting-plans 1/3`), not as its parts. After six names the line ends `...`; deferred
  goals follow in parentheses with where they will be learned. Absent when every set is done.
- **Legend** last.

### One set (`--set <n>`)

One line, the row for set `n` with its place in the sequence:

```
Words  ###....>  3/8   (set 2 of 3)
Capabilities  #~...  1/5   (set 3 of 3; set 2 is still next)
```

### Data (`--json`)

`{ topic, decided, current, sets: [{ number, label, met, total, goals: [{ id, state, mark,
capability, where }] }], next: [...] }`, where `state` is `met`, `tried`, `open` or `deferred`
and `where` is the deferral's place. This is the shape item 7 will draw.


## When the tutor shows it (study)

- **At the start of a session**, the full view, in place of the two-or-three-line summary of
  where things stand; then one line on where they left off (the last attempt and its ruling).
- **After each recorded attempt**, the one-set line for the set that goal is in (`--set`).
- **When an attempt finishes its set** (nothing left in it: every goal met, deferred or
  retired), the full view instead, so the next set is seen opening up.

Review and the quiz do not show it.

## Tests

Marks and their order; counts excluding retired; labels (single group, mixed set); `<- next` and
the header variants (next, every set done, not decided); the next-set line (tried first, a split
capability as one slug with a fraction, truncation, deferred in parentheses); `--set` for the
current set and for a later set; `--json` shape; output is ASCII only.
