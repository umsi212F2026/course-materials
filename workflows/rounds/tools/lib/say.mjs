// The messages that end the rounds skills, written here rather than in the skills.
//
// AN AGENT SENDS WHAT THESE RETURN, AS THEY ARE. Given a block of text in its instructions, an
// agent conveys it in its own words and drops the sentences that do not answer the student's last
// message, which are the ones a student needs most. Given the same words as a tool's output, it
// passes them on whole. So every sentence here is the student's, and the agent supplies only the
// judgments a tool cannot make, as arguments.

import { join, dirname } from "node:path";

const BASE_RULE = "**Nothing before your base can be a round.** A round starts with a Superpowers spec and plan committed after it.";

/** start-project's last message, from SUBMIT.md (`submit` is readSubmit's result). The project
 *  folder is `folder` when given, `<assignments>/project` for `Work: project/`, and otherwise a
 *  sibling of `assignments` named for the repository. `adopted` is the student's PS3 repository. */
export function startProjectMessage(submit, { assignments, folder, adopted = false }) {
  if (submit.problems.length || !submit.kind || !submit.extends || !submit.work)
    throw new Error(`SUBMIT.md is not filled in yet: ${submit.problems.join(" ") || "Kind, Extends and Work are needed."}`);
  if (adopted && submit.extends !== "PS3") throw new Error("Only a Problem Set 3 repository can be adopted.");
  const isPrivate = submit.work === "project/";
  const n = submit.extends === "new" ? null : submit.extends.slice(2);
  const where = folder ?? (isPrivate ? join(assignments, "project") : join(dirname(assignments), submit.work.split("/").pop()));

  let what;
  if (isPrivate && n)
    what = `It has your Problem Set ${n} work in it, copied from its folder in \`assignments\`. If your site is already deployed from that folder, change the root directory in your host's settings to \`project/\`, so the live site runs this copy from now on.`;
  else if (isPrivate) what = "Your code goes in that folder.";
  else if (adopted) what = "It's your Problem Set 3 repository, with `ROUNDS.md` added.";
  else if (n) what = `It has your Problem Set ${n} work in it, copied from \`assignments\`, at ${submit.work}.`;
  else what = `It's empty apart from \`AGENTS.md\` and \`ROUNDS.md\`, at ${submit.work}.`;

  const base =
    submit.kind === "negotiated"
      ? "your project's starting point, as your agreed terms describe it"
      : n && n !== "5"
        ? "your problem set's work, publicly deployed"
        : n === "5"
          ? "your Problem Set 5 workflow, running"
          : submit.kind === "deployed"
            ? "a live URL anyone can open"
            : "a diagram, a skill, a step done by a program or by you, and at least ten real inputs processed, each saved beside its output";

  return [
    `Your final project is set up in \`${where}\`.`,
    what,
    `**Next, get your base working and commit it:** ${base}. If it already works, the commit you have now is your base. Then put that commit's hash on the \`Base:\` line of \`ROUNDS.md\` and commit that too.`,
    BASE_RULE,
  ].join("\n\n");
}

const PART_NAMES = { new: "what's new", why: "why next" };
const LABELS = ["a bug fix", "catch-up on your base", "deployment"];
const PUSH_ITEMS = ["project pushed", "assignments pushed"];
const sentence = (s) => s.trim().replace(/\.+$/, "") + ".";
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Throws unless `label` is a judgment the skills can make of a round. */
export function checkLabel(label) {
  if (!LABELS.includes(label) && !/^catch-up on Problem Set [1-5]$/.test(label))
    throw new Error(`"${label}" is not a judgment of a round. Use a bug fix, catch-up on Problem Set <n>, catch-up on your base, or deployment.`);
  return label;
}

/** project-ready's message after a check. `items` are check's; `toConfirm` is how many own-words
 *  parts the student is about to be asked about; `weak` are parts the agent read as short of the
 *  grader's bar, as { n, key, text, reason }; `looksLike` are rounds it read as not counting, as
 *  { n, label }. */
