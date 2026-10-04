# Rulings to review: unified banks, phases 3 to 5

Decisions made while the instructor was away, during autonomous implementation. Each says what
was decided, why, and what it costs if it was wrong. Delete this file once reviewed.

## Phase 3: vocabulary as `a-words`, `supply` retired (`4785f33..0761ad8`)

1. **Repository only.** Phase 3 changes this repository; running `migrate-words.mjs` on the real
   course topics is queued (see the queue file), and gated on phase 5 because migrating earlier
   changes existing quiz draws (sessions 5, 7 and 9). Cost if wrong: one command per topic, later.
2. **A word's scenario file is named by its goal id** (`tasks/a-words/w-schema.md`). Unique and
   stable, no slugifying of multi-word terms. Cost: file names read `w-schema`, not `schema`.
3. **Stamps are excluded from live activities**, so an unmigrated topic's words fall back to live
   moves. Cost: none found; checked on real data.
4. **`migrate-words.mjs` was redesigned for safety** after two reviews found text-losing paths
   (fenced `#` lines, `###` inside HTML comments, duplicate ids, CRLF). It now splits exactly as
   `bank.mjs` reads, refuses up front on CR line endings, duplicate ids and unpaired ids, verifies
   by conserving every non-blank line before changing anything, removes a stamp's own lines only,
   keeps a legacy pair whose preamble has prose, and edits through temp-and-rename. 42
   adversarial probes found no lost or altered text. Cost: it refuses more often; normalize the
   file and rerun.
5. **Strict pairing.** Any task without a rubric (or the reverse) in a paired legacy file refuses
   the whole run. Cost: fix the orphan first.
6. **`AGENTS.md`'s study description** changed to match the study skill's new frontmatter, which
   `check-skills` requires. Cost: one line in an always-on file.
7. **A generator's questions finish the goals they name**, so `a-words` finishes its word whether
   the question was banked or set live. The old rule (entries without `checks` can't finish a
   goal) no longer applies to generators. Cost if wrong: words could be met by live moves the
   instructor didn't intend to count.
8. **A word is a goal in group `vocabulary`**, stated once in study. Words are always served with
   `next-item.mjs --goal <word>`, never `--activity a-words`.
9. **`examiner` added to the tutor roles** for `a-words`: sets a question cold and leaves the
   judging to the adjudicator.
10. **Three `learn.bpmn` labels reworded** (curation's stamp step, study's choose step, review's
    setup) along with documentation text; no structure or geometry changed and both validators
    pass. Cost: a label may want resizing in the editor.
11. **Left for phase 4:** the `kind: bank` field and old `<entry-id>/<item>` labels still in the
    activities template and curation/verify.

## Phase 4: curation with two instructor stops (`64a432a..6e380de`)

1. **The course path runs only when the instructor runs curation interactively** on a course
   topic. A background run (spawned by `learn` in a student's clone) on any topic writes
   activities only and never drafts banks or waits. Cost: a course topic curated in the
   background gets no new bank until the instructor runs it.
2. **A course topic** is one whose survey origin is `course`, or whose goals all carry
   `origin: course` (every existing course topic, which has no header yet). The header is added
   first, then survey is re-run. Without this the path could never start.
3. **`checks` stays** as the generator's declaration of which goals its questions can
   establish; no new field. `kind:` and `bank:` are retired: a bank exists when its folder does.
   Conversion moves any substantive `bank:` text into the generator and deletes only a bare path
   or `kind:` (coding-agents has a `bank:` line that is the only statement of its material).
4. **Only activities with `checks` whose generator invents its material get a bank.** Generators
   that pick from real items or the learner's own work (own app, agent, chats), orientation
   rehearsals, and activities without `checks` stay live, because a bank would replace the
   learner's own material.
5. **Bank size:** about three questions per goal an activity names, about three per word for
   `a-words`. Somewhat above today's one or two per capability goal.
6. **Drafts live on an unpushed branch** until stop 2; the instructor then decides when to merge
   and push. The repository is public.
7. **Gates:** `a-words` drafting waits until `migrate-words.mjs` has run on that topic (the tool
   refuses once `tasks/a-words/` exists), and moving capability questions out of `items.md`
   waits with it for phase 5, since both change existing quiz draws.
8. **A legacy authored folder** (`tasks/<dir>/` with no `rubrics/<dir>/`) is skipped as a study
   artifact rather than reported, so students' old topics stay clean.
9. **The curation diagram** gained two loops the skill describes (revise a generator at stop 1;
   fix survey problems before the bank check), and the plane widened. Cost: layout redo in the
   editor if unwanted.
10. **Tooling note, not changed:** `workflows/diagram/tools/render.mjs` times out
    (`Page.captureScreenshot`) on this machine even on unchanged files; a copy launched with
    headless `shell`, a `protocolTimeout` and `--disable-gpu` renders.

## Phase 5: the quiz (`34f264c..d87cf42`)

1. **Qualified ids on the quiz path.** A folder question's `id` in a draw is
   `<source>/<activity>/<scenario>/<question>`, so every id-keyed map here and in the private
   tools keeps working; the picker still uses the topic-local `label`. Single-file ids are
   unchanged. Cost: long ids in draw files.
2. **Two label shapes until migration:** folder questions are recorded under their path label;
   single-file questions keep today's `<move>: <id>` (one helper, `recordLabel`, decides).
3. **A topic-level pool key spreads evenly**, deterministically, across the topic's banks in
   name order; it yields one stratum per bank, so `quiz-bake` follows it unchanged. A short
   bank's leftover wraps to earlier banks. Because the spread is per bank, a topic key is not a
   drop-in for an old `items` key.
4. **Course goals only** (`courseOnly`): a question naming a goal that isn't `course` (or isn't in
   goals.md) is dropped and reported. The practice quiz applies it; `quiz-bake` must be taught to
   call it (see the queue's course-private actions). A topic with no goals.md now draws nothing
   that has a goal.
5. **Per-goal verdicts.** A question naming several goals is graded per goal; its value is the
   mean; its credit is the shared one when all goals agree, else `partial`. A multi-goal verdict
   without per-goal data is refused, not scored on one mark. Verdicts on single-goal questions
   merge byte-identically to before.
6. **The migration gate is open, with conditions.** Migrating a topic and updating every pool
   that draws from it must be one change; `migrate-words.mjs` now warns for each pool it would
   shrink. The queue file proposes a mapping for sessions 5, 7 and 9 that keeps each session's
   old mix (sessions 7 and 9 were nearly nine in ten word questions). Cost: you may want a
   different mix.
7. **Private tools need changes before multi-goal questions reach a real quiz:** `quiz-comments`
   (read `value`), `quiz-regrade` and `quiz-review` (find folder rubrics; accept per-goal
   verdicts), `quiz-bank-check` (check `goals`), `quiz-bake` (call `courseOnly`), and four tests
   in `course-private/tests/quiz-draw.test.mjs` (the fixture needs a course goals.md).
   The queue's "Actions on course-private" lists each. Nothing in course-private was changed.
8. **Deferred:** a topic-level key also spreads over activities marked dropped, because
   `bank.mjs` doesn't read activities.md.
