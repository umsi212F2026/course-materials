// Check that a student's machine is actually set up, and print a report they can paste
// into Canvas.
//
//   node workflows/bootstrap/tools/doctor.mjs
//
// Status: draft, rewritten 2026-08-25 from the install trial. Takes no arguments — see the
// note on phases below.
//
// This is the only thing in the first-day workflow that adjudicates "done". Everything before
// it is either a human's judgement or the agent's own account of its work, and an agent
// reporting that it finished is not evidence that it did.
//
// PHASES. Setup runs in ordered phases and this reports
// the highest CONTIGUOUS one reached, by name and ordinal. It deliberately takes no --phase
// argument: the same artifact whenever it is run, so it cannot be handed the wrong one. A
// later phase passing while an earlier one fails is reported loudly, because it means the
// machine is in a state nobody designed.
//
// NOT YET IS NOT FAILURE. A phase that has not been reached yet reports `not yet` and does not
// set a failure exit code — a machine part-way through setup is incomplete, not broken. Only a
// check that is actually wrong fails the run. The skill that called this knows which phase it
// just finished and compares.
//
// What it CANNOT check, by construction: it is a Node script inside the course-materials
// clone, so it only runs once Node exists and that clone succeeded. Those surface earlier, at
// the agent's own can-I-complete check. Don't add checks here for things that must be true for
// this file to have run at all — that is the Runtime phase, and its checkpoint is that this
// script ran.
//
// It never prints the API key, or any part of it — not a prefix, not a length. The report is
// pasted into Canvas by a student who will not think about that, so the guarantee lives here.
// It also never prints the learning-topics repository URL: that repo is the student's own and
// is not the instructor's to collect (§2).
//
// Exit code 1 if any check fails.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { platform, homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const materials = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const codexHome = join(homedir(), '.codex');

// `git --version` and friends write to stderr on some platforms even when they succeed, so
// capture both and let a non-zero exit be the only failure signal.
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();

const gitIn = (dir, args) => run('git', args, { cwd: dir });

// --- where the repositories are --------------------------------------------
//
// Prefer what ~/.codex/AGENTS.md records, because that is the one place the install location
// is written down and the student may have chosen anywhere (§8). Fall back to the parent of
// this clone, which is where setup puts them — needed because the Repositories phase is
// checked BEFORE the Addressing phase writes that file.

const agentsPath = join(codexHome, 'AGENTS.md');
const agentsText = existsSync(agentsPath) ? readFileSync(agentsPath, 'utf8') : '';

const recorded = (label) => {
  const m = new RegExp(`^${label}:\\s*(\\S.*?)\\s*$`, 'im').exec(agentsText);
  return m ? m[1] : null;
};

const parent = dirname(materials);
const repos = {
  'course-materials': materials,
  'learning-topics': recorded('Learning topics') ?? join(parent, 'learning-topics'),
  assignments: recorded('Assignments') ?? join(parent, 'assignments'),
};

// --- check plumbing --------------------------------------------------------

const OK = 'PASS';
const NOTYET = 'not yet';
const FAIL = 'FAIL';

class NotYet extends Error {}
const notYet = (msg) => {
  throw new NotYet(msg);
};

const phases = [];
const phase = (n, name, opts = {}) => {
  const p = { n, name, checks: [], ...opts };
  phases.push(p);
  // `advisory` marks a check that reports but does not gate: it neither fails the run nor holds
  // the phase frontier back. For checks that can be unavailable rather than wrong — a privacy
  // lookup that needs the network, say. A check nobody could run is not a check that failed.
  return (label, fn, opts = {}) => {
    try {
      p.checks.push({ state: OK, label, detail: fn() || 'ok', ...opts });
    } catch (err) {
      p.checks.push({
        state: err instanceof NotYet ? NOTYET : FAIL,
        label,
        detail: err.message,
        ...opts,
      });
    }
  };
};

// --- 2. Runtime ------------------------------------------------------------

const runtime = phase(2, 'Runtime');

runtime('Node.js', () => {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 18) throw new Error(`found ${process.version}, need 18 or newer`);
  return process.version;
});

runtime('git', () => {
  try {
    return run('git', ['--version']);
  } catch {
    throw new Error('not installed, or not on PATH');
  }
});

