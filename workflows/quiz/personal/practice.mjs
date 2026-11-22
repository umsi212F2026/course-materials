//
// Personal questions in a practice quiz: the material a student's agent drafts them from, and the
// check its drafts must pass before they are served.
//
// THE MATERIAL IS THE LAST COMMIT, NOT THE FILES ON DISK. HEAD's tree is extracted into the
// practice folder and materialFor reads that copy, exactly as it reads a checkout when grading.
// An uncommitted edit would otherwise shift line numbers, and every candidate quoting them would
// be dropped for a reason the student cannot see. Uncommitted PS5 changes are reported, so the
// student can be told the questions are about the last commit.
//
// THE CHECK IS THE GRADER'S OWN. validateCandidate runs against the assignments clone at the
// recorded sha, and choosePersonal chooses with the bake's rule. The only difference is the id:
// a practice draw has no uniqname, so ids take the form p-ps5-practice-<kind>.
//
// LOCAL ONLY. It reads the student's clone and the candidates file their agent wrote, writes only
// inside the practice folder, and sends nothing anywhere.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCandidate, numberLines, CANDIDATE_SCHEMA, kindOf, choosePersonal } from "./lib/candidates.mjs";
import { materialFor } from "./ps5/material.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const UNIQ = "practice";
const MATERIAL = { ps5: materialFor };

const NO_CLONE = "no assignments clone was found, so no personal questions could be drafted";
const noWork = (ps) => `no ${ps.toUpperCase()} work in your last commit, so no personal questions could be drafted`;
const UNREAD = "your last commit could not be read, so no personal questions could be drafted";
const NONE_PASSED = "none of the drafted personal questions passed the check";
const NO_INJECTION = "none of the drafted prompt-injection questions passed the check";
const NO_ALT = "none of the drafted another-fix or defend-a-lane questions passed the check";

// Why choosePersonal came up short, by its own rule: a lane fills the alt slot first, and the
// injection slot only when an alt holds the first.
function shortReason(kept) {
  if (!kept.length) return NONE_PASSED;
  const has = (kind) => kept.some((k) => k.kind === kind);
  if (!has("injection") && !(has("alt") && has("lane"))) return NO_INJECTION;
  return NO_ALT;
}

const git = (dir, ...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

/** Whether `dir` is the top of a git clone, not merely a folder inside one. */
function isClone(dir) {
  try {
    return realpathSync(git(dir, "rev-parse", "--show-toplevel")) === realpathSync(dir);
  } catch {
    return false;
  }
}

/** The student's assignments clone: the `Assignments:` line of `<codexHome>/AGENTS.md`, else
 *  `assignments` beside the course-materials clone, as check-setup.mjs finds it. null when that
 *  is not a git clone. */
export function assignmentsDir({ codexHome, materials }) {
  const agents = join(codexHome, "AGENTS.md");
  const text = existsSync(agents) ? readFileSync(agents, "utf8") : "";
  const m = /^Assignments:\s*(\S.*?)\s*$/im.exec(text);
  const dir = m ? m[1] : join(dirname(materials), "assignments");
  return isClone(dir) ? dir : null;
}

// A fence longer than any run of backticks in the text, so a skill's own code blocks stay inside.
function fenced(text) {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((r) => r.length));
  const fence = "`".repeat(longest + 1);
  return `${fence}\n${numberLines(text)}\n${fence}`;
}

// The PS5 folders to ask git about: the one found in HEAD, else any top-level ps5 folder on disk,
// which is the case of work that was never committed.
function uncommittedIn(assignments, folder) {
  const folders = folder
    ? [folder]
    : readdirSync(assignments, { withFileTypes: true }).filter((d) => d.isDirectory() && /^ps5/i.test(d.name)).map((d) => d.name);
  return folders.some((f) => git(assignments, "status", "--porcelain", "--", f) !== "");
}

