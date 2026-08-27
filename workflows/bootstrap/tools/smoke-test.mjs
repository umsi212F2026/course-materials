// Prove the addressing works, by using it and writing what happened where it belongs.
//
//   node workflows/bootstrap/tools/smoke-test.mjs --dir <learning-topics>
//
// <d> is the student's learning-topics clone. See
// workflows/learn/tools/lib/workdir.mjs for why it is an argument and not derived.
//
// WHAT THIS IS FOR. It is the Smoke test phase, and the only machine-checkable evidence
// that the pieces installed separately can find each other: the entry-point index was
// read, the repo-relative paths in it resolved to real files on THIS machine, and a
// write landed in a repository that is not the one the code lives in. An agent reporting
// that all of that happened is not evidence that it did — same reason check-setup.mjs
// exists.
//
// So this records the paths it ACTUALLY resolved, not the ones it was supposed to. If
// the addressing is wrong, the file says so in a way a person can read.
//
// It takes nothing from the student. An earlier version asked them a question and wrote
// the answer here, which made a warmer file and proved nothing further — the check never
// read the answer, and any string satisfied it. Orientation is a workflow of its own now;
// this is a receipt.

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const USAGE = "node workflows/bootstrap/tools/smoke-test.mjs --dir <learning-topics>";

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

// --- arguments -------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return null;
  if (i === argv.length - 1) die(`--${name} needs a value after it.\n\n  ${USAGE}`);
  return argv[i + 1];
};

const dirArg = flag("dir");
if (!dirArg) {
  die(
    `This tool needs to be told which directory to work in.\n\n` +
      `  ${USAGE}\n\n` +
      `--dir is your clone of learning-topics. There is no default: a tool\n` +
      `that guessed could write your work somewhere you would not find it.`,
  );
}
const dir = resolve(dirArg);
if (!existsSync(dir)) die(`${dir} does not exist.`);

// --- what actually resolved ------------------------------------------------

// Course materials are found relative to this file, because they ship with it.
// Only the DATA directory is passed in. That asymmetry is the whole point.
const materials = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const index = join(materials, "AGENTS.md");
if (!existsSync(index)) {
  die(
    `${index} is missing.\n\n` +
      `That file is the entry-point index — the one place that says which workflows\n` +
      `exist and where they live. The clone of course-materials is damaged or partial.`,
  );
}

// The index names each entry point by a repo-relative path. Resolving them here is the
// end-to-end test: a path written once, for forty-eight machines, landing on a real file
// on this one. Checking that a file this script sits beside exists would prove far less.
const indexText = readFileSync(index, "utf8");
const entries = [
  ...indexText.matchAll(/^-\s+\*\*([a-z][\w-]*)\*\*[\s\S]*?`([^`]+SKILL\.md)`/gm),
].map((m) => ({ name: m[1], path: m[2] }));

if (!entries.length) {
  die(`${index} lists no entry points — it is present but not in the form anything can read.`);
}

const unresolved = entries.filter((e) => !existsSync(join(materials, e.path)));
if (unresolved.length) {
  die(
    `The entry-point index names ${unresolved.length} path(s) that do not exist under\n` +
      `${materials}:\n\n` +
      unresolved.map((e) => `  ${e.name} — ${e.path}`).join("\n") +
      `\n\nThe clone is damaged or partial, or it is out of date with the index.`,
  );
}

// Data outside the code is the property being demonstrated. If someone has put the two in
// one place, the smoke test still runs, but it has proved less than it claims — so say so
// rather than reporting success.
const nested = !relative(materials, dir).startsWith("..");

const stamp = new Date().toISOString();

// --- write -----------------------------------------------------------------

const out = join(dir, "setup.md");

const body = `# Setup

Written by \`workflows/bootstrap/tools/smoke-test.mjs\` on ${stamp.slice(0, 10)}.

This file is the evidence that your machine's setup finished. A program wrote it, rather than an
agent saying it had, and it landed here — in your own repository, at a path it was told rather
than one it guessed.

| | |
|---|---|
| data directory | \`${dir}\` |
| course materials | \`${materials}\` |
| separate repositories | ${nested ? "**no — see below**" : "yes"} |
| run at | ${stamp} |

Every workflow named in the course's entry-point index, found on this machine by the path the
index gives:

${entries.map((e) => `- ${e.name} — \`${e.path}\``).join("\n")}
${
  nested
    ? `
> **The data directory is inside the course materials.** The setup ran, but it did not
> demonstrate what it was meant to: your work and the course files are supposed to be separate
> repositories. Worth mentioning to your instructor.
`
    : ""
}
## Why there are two directories

The course materials are the same on all forty-eight machines. They arrive when you clone
\`course-materials\`, and they change when your instructor changes them — so everything in them is
named relative to that repository, and \`workflows/learn/skills/learn/SKILL.md\` means the same
thing to everyone in the class.

Your work is yours and lives somewhere else entirely. That is what lets your instructor fix a
workflow in week five without touching anything you have written. It is also why every workflow
has to be **told** which directory to work in, and why the tools refuse to run without one.

---

This file is yours. Edit it, delete it, or leave it — nothing depends on it after the setup
check reads it.
`;

writeFileSync(out, body);

console.log(`Wrote ${out}`);
console.log(`  data directory:    ${dir}`);
console.log(`  course materials:  ${materials}`);
console.log(`  entry points:      ${entries.length} named, ${entries.length} resolved`);
console.log(
  `  separate repos:    ${nested ? "NO — data is inside the materials clone" : "yes"}`,
);

process.exitCode = 0;