runtime('signed in to Codex', () => {
  // The key lives in ~/.codex/auth.json, written by the app's own sign-in — NOT in
  // OPENAI_API_KEY, which nothing sets. Presence only, never the value.
  //
  // The pass condition is "signed in somehow", not "has a U-M key": students on their own
  // ChatGPT subscription sign in with a personal account and deliberately have no toolkit
  // config at all. Failing them would be wrong.
  const auth = join(codexHome, 'auth.json');
  if (!existsSync(auth)) {
    throw new Error(
      'no ~/.codex/auth.json — Codex has not been signed in, or was signed in a way this ' +
        'check does not recognise. TO VERIFY: what a personal ChatGPT sign-in writes.',
    );
  }
  if (statSync(auth).size === 0) throw new Error('~/.codex/auth.json is empty');
  let mode;
  try {
    mode = JSON.parse(readFileSync(auth, 'utf8')).auth_mode ?? 'unknown';
  } catch {
    throw new Error('~/.codex/auth.json is not valid JSON — it may have been hand-edited');
  }
  return mode === 'apikey' ? 'API key present' : `signed in (${mode})`;
});

// --- 3. Repositories -------------------------------------------------------

const repositories = phase(3, 'Repositories');

for (const [name, dir] of Object.entries(repos)) {
  repositories(name, () => {
    if (!existsSync(dir)) notYet(`not cloned yet (expected at ${dir})`);
    try {
      gitIn(dir, ['rev-parse', '--is-inside-work-tree']);
    } catch (err) {
      // Say what git said. An earlier version guessed "it may have been downloaded as a zip",
      // which on 2026-08-26 sent a real report to Canvas naming a cause that had not happened:
      // the clones were fine and git was refusing them for dubious ownership. This output is
      // read by an instructor deciding what to repair, so a plausible guess is worse than a
      // quotation — it is confident, wrong, and indistinguishable from a diagnosis.
      const said = String(err.message || err).trim();
      if (/dubious ownership/i.test(said))
        throw new Error(
          `${dir} exists and is a real clone, but git refuses it: it is owned by a different ` +
            `account than the one running this check. On Windows this means setup cloned while ` +
            `elevated and did not register the repository as safe afterwards. Re-run the setup; ` +
            `it repairs this. git said:\n${said}`,
        );
      throw new Error(`${dir} is not usable as a git checkout. git said:\n${said}`);
    }
    // course-materials keeps `origin` and is pull-only; the two student repos are renamed to
    // `upstream` on day 1 so that week 2 can add a personal `origin` without undoing anything.
    const wanted = name === 'course-materials' ? 'origin' : 'upstream';
    let url;
    try {
      url = gitIn(dir, ['remote', 'get-url', wanted]);
    } catch {
      throw new Error(`no "${wanted}" remote, so course updates will not reach you`);
    }
    // Safe to print: `upstream` is the instructor's public template, the same for everyone.
    // It is the personal `origin` of learning-topics that stays unreported (phase 7).
    return `${url} (on ${gitIn(dir, ['rev-parse', '--abbrev-ref', 'HEAD'])})`;
  });
}

repositories('course-materials unmodified', () => {
  // A pull-only clone, so anything local is either an accidental edit or an agent that was
  // told not to write here and did. Free detection beats prevention the sandbox cannot give.
  const dirty = gitIn(materials, ['status', '--porcelain']);
  if (dirty) {
    const n = dirty.split('\n').length;
    throw new Error(`${n} local change${n === 1 ? '' : 's'} — the next "git pull" will conflict`);
  }
  return 'clean';
});

// --- 4. Addressing ---------------------------------------------------------

const addressing = phase(4, 'Addressing');

addressing('~/.codex/AGENTS.md', () => {
  if (!agentsText) notYet('not written yet');
  const missing = Object.entries(repos)
    .filter(([, dir]) => !existsSync(dir))
    .map(([name]) => name);
  if (missing.length)
    throw new Error(`names paths that do not exist: ${missing.join(', ')} — did a folder move?`);
  return `${agentsText.split('\n').filter((l) => l.trim()).length} lines, paths resolve`;
});

addressing('entry-point index', () => {
  const index = join(materials, 'AGENTS.md');
  if (!existsSync(index)) throw new Error('course-materials/AGENTS.md is missing from the clone');
  return 'present';
});

// --- 5. Smoke test ---------------------------------------------------------

const smoke = phase(5, 'Smoke test');

