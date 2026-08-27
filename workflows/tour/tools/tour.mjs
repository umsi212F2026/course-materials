// Write the tour's record into a student's data directory, and prove the wiring
// while doing it.
//
//   node workflows/tour/tools/tour.mjs --dir <d> --answer "<text>"
//
// <d> is the student's learning-topics clone. See
// workflows/learn/tools/lib/workdir.mjs for why it is an argument and not derived.
//
// WHAT THIS IS FOR. It is the last step of `setup-addressing`, and the only
// machine-checkable evidence that the whole chain works: the entry-point index
// was read, this workflow's skill was found by path, its manifest resolved, a
// script ran with the data directory it was given, and the write landed in a
// repository that is not the one the code lives in. An agent reporting that all
// of that happened is not evidence that it did — same reason check-setup.mjs exists.
//
// So this records the paths it ACTUALLY resolved, not the ones it was supposed
// to. If the addressing is wrong, the file says so in a way a person can read.
//
// It deliberately does not merely echo the student's answer back. A script that
// repeated what the agent said would prove nothing a bare agent could not do.

import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = 'node workflows/tour/tools/tour.mjs --dir <learning-topics> --answer "<text>"';

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

const dirArg = flag('dir');
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

const answer = flag('answer');
if (!answer) die(`Nothing to record.\n\n  ${USAGE}`);

// --- what actually resolved ------------------------------------------------

// Course materials are found relative to this file, because they ship with it.
// Only the DATA directory is passed in. That asymmetry is the whole lesson.
const materials = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const parts = [
  ['guide', 'workflows/tour/guides/tour.md'],
  ['skill', 'workflows/tour/skills/tour/SKILL.md'],
  ['script', 'workflows/tour/tools/tour.mjs'],
];

const missing = parts.filter(([, p]) => !existsSync(join(materials, p)));
if (missing.length) {
  die(
    `This workflow is incomplete — ${missing.map(([k]) => k).join(', ')} not found under\n` +
      `${materials}. The clone of course-materials is damaged or partial.`,
  );
}

// Data outside the code is the property being demonstrated. If someone has put
// the two in one place, the tour still runs, but it has proved less than it
// claims — so say so rather than reporting success.
const nested = !relative(materials, dir).startsWith('..');

const now = new Date();
const stamp = now.toISOString();

// --- write -----------------------------------------------------------------

const out = join(dir, 'tour.md');

const body = `# Tour

Written by \`workflows/tour/tools/tour.mjs\` on ${stamp.slice(0, 10)}.

## What I said I wanted from this course

${answer}

## What the tour proved

A workflow was found by path, read its own manifest, and ran a script that wrote this file into
a directory it was told about rather than one it guessed.

| | |
|---|---|
| data directory | \`${dir}\` |
| course materials | \`${materials}\` |
| separate repositories | ${nested ? '**no — see below**' : 'yes'} |
| run at | ${stamp} |

The three parts of this workflow, all present:

${parts.map(([kind, p]) => `- ${kind} — \`${p}\``).join('\n')}
${
  nested
    ? `
> **The data directory is inside the course materials.** The tour ran, but it did not
> demonstrate what it was meant to: your work and the course files are supposed to be separate
> repositories. Worth mentioning to your instructor.
`
    : ''
}
---

This file is yours. Edit it, delete it, or leave it — nothing depends on it after the setup
check reads it.
`;

writeFileSync(out, body);

console.log(`Wrote ${out}`);
console.log(`  data directory:    ${dir}`);
console.log(`  course materials:  ${materials}`);
console.log(`  separate repos:    ${nested ? 'NO — data is inside the materials clone' : 'yes'}`);
console.log(`\nOpen ${out} in your editor.`);

process.exitCode = 0;
