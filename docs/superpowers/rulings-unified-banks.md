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