smoke('the tour ran', () => {
  const artifact = join(repos['learning-topics'], 'tour.md');
  if (!existsSync(artifact)) notYet('tour.md not written yet');
  const text = readFileSync(artifact, 'utf8');
  const m = /on (\d{4}-\d{2}-\d{2})/.exec(text);
  if (!m) throw new Error('tour.md exists but carries no date — was it written by the script?');
  if (/separate repositories \| \*\*no/.test(text))
    throw new Error('the tour ran but your work is inside the course files — tell your instructor');
  return `ran ${m[1]}`;
});

// --- 6. Editors ------------------------------------------------------------
//
// Blocking, like every other phase. An earlier draft made this optional on the reasoning that
// the agent reads and writes the files either way — which is true and beside the point. The tour
// ends by having the student open its file themselves, `study` has them writing notes.md, and
// the diagram work needs Camunda. Without an editor they can watch an agent describe their own
// work and never read or write it, which is not ready.

const editors = phase(6, 'Editors');

// Where an installed application lives, per platform.
//
// On a Mac both are an app bundle dragged into /Applications, and `setup-editors` puts them
// there. On Windows there is no single answer, so look in every place the student could
// plausibly have ended up and pass if any of them exists:
//
//   - Zettlr's installer is NSIS with perMachine:false, so its default is the per-user
//     %LOCALAPPDATA%\Programs\Zettlr. But it also sets allowElevation and
//     allowToChangeInstallationDirectory, so a student who clicked through the wizard rather
//     than taking the silent install may have put it in Program Files instead. Both are a
//     working install; neither should fail this check.
//   - Camunda ships no Windows installer at all, only a zip, so its location is entirely
//     whatever `setup-editors` chose to unpack it to. Keep these two in step: if that skill's
//     destination changes, this is the other end of the same decision.
//
// Anything that is neither macOS nor Windows is not a platform this course supports, and
// saying so is more use than a check that silently passes.

const mac = platform() === 'darwin';
const windows = platform() === 'win32';