export function reportMessage({ kind, items, toConfirm, weak = [], looksLike = [] }) {
  const out = [
    "Here's how your final project checks out against what the grader looks for. The online items are what a stranger sees, without your sign-in:",
    items.map((i) => (i.ok ? `- ✅ ${capital(i.name)}` : `- ❌ ${capital(i.name)}: ${i.detail}`)).join("\n"),
  ];
  // The warnings go after the verdict: an agent that trims a long message trims its tail, and the
  // verdict and the graded-live line are the ones the student must not miss.
  const warnings = [];
  for (const w of weak) warnings.push(`⚠️ Round ${w.n}, ${PART_NAMES[w.key]}, "${w.text}", might lose credit: ${sentence(w.reason)}`);
  for (const r of looksLike) warnings.push(`⚠️ Round ${r.n} looks like ${checkLabel(r.label)}, which earns nothing as a round.`);
  for (const i of items) if (i.ok && /^Warning: /.test(i.detail)) warnings.push(`⚠️ ${capital(i.name)}: ${i.detail.replace(/^Warning: /, "")}`);

  if (toConfirm > 0) {
    out.push(...warnings, "Please answer the questions about the parts of your record that are in your own words.");
    return out.join("\n\n");
  }
  if (kind !== "negotiated") out.push("Every own-words part is confirmed as yours.");
  if (kind === "deployed") out.push("Your site will be graded live, so keep it running the code on `main` until grading is done.");
  const failing = items.filter((i) => !i.ok);
  if (!failing.length) out.push("It's ready to submit on Canvas.");
  else if (failing.every((i) => PUSH_ITEMS.includes(i.name))) out.push("Want me to push it?");
  else out.push("Want me to help with the ones marked ❌?");
  out.push(...warnings);
  return out.join("\n\n");
}

const REASON_WORDS = {
  "no code yet": "no commits implement it yet",
  "code only before the plan": "its code was all committed before the plan, and code committed before its plan can't be a round",
  "shares a commit with the next plan": "its code is in the commit that adds the next plan: which commits implement it?",
};
const ends = (s) => (/[.?!]$/.test(s) ? s : `${s}.`);

/** find-rounds' list. `valid` is how many valid rounds ROUNDS.md has; `plans` are candidates'
 *  unrecorded plans, oldest first; `outside` its plans outside the project folder; `looksLike`
 *  maps a plan to the agent's judgment that it does not count. */
export function candidatesMessage({ valid, plans, outside, looksLike = {} }) {
  const count = `Your project needs two rounds, and \`ROUNDS.md\` has ${valid} so far.`;
  const outsideList = outside.map((p) => `\`${p}\``).join(", ");
  const outsideSentence = `These plans are at the top of your repository, outside your project folder, so they can't be rounds: ${outsideList}.`;

  if (!plans.length)
    return [count, outside.length ? outsideSentence : "Every plan committed since your base is already in it.", "A new round starts with a Superpowers spec and plan, inside your project folder in `docs/superpowers/`."].join(" ");

  const lines = plans.map((p, i) => {
    const spec = p.spec ? `spec \`${p.spec}\`` : "no spec with its name, so which spec goes with it?";
    const commits = p.suggestedCommits ? `commits ${p.suggestedCommits}` : `and ${REASON_WORDS[p.suggestedReason]}`;
    const judged = looksLike[p.plan] ? ` This looks like ${checkLabel(looksLike[p.plan])}, which does not count as a round.` : "";
    return `${i + 1}. ${p.date}, \`${p.plan}\`: ${spec}, ${ends(commits)}${judged}`;
  });
  const out = [
    `${count} Since your base, these plans aren't in it yet:`,
    lines.join("\n"),
    "Only a plan committed after your base can be a round, and only the commits from the plan's own commit on can implement it.",
  ];
  if (outside.length) out.push(`${outsideSentence} Put the next round's spec and plan in \`docs/superpowers/\` inside your project folder.`);
  out.push("Which of these do you want to record? For each, are those the commits that implement it?");
  return out.join("\n\n");
}

/** find-rounds' message when candidates cannot run, with its error. */
export function cannotLookMessage(error) {
  return `I can't look for rounds yet: ${error}\n\nYour rounds start from your base. When your base works, put the hash of the commit where it does on the \`Base:\` line of \`ROUNDS.md\`, and commit that.`;
}
