// Add a word to a topic's goals.md.
//
//   node workflows/learn/tools/new-word.mjs --dir <d> <area-slug> <word> <id>
//
// <d> is the directory holding the topic folders — see lib/workdir.mjs.
//
// THIS SCRIPT IS THE SHORTHAND FOR "IT'S A WORD", and it is the only one. There are no named
// goal types — a word is a goal carrying four particular slot values, and this fills them in.
// The alternative was a type registry, which is a second definition site, which is where the
// goals and the definition drift apart. So: no name, one writer, and a custom shape is written
// by filling slots directly and needs no script at all.
//
// Goal setting calls this rather than typing the entry, for the same reason. A convention
// living in two places has two implementations.
//
// THE ID IS REQUIRED AND THIS SCRIPT NEVER INVENTS ONE. The calling agent names it — there is
// always one, since a word gets added mid-session. A derived slug would be worse than it looks:
// a threshold catches only the names that come out long, so `state and persistence` would
// become `w-state-and-persistence` silently, when `w-persistence` is what a person would pick.
// Naming is judgment; validation is arithmetic. This script does the second.
//
// Quote the word. Unquoted, a phrase arrives as several arguments and the count won't match.
//
// Adding to a word list is not a revision of a topic's goals — one entry, no folder, no
// commitment. That's why it's this cheap.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readIds, readActivities } from './lib/topic.mjs';
import { appendStatus } from './lib/status.mjs';
import { takeDir } from './lib/workdir.mjs';

const USAGE = 'node workflows/learn/tools/new-word.mjs --dir <learning-topics> <area-slug> <word> <id>';
const { dir: learning, rest: argv } = takeDir(process.argv.slice(2), USAGE);

const [slug, word, id, ...extra] = argv;

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!slug || !word || !id) {
  die(`usage: ${USAGE}
example: node workflows/learn/tools/new-word.mjs --dir ~/Documents/si212/learning-topics where-things-live "local vs. remote" w-local-remote

The id is yours to choose: w- plus two to four lower-case words, aimed at what the word is
rather than how you'd phrase the entry.`);
}

// An unquoted phrase arrives as extra arguments. Saying so beats writing three one-word
// entries, which is what the old variadic form would have done without complaining.
if (extra.length) {
  const all = [word, id, ...extra];
  const guessedId = all[all.length - 1];
  const guessedWord = all.slice(0, -1).join(' ');
  die(
    `Too many arguments. Did you forget to quote the word?\n` +
      `  got: ${all.map((a) => `"${a}"`).join(' ')}\n` +
      `  try: node workflows/learn/tools/new-word.mjs --dir ${learning} ${slug} "${guessedWord}" ${guessedId}`
  );
}

// --- find the topic ----------------------------------------------------------
// Refuse when more than one folder matches: picking one would be picking which of the
// learner's topics gets a word they meant for the other.
const matches = readdirSync(learning)
  .filter((n) => statSync(join(learning, n)).isDirectory())
  .filter((n) => n === slug || n.startsWith(`${slug}-`));

if (!matches.length) die(`No topic folder matches "${slug}".`);
if (matches.length > 1) {
  die(`"${slug}" matches more than one folder:\n  ${matches.join('\n  ')}\nName one exactly.`);
}

const dir = join(learning, matches[0]);
const file = join(dir, 'goals.md');
if (!existsSync(file)) die(`${file} does not exist.`);

// --- validate the id ---------------------------------------------------------
// `w-` is the reading convention for a word; nothing decides anything from it, and the one
// namespace rule that is load-bearing is that a goal id isn't `a-` anything.
if (!/^w-[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  die(`"${id}" isn't a word id. Lower case, starting w-, single hyphens between words.`);
}

const taken = readIds(dir);
if (taken.has(id)) {
  const goal = taken.get(id);
  die(
    `${id} is already in ${matches[0]} — "${goal.text}".\n` +
      `If that's the same word, it's already here and there's nothing to add.\n` +
      `If it's a different one, give it a different id rather than a variant of this one:\n` +
      `one word with two entries splits its attempts between them.`
  );
}
if (readActivities(dir).some((e) => e.id === id)) {
  die(`${id} is already an activity id in ${matches[0]}. Ids are unique across the topic.`);
}

// --- write the entry ---------------------------------------------------------
// The four slots that make it a word, then the three fields the vocabulary supply reads. Those
// three are left blank — they're goal-setting's to fill, and a placeholder would read as an
// answer.
//
// `adjudicator`, `recurrence` and `is_required` are not written, because a word doesn't differ
// from an ordinary goal in any of them. An empty slot is the default, and writing a default
// down is the beginning of a second definition site.
const entry = [
  `### \`${id}\``,
  ``,
  `- **goal:** ${word}`,
  `- **criterion:** vocabulary`,
  `- **supply:** vocabulary`,
  `- **bar:** one production pass`,
  `- **group:** vocabulary`,
  `- **what it names:**`,
  `- **when it bites:**`,
  `- **nearest confusable:**`,
];

const lines = readFileSync(file, 'utf8').split('\n');

const heading = lines.findIndex((l) => /^##\s+Goals\s*$/.test(l));
if (heading === -1) die(`Couldn't find the "## Goals" section in ${file}.`);

// The section runs to the next `##` heading, or to the end of the file.
let end = lines.findIndex((l, i) => i > heading && /^##\s/.test(l));
if (end === -1) end = lines.length;
while (end > heading + 1 && !lines[end - 1].trim()) end--;

lines.splice(end, 0, '', ...entry);

writeFileSync(file, lines.join('\n'));

// The entry and the queue line are one act. A word added to goals.md with no `goal-added` event
// never reaches curation — its stamped entry never gets written, and review would later find a
// goal with no live entry to check it with. Writing both here is why adding a word can stay a
// one-line gesture rather than a thing an agent has to remember two halves of.
appendStatus(dir, 'goal-added', { goal: id });

console.log(`${matches[0]}/goals.md`);
for (const line of entry) console.log(`  ${line}`);
console.log(`  → ${id} awaiting curation`);