const programs = (...rest) => {
  const roots = [process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs'), process.env.PROGRAMFILES];
  return roots.filter(Boolean).map((root) => join(root, ...rest));
};

const installed = (label, macPath, winPaths) => () => {
  if (mac) {
    if (!existsSync(macPath)) notYet(`${label} not installed`);
  } else if (windows) {
    if (!winPaths().some(existsSync)) notYet(`${label} not installed`);
  } else {
    notYet(`${platform()} is not a supported platform — tell your instructor`);
  }
  return label;
};

editors(
  'Markdown editor',
  installed('Zettlr', '/Applications/Zettlr.app', () => programs('Zettlr', 'Zettlr.exe')),
);

editors(
  'BPMN editor',
  installed('Camunda Modeler', '/Applications/Camunda Modeler.app', () =>
    programs('camunda-modeler', 'Camunda Modeler.exe'),
  ),
);

// Zettlr's autosave setting, which `setup-editors` writes into Zettlr's own configuration file
// before Zettlr's first launch.
//
// This is checked and not merely assumed because the step can fail silently. Zettlr shows a
// welcome wizard on first launch, and that wizard's autosave question offers only "manually"
// and "immediately" — there is no short-delay answer on it. Writing the file first sets the
// preference AND suppresses the wizard; if the write did not happen, the student is shown a
// screen whose only working choice is the one the step exists to avoid, and nothing downstream
// would notice. An install that is present but unconfigured is the failure this catches.
//
// A wrong value is a FAIL rather than a `not yet`: the file only exists because something wrote
// it, so a value other than "delayed" means setup ran and produced the wrong state.

const zettlrConfig = mac
  ? join(homedir(), 'Library', 'Application Support', 'Zettlr', 'config.json')
  : process.env.APPDATA && join(process.env.APPDATA, 'Zettlr', 'config.json');

editors('Zettlr autosave', () => {
  if (!mac && !windows) notYet(`${platform()} is not a supported platform — tell your instructor`);
  if (!zettlrConfig || !existsSync(zettlrConfig)) notYet('Zettlr not configured yet');

  let config;
  try {
    config = JSON.parse(readFileSync(zettlrConfig, 'utf8'));
  } catch {
    throw new Error('Zettlr config.json is not valid JSON — it may have been hand-edited');
  }

  const autoSave = config.editor?.autoSave;
  if (autoSave === 'delayed') return 'saves a few seconds after you stop typing';
  if (autoSave === undefined) throw new Error('no autosave setting written — re-run setup-editors');
  throw new Error(`set to "${autoSave}", should be "delayed" — re-run setup-editors`);
});

// --- 7. Remote -------------------------------------------------------------

const remote = phase(7, 'Remote');

remote('git identity', () => {
  const val = (k) => {
    try {
      return gitIn(repos['learning-topics'], ['config', '--get', k]);
    } catch {
      return '';
    }
  };
  const name = val('user.name');
  const email = val('user.email');
  if (!name || !email) notYet('not set — git cannot record who made a commit');
  return `${name} <${email}>`;
});

for (const name of ['learning-topics', 'assignments']) {
  remote(`${name} published`, () => {
    const dir = repos[name];
    if (!existsSync(dir)) notYet('repository not cloned yet');
    let url;
    try {
      url = gitIn(dir, ['remote', 'get-url', 'origin']);
    } catch {
      notYet('no personal remote yet — this happens in week 2');
    }
    // The assignments URL is the roster mapping and goes in the report. The learning-topics
    // URL does not: that repository is the student's own (§2).
    return name === 'assignments' ? url : 'published';
  });
}

// The teaching team, by GitHub username. One person this term; kept as a list so that adding
// someone is an edit to this line rather than a change of shape.
//
// WHY THIS IS CHECKED AT ALL. Adding the teaching team to `assignments` is the one grant in the
// whole design that positively must happen, it is a single API call that can fail quietly, and
// — because a repository owned by a personal account has only two tiers, owner and collaborator,
// with no admin tier — the student is the only person who can ever repair it. Unchecked, a
// student who skipped or fumbled step 5 of `setup-github` is discovered at grading in week 3,
// one at a time, and the fix is an email asking them to run a command. The counterpart check
// below verifies the negative (that `learning-topics` was NOT shared); this verifies the
// positive, and both are needed.
//
// `not yet` rather than a failure when nobody has been added: that is a student part-way
// through week 2, not a broken machine. It still holds the phase frontier back, so
// `setup-github`'s own "reached 7 of 7" check is what catches it — at setup time, which is the
// whole point.

const teachingTeam = ['presnick'];

remote('teaching team can read assignments', () => {
  const dir = repos['assignments'];
  if (!existsSync(dir)) notYet('repository not cloned yet');
  let url;
  try {
    url = gitIn(dir, ['remote', 'get-url', 'origin']);
  } catch {
    notYet('no personal remote yet — this happens in week 2');
  }
  const slug = /github\.com[/:]([^/]+\/[^/.]+)/.exec(url);
  if (!slug) notYet(`cannot tell from this remote (${url.replace(/\/\/[^@]*@/, '//')})`);

  const logins = (endpoint, jq) => {
    return run('gh', ['api', `repos/${slug[1]}/${endpoint}`, '--jq', jq])
      .split('\n')
      .filter(Boolean)
      .map((n) => n.toLowerCase());
  };

  // Adding a collaborator to a personal repository sends an invitation rather than granting
  // access outright, so someone who has been added but has not yet accepted appears only in
  // the second list. That is the student's obligation discharged: they are not left failing a
  // check that only their instructor can clear.
  let have;
  try {
    have = logins('collaborators', '.[].login');
  } catch {
    notYet('not checked — needs the GitHub CLI, signed in');
  }
  let invited = [];
  try {
    invited = logins('invitations', '.[].invitee.login');
  } catch {
    // An unreadable invitation list is not evidence of anything; fall back to what we know.
  }

  const wanted = teachingTeam.map((n) => n.toLowerCase());
  const missing = wanted.filter((n) => !have.includes(n) && !invited.includes(n));
  if (missing.length === wanted.length) notYet('not added yet — this is step 5 of setup-github');
  if (missing.length)
    throw new Error(`${missing.join(', ')} still missing — re-run step 5 of setup-github`);

  const pending = wanted.filter((n) => !have.includes(n));
  if (pending.length) return `invited ${pending.join(', ')} — not accepted yet, which is fine`;
  return teachingTeam.join(', ');
});

remote(
  'learning-topics is private to you',
  () => {
  // The learning log is the student's own and the instructor never sees it — that is what makes
  // the ungraded-learning rule structural rather than a promise (§2). Sharing it anyway is the
  // student's call to make, so a collaborator is reported and confirmed, never failed. What this
  // catches is the student who shared it without meaning to.
  const dir = repos['learning-topics'];
  if (!existsSync(dir)) notYet('repository not cloned yet');
  let url;
  try {
    url = gitIn(dir, ['remote', 'get-url', 'origin']);
  } catch {
    notYet('not published yet');
  }
  const slug = /github\.com[/:]([^/]+\/[^/.]+)/.exec(url);
  if (!slug) notYet(`cannot tell from this remote (${url.replace(/\/\/[^@]*@/, '//')})`);
  let names;
  try {
    names = run('gh', ['api', `repos/${slug[1]}/collaborators`, '--jq', '.[].login'])
      .split('\n')
      .filter(Boolean);
  } catch {
    notYet('not checked — needs the GitHub CLI, signed in');
  }
  const others = names.filter((n) => !url.includes(n));
    if (others.length)
      return `SHARED WITH ${others.join(', ')} — if you did not mean to, tell your instructor`;
    return 'private';
  },
  { advisory: true },
);

// --- config.toml, reported alongside Runtime -------------------------------

runtime('Codex configuration', () => {
  const cfg = join(codexHome, 'config.toml');
  if (!existsSync(cfg)) notYet('no ~/.codex/config.toml — expected if you use a personal account');
  const text = readFileSync(cfg, 'utf8');
  if (!/api\.toolkit\.umgpt\.umich\.edu/.test(text))
    notYet('no U-M gateway configured — expected if you use a personal account');

  // The ITS documentation nests `model` inside [model_providers.toolkit], where Codex's schema
  // does not read it. That mistake costs about 2.5x in tokens. Neither value is
  // secret, so both can be reported.
  const provider = /\[model_providers\.toolkit\]([\s\S]*?)(?=\n\[|$)/.exec(text);
  if (provider && /^\s*model\s*=/m.test(provider[1]))
    throw new Error(
      'model is nested inside [model_providers.toolkit], where Codex ignores it — this is the ' +
        'ITS documentation bug, and it costs about 2.5x. Use the config from this course.',
    );
  const top = /^\s*model\s*=\s*"([^"]+)"/m.exec(text);
  return `U-M gateway, model ${top ? top[1] : 'not set'}`;
});

