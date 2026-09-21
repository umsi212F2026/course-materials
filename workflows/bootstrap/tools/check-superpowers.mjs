// Check that Superpowers is on the student's machine at the commit the course pins, and print
// the one line they paste into Canvas.
//
//   node workflows/bootstrap/tools/check-superpowers.mjs --dir <parent>/superpowers
//
// --dir is the clone, beside the three course repositories. It is an argument rather than
// derived, for the reason every tool here takes one: a tool that guessed could report on a
// folder nobody meant.
//
// ONE LINE, AND IT IS THE SUBMISSION. Installation 4 is a four-minute step in a room of
// forty-eight, so what the instructor reads is a column of these rather than a report. The line
// says pass or fail, where the clone is and which commit, and a failure names the first thing
// wrong and nothing else. It is a program's line rather than the agent's account for the same
// reason check-setup.mjs exists: an agent reporting that it finished is not evidence that it did.
//
// THE COMMIT IS THE IDENTITY. Two clones at the same commit with nothing modified hold the same
// files, whoever they were cloned from, so the remote is not checked. Untracked files are not
// counted either, because they change nothing a skill says.
//
// PINNED, NOT LATEST. b36e082 is v6.3.0, the commit workflows/develop/superpowers.bpmn was drawn
// from. It is also named in setup-superpowers and in workflows/develop/tools/get-superpowers.sh,
// and all three move together, in a commit that re-reads the diagram against the new source.
//
// Exit code 1 if it fails.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const PIN = "b36e0829c6d0140e93cfef2ca599b1b07d4a7797";
const VERSION = "v6.3.0";
const pinned = `${PIN.slice(0, 7)} (${VERSION})`;

const USAGE = "node workflows/bootstrap/tools/check-superpowers.mjs --dir <parent>/superpowers";

// --- arguments -------------------------------------------------------------

const argv = process.argv.slice(2);
const at = argv.indexOf("--dir");
if (at === -1 || at === argv.length - 1) {
  console.error(
    `This tool needs to be told where the clone is.\n\n` +
      `  ${USAGE}\n\n` +
      `--dir is the superpowers folder beside course-materials. There is no default.`,
  );
  process.exit(2);
}
const dir = resolve(argv[at + 1]);

// --- the check -------------------------------------------------------------

const git = (args) =>
  execFileSync("git", ["-C", dir, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

// Returns what is wrong, or nothing. The first problem found is the one reported.
const problem = () => {
  if (!existsSync(dir)) return `nothing at ${dir}`;
  if (!existsSync(join(dir, ".git"))) return `${dir} is not a git clone`;

  let head;
  try {
    head = git(["rev-parse", "HEAD"]);
  } catch (err) {
    // Say what git said, never a guess at why. One line of it, because the report is one line:
    // `dubious ownership` on Windows arrives as a paragraph, and its first line names it.
    const said = String(err.stderr || err.message).trim().split("\n")[0];
    return `git refuses ${dir}: ${said}`;
  }
  if (head !== PIN) return `${dir} is at ${head.slice(0, 7)}, not ${pinned}`;

  const changed = git(["status", "--porcelain", "--untracked-files=no"]);
  if (changed) {
    const n = changed.split("\n").length;
    return `${dir} is at ${pinned} but ${n} of its files ${n === 1 ? "has" : "have"} been changed`;
  }

  // What the install is for: a skill read out of the clone by path.
  const skill = join(dir, "skills", "brainstorming", "SKILL.md");
  let text = "";
  try {
    text = readFileSync(skill, "utf8");
  } catch {
    return `${skill} cannot be read`;
  }
  if (!/^name: brainstorming\s*$/m.test(text)) return `${skill} is not the brainstorming skill`;

  return null;
};

const wrong = problem();
if (wrong) {
  console.log(`Installation 4: FAIL, ${wrong}`);
  process.exitCode = 1;
} else {
  console.log(`Installation 4: PASS, Superpowers ${pinned} at ${dir}`);
}
