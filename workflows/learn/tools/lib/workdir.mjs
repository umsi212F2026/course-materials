// Where a tool's data lives, taken as an argument rather than derived.
//
// Every tool that works across topics takes `--dir <path>`, pointing at the
// directory that holds the topic folders — normally a clone of
// learning-topics.
//
// WHY THIS IS AN ARGUMENT AND NOT A DERIVATION. These tools used to compute
// `resolve(import.meta.url, '../../..')` and then `join(root, 'learning')` —
// finding their data by walking up from their own source file. That silently
// assumed code and data live in one repository. They do not: definitions are in
// course-materials, a student's work is in their own repositories, and a
// student may point the same workflow at more than one data directory (separate
// learning directories for different subjects).
//
// THERE IS NO FALLBACK, DELIBERATELY. Guessing a directory when none was given
// is how a tool ends up writing a student's work somewhere nobody looks. The
// session decides the directory once, at the entry point, and passes it down
// from there; a tool that was not told has been called wrongly, and says so.

import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Pull `--dir <path>` out of an argument list.
 *
 * @param {string[]} argv  usually process.argv.slice(2)
 * @param {string} usage   the tool's own usage line, shown when --dir is missing
 * @returns {{dir: string, rest: string[]}} the resolved absolute path, and the
 *          remaining arguments with the --dir pair removed
 */
export function takeDir(argv, usage) {
  const i = argv.indexOf('--dir');
  const die = (msg) => {
    console.error(msg);
    process.exit(1);
  };

  if (i === -1) {
    die(
      `This tool needs to be told which directory to work in.\n\n` +
        `  ${usage}\n\n` +
        `--dir is the folder holding the topic folders — your clone of\n` +
        `learning-topics. There is no default: a tool that guessed could\n` +
        `write your work somewhere you would not find it.`,
    );
  }
  if (i === argv.length - 1) die(`--dir needs a path after it.\n\n  ${usage}`);

  const dir = resolve(argv[i + 1]);
  if (!existsSync(dir)) die(`${dir} does not exist.`);
  if (!statSync(dir).isDirectory()) die(`${dir} is not a directory.`);

  return { dir, rest: [...argv.slice(0, i), ...argv.slice(i + 2)] };
}
