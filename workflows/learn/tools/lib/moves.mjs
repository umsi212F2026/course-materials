// WHICH MOVES ARE PRODUCTION ONES, from workflows/learn/skills/goal-setting/references/
// vocabulary-moves.md. A word carries `bar: one production pass`, and the tag is the only thing
// that tells the bar whether a move was one, so a question answered anywhere (study, review or
// the quiz) counts toward finishing a word exactly as the same move would elsewhere. The table is five rows and has not changed; if
// it grows, it grows there and here together, and a move missing below records no tag rather
// than a wrong one.
export const MOVE_TAGS = {
  DEFINE: "reception",
  INTERPRET: "reception",
  DISTINGUISH: "production",
  CATCH: "production",
  APPLY: "production",
};

/** The tags a move records: `[]` for an unknown or missing move. */
export const tagsForMove = (move) => (Object.hasOwn(MOVE_TAGS, move) ? [MOVE_TAGS[move]] : []);
