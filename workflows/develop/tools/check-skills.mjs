// Check that every skill's declared dependencies resolve, and that nothing it
// actually references went undeclared.
//
//   node workflows/develop/tools/check-skills.mjs
//
// Status: draft, 2026-08-24.
//
// WHY THIS EXISTS. Skills are invoked by path, not through Codex's
// `.agents/skills` registry (§7). That buys a lot — skills stay in the visible
// per-workflow layout, students can read them, nothing is copied or symlinked —
// but it gives up the one thing a registry does for free: a name that is
// guaranteed to resolve. This is that guarantee, moved somewhere we control. It
// fails here, on the instructor's machine, instead of in front of a student.
//
// WHAT A MANIFEST LOOKS LIKE. A `## Depends on` section at the bottom of a
// SKILL.md, one visible Markdown link per dependency:
//
//   ## Depends on
//
//   - [`topic`](workflows/learn/skills/topic/SKILL.md) — skill
//   - [`survey.mjs`](workflows/learn/tools/survey.mjs) — tool
//
// Paths are relative to the repository root, so the string is identical on every
// machine regardless of where anyone cloned (§6). Kind is inferred from the path
// and checked against the label, so a mislabelled entry is an error rather than a
// comment nobody reads.
//
// Exit code 1 if any check fails.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

// --- collecting ------------------------------------------------------------

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry === 'SKILL.md') out.push(full);
  }
  return out;
};

// Only the course's own skills. `.claude/skills/` are Claude Code harness skills
// — a different contract, not invoked by path, and not ours to constrain.
const skillFiles = walk(join(root, 'workflows')).sort();

const skills = skillFiles.map((file) => {
  const text = readFileSync(file, 'utf8');
  const rel = relative(root, file);
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const field = (n) => {
    const m = fm && new RegExp(`^${n}:[ \\t]*(.+)$`, 'm').exec(fm[1]);
    return m ? m[1].trim() : null;
  };
  return {
    file,
    rel,
    text,
    body: fm ? text.slice(fm[0].length) : text,
    dir: basename(dirname(file)),
    name: field('name'),
    description: field('description'),
  };
});

// A bare name like `critique` is ambiguous — both `curation/critique` and
// `goal-setting/critique` exist. Resolve it relative to the skill doing the
// referring: a nested child first, then a sibling, then a unique match anywhere.
// Ambiguity is reported, never guessed at.
const resolveName = (nm, from) => {
  const fromDir = dirname(from.file);
  const candidates = skills.filter((s) => s.dir === nm && s.file !== from.file);
  if (!candidates.length) return null;
  const nested = candidates.filter((c) => dirname(c.file).startsWith(fromDir + '/'));
  if (nested.length === 1) return nested[0];
  const siblings = candidates.filter((c) => dirname(dirname(c.file)) === dirname(fromDir));
  if (siblings.length === 1) return siblings[0];
  if (candidates.length === 1) return candidates[0];
  return { ambiguous: candidates.map((c) => c.rel) };
};

// A workflow carrying STATUS.md is provisional — a stub someone has marked as
// unfinished on purpose. Its skills are exempt from the DESIGN conventions (§9)
// and still held to correctness: paths resolve, kinds match, frontmatter is
// present. A stub is allowed to be unfinished, not broken. See
// workflows/diagram/STATUS.md for the reasoning.
const isProvisional = (s) => {
  const wf = s.rel.split('/').slice(0, 2).join('/');
  return existsSync(join(root, wf, 'STATUS.md')) ? wf : null;
};
const provisional = new Set();