// Each heading one level down, so an instructions file sits under the material's own title.
const demote = (text) => text.replace(/^(#+) /gm, "#$1 ");

function materialText({ ps, sha, folder, files, generated, candidates }) {
  const drafting = readFileSync(join(here, "drafting.md"), "utf8").trim();
  const extract = readFileSync(join(here, ps, "extract.md"), "utf8").trim();
  const block = (f) => `### ${f.path}\n\n${fenced(f.text)}`;
  return [
    `# Personal questions about ${ps.toUpperCase()}, for a practice quiz`,
    `Problem set: \`${ps}\`. The student's \`uniq\` is \`${UNIQ}\`, and the graded sha is \`${sha}\`, the last commit of their assignments clone. Their work is in \`${folder}/\`.`,
    `Every id takes the form \`p-${ps}-${UNIQ}-<kind>\`, with \`<kind>\` one of \`alt\`, \`lane\` or \`injection\`, so \`p-${ps}-<uniq>-alt-<k>\` below is \`p-${ps}-${UNIQ}-alt-<k>\`. A candidate with any other id is dropped.`,
    `There is no \`failures\` list in a practice quiz.`,
    `Write the candidates as JSON to:\n\n    ${candidates}\n\nin this shape, a JSON Schema:\n\n\`\`\`json\n${JSON.stringify(CANDIDATE_SCHEMA, null, 2)}\n\`\`\``,
    demote(drafting),
    demote(extract),
    `## The student's files, at ${sha.slice(0, 7)}`,
    ...files.map(block),
    `## Generated summaries`,
    ...generated.map(block),
  ].join("\n\n") + "\n";
}

/** Extract HEAD into `<out>/head`, build the material from that copy and write it to
 *  `<out>/personal-material.md`. `{ material, sha, uncommitted }`, or `{ short }` with the reason
 *  no questions can be drafted, and `uncommitted` too whenever there is a clone to ask. */
export function preparePersonal({ assignments, out, ps }) {
  if (!assignments) return { short: NO_CLONE };
  const build = MATERIAL[ps];
  if (!build) return { short: `no personal questions are drafted for ${ps}` };
  const head = join(out, "head");
  let sha;
  // git archive's output goes straight to tar's input, both run without a shell, so no path is
  // ever parsed as a command. A clone with no commit, or either step failing, is a short draw.
  try {
    sha = git(assignments, "rev-parse", "--verify", "HEAD^{commit}");
    mkdirSync(head, { recursive: true });
    const tarball = execFileSync("git", ["-C", assignments, "archive", "HEAD"], { maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "ignore"] });
    execFileSync("tar", ["-x", "-C", head], { input: tarball, stdio: ["pipe", "ignore", "ignore"] });
  } catch {
    return { short: UNREAD };
  }

  const m = build(head);
  if (m.missing) return { short: noWork(ps), uncommitted: uncommittedIn(assignments, null) };
  const material = join(out, "personal-material.md");
  const candidates = join(out, "personal-candidates.json");
  writeFileSync(material, materialText({ ps, sha, folder: m.folder, files: m.files, generated: m.generated, candidates }));
  return { material, sha, uncommitted: uncommittedIn(assignments, m.folder) };
}

/** The candidates file read, checked and chosen from: `{ items, dropped, short }`. Throws, naming
 *  the file, when it is missing or is not `{ candidates: [...] }`; a single bad candidate is only
 *  dropped. */
export function resumePersonal({ assignments, out, sha, ps, seed }) {
  const file = join(out, "personal-candidates.json");
  if (!existsSync(file)) throw new Error(`${file} was not found. Write the drafted candidates there, then run --resume again.`);
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${file} is not valid JSON: ${e.message}. Fix it, then run --resume again.`);
  }
  if (!Array.isArray(data?.candidates)) throw new Error(`${file} has no "candidates" list. It must be { "candidates": [...], "addressed": "" }.`);

  // The generated summaries are rebuilt from the same HEAD copy the material was written from.
  const m = MATERIAL[ps]?.(join(out, "head")) ?? {};
  const generated = Object.fromEntries((m.generated ?? []).map((g) => [g.path, g.text]));
  const kept = [];
  const dropped = [];
  const seen = new Set();
  data.candidates.forEach((c, i) => {
    if (!c || typeof c !== "object" || Array.isArray(c)) return dropped.push({ id: null, reason: `candidate ${i + 1} is not an object` });
    const id = typeof c.id === "string" ? c.id : null;
    let reason = null;
    if (id && !kindOf(id, ps, UNIQ)) reason = `id must be p-${ps}-${UNIQ}-<kind>`;
    else if (id && seen.has(id)) reason = `id ${id} is used by an earlier candidate`;
    else {
      // An evidence entry that is not an object would throw inside the check; it is a bad draft.
      try { reason = validateCandidate(c, { repoDir: assignments, sha, generated }); }
      catch { reason = "evidence must be a list of { file, lines, sha }"; }
    }
    if (reason) return dropped.push({ id, reason });
    seen.add(id);
    kept.push({ id, kind: kindOf(id, ps, UNIQ), prompt: c.prompt, expected: c.expected, rubric: c.rubric });
  });
  const { items, short } = choosePersonal(kept, seed);
  return { items, dropped, short: short ? shortReason(kept) : null };
}