// --- report ----------------------------------------------------------------

const gating = (p) => p.checks.filter((c) => !c.advisory);
const failed = phases.flatMap((p) => gating(p).filter((c) => c.state === FAIL));

// The frontier is the last phase whose checks all passed, counting from the first. A phase with
// anything `not yet` stops the count — that is what "contiguous" means here.
let frontier = phases[0];
for (const p of phases) {
  if (gating(p).every((c) => c.state === OK)) frontier = p;
  else break;
}

// A phase passing while an earlier one did not is a state nobody designed, so say so — and name
// both halves. Saying only which one passed leaves the reader asking which one didn't, which is
// the whole content of the warning.
const frontierIndex = phases.indexOf(frontier);
const after = phases.slice(frontierIndex + 1);
const leapfrogged = after.filter((p) => gating(p).length && gating(p).every((c) => c.state === OK));
const skipped = after.filter((p) => gating(p).length && !gating(p).every((c) => c.state === OK));

const width = Math.max(...phases.flatMap((p) => p.checks.map((c) => c.label.length)));
const lines = ['SI 212 — first-day setup check', `${new Date().toISOString().slice(0, 10)}  ${platform()}  node ${process.version}`, ''];

for (const p of phases) {
  lines.push(`${p.n}. ${p.name}`);
  for (const c of p.checks)
    lines.push(`   ${c.state.padEnd(7)}  ${c.label.padEnd(width)}  ${c.detail}${c.advisory ? '' : ''}`);
  lines.push('');
}

lines.push(`Reached ${frontier.n} of ${phases[phases.length - 1].n} — ${frontier.name}.`);
if (leapfrogged.length)
  lines.push(
    `Note: ${leapfrogged.map((p) => p.name).join(' and ')} passed, but ` +
      `${skipped.map((p) => `${p.n} ${p.name}`).join(' and ')} did not. The setup does not ` +
      `produce that order, so something was run out of sequence or has stopped working since. ` +
      `Show this to your instructor.`,
  );
if (failed.length) lines.push(`${failed.length} check${failed.length === 1 ? '' : 's'} failed.`);
lines.push('', 'Copy everything above into the Canvas assignment — including if it failed.');

console.log(lines.join('\n'));

// Deliberately not `process.exit()`: let stdout flush first. The exit code is for the agent
// that ran this; the student reads the text. `not yet` does not fail — see the header.
process.exitCode = failed.length ? 1 : 0;