// Entry points come from AGENTS.md rather than a list in here, so the index
// stays the single source of truth for what a student can reach unprompted.
const agentsMd = join(root, 'AGENTS.md');
const indexText = existsSync(agentsMd) ? readFileSync(agentsMd, 'utf8') : '';
const entryPoints = new Map(
  [...indexText.matchAll(/^-\s+\*\*([a-z][\w-]*)\*\*\s+—\s+([\s\S]*?)`([^`]+SKILL\.md)`/gm)].map(
    (m) => [m[1], { description: m[2].replace(/\s+/g, ' ').trim(), path: m[3] }],
  ),
);

// --- checks ----------------------------------------------------------------

const problems = [];
const seen = new Set();
const fail = (where, msg) => {
  const key = `${where}\u0000${msg}`;
  if (seen.has(key)) return; // one report per distinct problem, not per occurrence
  seen.add(key);
  problems.push({ where, msg });
};

const KINDS = [
  [/^workflows\/[^/]+\/skills\/.*SKILL\.md$/, 'skill'],
  [/^workflows\/[^/]+\/tools\/.*\.(mjs|sh)$/, 'tool'],
  [/^workflows\/[^/]+\/templates\/.*$/, 'template'],
  [/^workflows\/[^/]+\/guides\/.*$/, 'guide'],
  [/\.bpmn$/, 'diagram'],
  [/references\/.*\.md$/, 'reference'],
  [/^workflows\/[^/]+\/STATUS\.md$/, 'status'],
];
const kindOf = (p) => KINDS.find(([re]) => re.test(p))?.[1] ?? null;

// Any repo-root-relative path mentioned in prose, so we can require it be declared.
const PROSE_PATH = /(?<![\w/.-])(workflows\/[A-Za-z0-9_./-]*[A-Za-z0-9_-]\.(?:md|mjs|sh|bpmn))/g;

if (!indexText) fail('AGENTS.md', 'missing — the entry-point index is the source of truth for §8');

for (const s of skills) {
  // 1. frontmatter
  if (!s.name) fail(s.rel, 'frontmatter has no `name` (Codex requires it)');
  if (!s.description) fail(s.rel, 'frontmatter has no `description` (Codex requires it)');
  // A nested skill may name itself for its parent — `curation-critique` — so that
  // the name is unique across the repo even though the directory is not.
  const parent = basename(dirname(dirname(s.file)));
  if (s.name && s.name !== s.dir && s.name !== `${parent}-${s.dir}`)
    fail(s.rel, `frontmatter name "${s.name}" is neither "${s.dir}" nor "${parent}-${s.dir}"`);

  // 2. the manifest
  const section = /\n## Depends on\n([\s\S]*?)(?=\n## |\s*$)/.exec(s.body);
  const declared = new Map();
  if (section) {
    // Prettier rewraps long list items, so a manifest entry can span lines.
    // Re-join each item onto one line before matching — the manifest has to
    // survive being formatted, or the convention fights the baseline.
    const items = section[1]
      .split(/\n(?=\s*-\s)/)
      .map((chunk) => chunk.replace(/\s*\n\s*/g, ' ').trim())
      .filter(Boolean);
    for (const line of items) {
      if (!line.startsWith('-')) continue;
      const m = /^\s*-\s*\[([^\]]*)\]\(([^)]+)\)\s*—\s*(\w+)/.exec(line);
      if (!m) {
        fail(s.rel, `unparseable manifest line: ${line.trim()}`);
        continue;
      }
      const [, , path, kind] = m;
      declared.set(path, kind);
      if (!existsSync(join(root, path))) fail(s.rel, `declares a path that does not exist: ${path}`);
      else {
        const actual = kindOf(path);
        if (actual && actual !== kind)
          fail(s.rel, `declares ${path} as "${kind}" but its path says it is a ${actual}`);
      }
    }
  }

  // 3. nothing referenced but undeclared. Prose still carries paths, so this is
  //    what keeps the two copies honest rather than letting them drift apart.
  const bodyNoManifest = section ? s.body.replace(section[0], '') : s.body;
  for (const [, path] of bodyNoManifest.matchAll(PROSE_PATH)) {
    if (!existsSync(join(root, path))) {
      fail(s.rel, `mentions a path that does not exist: ${path}`);
    } else if (!declared.has(path)) {
      fail(s.rel, `mentions ${path} in its body but does not declare it`);
    }
  }

  // 4. skills named in backticks but never declared. This is the case a registry
  //    would have resolved and path invocation does not: `topic` is a name with
  //    nothing behind it unless the manifest supplies one.
  for (const [, nm] of bodyNoManifest.matchAll(/`([a-z][a-z-]{2,})`/g)) {
    const target = resolveName(nm, s);
    if (!target) continue;
    if (target.ambiguous) {
      fail(s.rel, `refers to \`${nm}\`, which could be ${target.ambiguous.join(' or ')}`);
    } else if (!declared.has(target.rel)) {
      fail(s.rel, `refers to the \`${nm}\` skill but does not declare ${target.rel}`);
    }
  }

  // 5. entry points must match the index verbatim (§8)
  const entry = entryPoints.get(s.dir);
  if (entry) {
    if (entry.path !== s.rel) fail('AGENTS.md', `lists ${s.dir} at ${entry.path}, not ${s.rel}`);
    if (s.description && entry.description !== s.description.replace(/\s+/g, ' '))
      fail('AGENTS.md', `description for ${s.dir} does not match its frontmatter verbatim`);
  }
}

