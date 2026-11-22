// The student's own words, read from the session transcript. Shared by the record and rounds tools.

/** The student's last message, if it answers a question that asked for their own words.
 *
 *  IT MUST ANSWER THAT QUESTION, OR NOTHING IS COPIED. The last message the reader returns is not
 *  always the reply: a message with an image in it is not typed text and is skipped, which would
 *  leave an older answer, to a different question, as the last one. So the agent's last words
 *  before it must be one of the skills' own-words questions, all of which say "own words".
 *
 *  A REPLY THROUGH CODEX'S QUESTION TOOL ARRIVES WRAPPED, as JSON inside a tag, and Claude Code
 *  marks a picked option as `[answered: ...]`. The student's words are the answer inside. */
export function studentAnswer(entries) {
  const at = entries.findLastIndex((e) => e.role === "student");
  if (at < 0) throw new Error("There is no message from you in this session to copy.");
  const asked = entries.slice(0, at).findLast((e) => e.role === "agent" && e.text.trim());
  if (!asked || !/own words/i.test(asked.text))
    throw new Error("Your last message doesn't answer a question asking for your own words, so nothing was copied. Ask the question again.");
  let words = entries[at].text;
  const wrapped = /^\s*<send_user_message_question_reply>([\s\S]*)<\/send_user_message_question_reply>\s*$/.exec(words);
  if (wrapped) {
    try {
      words = JSON.parse(wrapped[1]).map((a) => a.answer ?? "").join("\n\n");
    } catch {
      throw new Error("Your answer came through the question tool in a form I can't read. Ask the question again as a plain message.");
    }
  }
  words = words.replace(/^\s*\[answered: ([\s\S]*)\]\s*$/, "$1");
  if (!words.trim()) throw new Error("Your last message is empty, so nothing was copied.");
  return words;
}