for (const [nm, entry] of entryPoints)
  if (!skills.some((s) => s.dir === nm))
    fail('AGENTS.md', `lists an entry point with no skill: ${nm} (${entry.path})`);

// --- the data-directory convention (§9) ------------------------------------
//
// A non-entry-point skill is TOLD its directory and never chooses one. An entry
// point is the opposite: it is the only place a directory gets established, by
// asking. Checked here because it is the convention most likely to erode
// quietly — a skill that starts picking its own directory still works, right up
// until a student has two of them.

// A non-entry-point skill is TOLD what it works on and never chooses. An entry
// point is the opposite: it is the only kind that establishes one, by asking.
// Both declare it under the same heading, so there is one place to look.
const SELECTS = [
  /\bwork(?:ing)? out which (?:data )?directory\b/i,
  /\bchoose (?:a|the|which) (?:data )?directory\b/i,
  /\bfind the (?:data )?directory\b/i,
  /\bask (?:them |the (?:student|learner) )?(?:which|where) (?:data )?directory\b/i,
];
const ESTABLISHES = /\bestablish\b/i;

for (const s of skills) {
  const stub = isProvisional(s);
  if (stub) {
    provisional.add(stub);
    continue;
  }
  const isEntry = entryPoints.has(s.dir);
  const section = /\n## Operates on\n([\s\S]*?)(?=\n## |\s*$)/.exec(s.body);

  if (!section) {
    fail(s.rel, 'has no "## Operates on" declaration — say what it is handed, even if that is nothing on disk (§9)');
    continue;
  }
  if (isEntry) {
    if (!ESTABLISHES.test(section[1]))
      fail(s.rel, 'is an entry point, so it is the only kind that establishes what it works on — say so in "## Operates on" (§9)');
  } else {
    for (const re of SELECTS)
      if (re.test(s.body))
        fail(s.rel, `is not an entry point but contains directory-selection language: ${re.source}`);
  }
}

// --- nothing public may cite something that is not -------------------------
//
// The course materials are a public repository; the design notes, plans and drafts they came
// from are a private one. A file here naming `notes/...` or `plans/...` is a path that does not
// resolve for anyone reading it, and it advertises a document they cannot open.
//
// This checks every file, not only skills — the citations that had to be cleaned up when the
// two repositories were split were mostly in `.mjs` header comments, which no skill rule sees.

const PRIVATE = /(?<![\w/.-])((?:notes|plans)\/[A-Za-z0-9_./-]*[A-Za-z0-9_-]\.md)/g;

const walkAll = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkAll(full, out);
    else if (/\.(md|mjs|sh|json|bpmn)$/.test(entry)) out.push(full);
  }
  return out;
};

// Checked by NAME, not by whether the file happens to be present. `notes/` and `plans/` are
// private by design, so a citation of one is wrong even while both directories still sit here —
// otherwise this check does nothing until the split and then fails in a heap.
for (const file of walkAll(join(root, 'workflows'))) {
  const rel = relative(root, file);
  const cited = new Set([...readFileSync(file, 'utf8').matchAll(PRIVATE)].map((m) => m[1]));
  for (const c of cited)
    fail(rel, `cites ${c} — notes/ and plans/ are private, so that path does not resolve for a reader`);
}

// --- report ----------------------------------------------------------------

const entryList = [...entryPoints.keys()].join(', ') || 'none';
console.log(`SI 212 — skill manifest check`);
console.log(`${skills.length} skills, entry points: ${entryList}`);
for (const wf of [...provisional].sort())
  console.log(`${wf} is provisional (STATUS.md) — design conventions not checked there`);
console.log();

if (!problems.length) {
  console.log(`All manifests resolve.`);
} else {
  const byFile = new Map();
  for (const p of problems) (byFile.get(p.where) ?? byFile.set(p.where, []).get(p.where)).push(p.msg);
  for (const [where, msgs] of [...byFile].sort()) {
    console.log(where);
    for (const m of msgs) console.log(`  ${m}`);
  }
  console.log(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}.`);
}

process.exitCode = problems.length ? 1 : 0;
