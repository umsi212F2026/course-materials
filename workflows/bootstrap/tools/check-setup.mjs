// Check that a student's machine is actually set up, and print a report they can paste
// into Canvas.
//
//   node workflows/bootstrap/tools/check-setup.mjs
//
// Takes no arguments — see the note on phases below.
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
// SESSIONS. Those phases are grouped into three class-day sessions, and each one ends with the
// student pasting this report into a different Canvas assignment — Installation 1, 2 and 3. So
// the report says where all THREE stand, every time.
//
// It never names the one they are handing in today, and cannot: a finished Installation 1 and a
// failed Installation 2 both leave the frontier at 5, and what separates them is what happened
// in the session rather than anything on disk. Guessing is worse than not saying, because a
// student sent to the wrong assignment has no way to know they were. Reporting all three makes
// the same block correct in whichever one it is pasted into.
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

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { platform, homedir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const materials = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const codexHome = join(homedir(), ".codex");

// `git --version` and friends write to stderr on some platforms even when they succeed, so
// capture both and let a non-zero exit be the only failure signal.
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  }).trim();

const gitIn = (dir, args) => run("git", args, { cwd: dir });

// --- where the repositories are --------------------------------------------
//
// Prefer what ~/.codex/AGENTS.md records, because that is the one place the install location
// is written down and the student may have chosen anywhere (§8). Fall back to the parent of
// this clone, which is where setup puts them — needed because the Repositories phase is
// checked BEFORE the Addressing phase writes that file.

const agentsPath = join(codexHome, "AGENTS.md");
const agentsText = existsSync(agentsPath) ? readFileSync(agentsPath, "utf8") : "";

const recorded = (label) => {
  const m = new RegExp(`^${label}:\\s*(\\S.*?)\\s*$`, "im").exec(agentsText);
  return m ? m[1] : null;
};

const parent = dirname(materials);
const repos = {
  "course-materials": materials,
  "learning-topics": recorded("Learning topics") ?? join(parent, "learning-topics"),
  assignments: recorded("Assignments") ?? join(parent, "assignments"),
};

// --- check plumbing --------------------------------------------------------

const OK = "PASS";
const NOTYET = "not yet";
const FAIL = "FAIL";
// Reported by the student and taken on trust, not established by this program. Kept visibly
// apart from PASS because an instructor triaging forty-eight of these should be able to see at
// a glance which lines are evidence and which are testimony — and because the difference
// between a machine-adjudicated check and a judged one is something this course teaches.
const SAID = "CONFIRMED";

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
      const detail = fn() || "ok";
      p.checks.push({ state: opts.attested ? SAID : OK, label, detail, ...opts });
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

const runtime = phase(2, "Runtime");

runtime("Node.js", () => {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 18) throw new Error(`found ${process.version}, need 18 or newer`);
  return process.version;
});

runtime("git", () => {
  try {
    return run("git", ["--version"]);
  } catch {
    throw new Error("not installed, or not on PATH");
  }
});

runtime("signed in to Codex", () => {
  // The key lives in ~/.codex/auth.json, written by the app's own sign-in — NOT in
  // OPENAI_API_KEY, which nothing sets. Presence only, never the value.
  //
  // The pass condition is "signed in somehow", not "has a U-M key": students on their own
  // ChatGPT subscription sign in with a personal account and deliberately have no toolkit
  // config at all. Failing them would be wrong.
  const auth = join(codexHome, "auth.json");
  if (!existsSync(auth)) {
    throw new Error(
      "no ~/.codex/auth.json — Codex has not been signed in, or was signed in a way this " +
        "check does not recognise. TO VERIFY: what a personal ChatGPT sign-in writes.",
    );
  }
  if (statSync(auth).size === 0) throw new Error("~/.codex/auth.json is empty");
  let mode;
  try {
    mode = JSON.parse(readFileSync(auth, "utf8")).auth_mode ?? "unknown";
  } catch {
    throw new Error("~/.codex/auth.json is not valid JSON — it may have been hand-edited");
  }
  return mode === "apikey" ? "API key present" : `signed in (${mode})`;
});

// --- 3. Repositories -------------------------------------------------------

const repositories = phase(3, "Repositories");

for (const [name, dir] of Object.entries(repos)) {
  repositories(name, () => {
    if (!existsSync(dir)) notYet(`not cloned yet (expected at ${dir})`);
    try {
      gitIn(dir, ["rev-parse", "--is-inside-work-tree"]);
    } catch (err) {
      // Say what git said, never a guess at why. This output is read by an instructor deciding
      // what to repair, and a plausible wrong cause is worse than a quotation — it is
      // confident and indistinguishable from a diagnosis.
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
    const wanted = name === "course-materials" ? "origin" : "upstream";
    let url;
    try {
      url = gitIn(dir, ["remote", "get-url", wanted]);
    } catch {
      throw new Error(`no "${wanted}" remote, so course updates will not reach you`);
    }
    // Safe to print: `upstream` is the instructor's public template, the same for everyone.
    // It is the personal `origin` of learning-topics that stays unreported (phase 7).
    return `${url} (on ${gitIn(dir, ["rev-parse", "--abbrev-ref", "HEAD"])})`;
  });
}

repositories("course-materials unmodified", () => {
  // A pull-only clone, so anything local is either an accidental edit or an agent that was
  // told not to write here and did. Free detection beats prevention the sandbox cannot give.
  const dirty = gitIn(materials, ["status", "--porcelain"]);
  if (dirty) {
    const n = dirty.split("\n").length;
    throw new Error(
      `${n} local change${n === 1 ? "" : "s"} — the next "git pull" will conflict`,
    );
  }
  return "clean";
});

// --- 4. Addressing ---------------------------------------------------------

const addressing = phase(4, "Addressing");

addressing("~/.codex/AGENTS.md", () => {
  if (!agentsText) notYet("not written yet");
  const missing = Object.entries(repos)
    .filter(([, dir]) => !existsSync(dir))
    .map(([name]) => name);
  if (missing.length)
    throw new Error(
      `names paths that do not exist: ${missing.join(", ")} — did a folder move?`,
    );
  return `${agentsText.split("\n").filter((l) => l.trim()).length} lines, paths resolve`;
});

addressing("entry-point index", () => {
  const index = join(materials, "AGENTS.md");
  if (!existsSync(index))
    throw new Error("course-materials/AGENTS.md is missing from the clone");
  return "present";
});

// --- 5. Smoke test ---------------------------------------------------------

const smoke = phase(5, "Smoke test");

smoke("the smoke test ran", () => {
  const artifact = join(repos["learning-topics"], "setup.md");
  if (!existsSync(artifact)) notYet("setup.md not written yet");
  const text = readFileSync(artifact, "utf8");
  const m = /on (\d{4}-\d{2}-\d{2})/.exec(text);
  if (!m)
    throw new Error("setup.md exists but carries no date — was it written by the script?");
  if (/separate repositories \| \*\*no/.test(text))
    throw new Error(
      "the smoke test ran but your work is inside the course files — tell your instructor",
    );
  return `ran ${m[1]}`;
});

// --- 6. Editors ------------------------------------------------------------
//
// Blocking, like every other phase. An earlier draft made this optional on the reasoning that
// the agent reads and writes the files either way — which is true and beside the point. The
// smoke test ends by having the student open setup.md themselves and `study` has them writing
// notes.md. Without an editor they can watch an agent
// describe their own work and never read or write it, which is not ready.

const editors = phase(6, "Editors");

const windows = platform() === "win32";

// NOTHING ABOUT THE EDITOR CAN BE CHECKED FROM HERE, and the attempt was removed rather than
// weakened. This program runs inside the agent's sandbox, which grants read and execute only on
// C:\Windows, C:\Program Files, C:\Program Files (x86) and C:\ProgramData. Zettlr's installer is
// per-user and there is no machine-scope variant, so it lands under %LOCALAPPDATA%\Programs and
// every read of it — including a listing of the parent directory — comes back EPERM. Measured
// 2026-09-01; see openai/codex#27171.
//
// WHAT REPLACES IT IS BETTER, WHICH IS WHY THIS IS NOT A LOSS. The check below reads the record
// setup-editors writes after watching the student open one of their own files in Zettlr. A
// student who did that has a working editor — which is more than a folder's existence ever
// proved — and it catches the failure the old file check was added for: an install that reached
// only the agent's private storage is an install the student cannot open a file in, so no
// record gets written and the phase fails, correctly.
//
// So phase 6 is attested and nothing else. The report says CONFIRMED rather than PASS, which is
// the honest word for it.

// CAMUNDA IS CHECKED THE SAME WAY, AND ONLY THAT WAY. It is installed in this session again —
// Installation 2 is the class session about workflows, so the diagram is the day's material.
//
// Unlike Zettlr it COULD be checked on disk: setup-editors installs it to
// C:\Program Files\Camunda Modeler on Windows and /Applications on macOS, and the sandbox can
// read both. Not doing it is a choice, and the same one made for Zettlr on 2026-08-31 — the
// attested check below subsumes a path test rather than merely resembling one, and here it
// claims MORE than a path test could. The line means the student double-clicked a .bpmn and
// Camunda opened it, which on Windows also establishes that they claimed a file type no
// installer registers. A folder existing establishes neither.

// What the student did, rather than what is on disk.
//
// Installing an editor is not the point; being able to open your own work in it is, and no
// program can establish that from here. `setup-editors` walks them through opening a real file
// in each, sees a screenshot of the result, and records its verdict. This reads that record.
//
// It is taken on trust, and the report says so rather than blurring it into the checks this
// program made itself.

const verdicts = join(parent, ".si212-editors.json");

const opened = (label, key, what) =>
  editors(
    label,
    () => {
      if (!existsSync(verdicts)) notYet(`not confirmed yet — ${what}`);
      let record;
      try {
        record = JSON.parse(readFileSync(verdicts, "utf8"));
      } catch {
        throw new Error(`${verdicts} is not valid JSON — re-run setup-editors`);
      }
      const entry = record[key];
      if (!entry?.opened) notYet(`not confirmed yet — ${what}`);
      return `${entry.opened}${entry.on ? `, ${entry.on}` : ""}`;
    },
    { attested: true },
  );

opened("you opened a file in Zettlr", "zettlr", "open one of your own notes in Zettlr");
opened(
  "you opened a diagram in Camunda",
  "camunda",
  "double-click a .bpmn file and have Camunda Modeler open it",
);

// --- 7. Remote -------------------------------------------------------------

const remote = phase(7, "Remote");

remote("git identity", () => {
  const val = (k) => {
    try {
      return gitIn(repos["learning-topics"], ["config", "--get", k]);
    } catch {
      return "";
    }
  };
  const name = val("user.name");
  const email = val("user.email");
  if (!name || !email) notYet("not set — git cannot record who made a commit");
  return `${name} <${email}>`;
});

for (const name of ["learning-topics", "assignments"]) {
  remote(`${name} published`, () => {
    const dir = repos[name];
    if (!existsSync(dir)) notYet("repository not cloned yet");
    let url;
    try {
      url = gitIn(dir, ["remote", "get-url", "origin"]);
    } catch {
      notYet("no personal remote yet — this happens in week 2");
    }
    // The assignments URL is the roster mapping and goes in the report. The learning-topics
    // URL does not: that repository is the student's own (§2).
    return name === "assignments" ? url : "published";
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

const teachingTeam = ["presnick"];

remote("teaching team can read assignments", () => {
  const dir = repos["assignments"];
  if (!existsSync(dir)) notYet("repository not cloned yet");
  let url;
  try {
    url = gitIn(dir, ["remote", "get-url", "origin"]);
  } catch {
    notYet("no personal remote yet — this happens in week 2");
  }
  const slug = /github\.com[/:]([^/]+\/[^/.]+)/.exec(url);
  if (!slug) notYet(`cannot tell from this remote (${url.replace(/\/\/[^@]*@/, "//")})`);

  const logins = (endpoint, jq) => {
    return run("gh", ["api", `repos/${slug[1]}/${endpoint}`, "--jq", jq])
      .split("\n")
      .filter(Boolean)
      .map((n) => n.toLowerCase());
  };

  // Adding a collaborator to a personal repository sends an invitation rather than granting
  // access outright, so someone who has been added but has not yet accepted appears only in
  // the second list. That is the student's obligation discharged: they are not left failing a
  // check that only their instructor can clear.
  let have;
  try {
    have = logins("collaborators", ".[].login");
  } catch {
    notYet("not checked — needs the GitHub CLI, signed in");
  }
  let invited = [];
  try {
    invited = logins("invitations", ".[].invitee.login");
  } catch {
    // An unreadable invitation list is not evidence of anything; fall back to what we know.
  }

  const wanted = teachingTeam.map((n) => n.toLowerCase());
  const missing = wanted.filter((n) => !have.includes(n) && !invited.includes(n));
  if (missing.length === wanted.length)
    notYet("not added yet — this is step 6 of setup-github");
  if (missing.length)
    throw new Error(`${missing.join(", ")} still missing — re-run step 6 of setup-github`);

  const pending = wanted.filter((n) => !have.includes(n));
  if (pending.length) return `invited ${pending.join(", ")} — not accepted yet, which is fine`;
  return teachingTeam.join(", ");
});

remote(
  "learning-topics is private to you",
  () => {
    // The learning log is the student's own and the instructor never sees it — that is what makes
    // the ungraded-learning rule structural rather than a promise (§2). Sharing it anyway is the
    // student's call to make, so a collaborator is reported and confirmed, never failed. What this
    // catches is the student who shared it without meaning to.
    const dir = repos["learning-topics"];
    if (!existsSync(dir)) notYet("repository not cloned yet");
    let url;
    try {
      url = gitIn(dir, ["remote", "get-url", "origin"]);
    } catch {
      notYet("not published yet");
    }
    const slug = /github\.com[/:]([^/]+\/[^/.]+)/.exec(url);
    if (!slug) notYet(`cannot tell from this remote (${url.replace(/\/\/[^@]*@/, "//")})`);
    let names;
    try {
      names = run("gh", ["api", `repos/${slug[1]}/collaborators`, "--jq", ".[].login"])
        .split("\n")
        .filter(Boolean);
    } catch {
      notYet("not checked — needs the GitHub CLI, signed in");
    }
    const others = names.filter((n) => !url.includes(n));
    if (others.length)
      return `SHARED WITH ${others.join(", ")} — if you did not mean to, tell your instructor`;
    return "private";
  },
  { advisory: true },
);

// --- config.toml, reported alongside Runtime -------------------------------

runtime("Codex configuration", () => {
  const cfg = join(codexHome, "config.toml");
  if (!existsSync(cfg))
    notYet("no ~/.codex/config.toml — expected if you use a personal account");
  const text = readFileSync(cfg, "utf8");
  if (!/api\.toolkit\.umgpt\.umich\.edu/.test(text))
    notYet("no U-M gateway configured — expected if you use a personal account");

  // The ITS documentation nests `model` inside [model_providers.toolkit], where Codex's schema
  // does not read it. That mistake costs about 2.5x in tokens. Neither value is
  // secret, so both can be reported.
  const provider = /\[model_providers\.toolkit\]([\s\S]*?)(?=\n\[|$)/.exec(text);
  if (provider && /^\s*model\s*=/m.test(provider[1]))
    throw new Error(
      "model is nested inside [model_providers.toolkit], where Codex ignores it — this is the " +
        "ITS documentation bug, and it costs about 2.5x. Use the config from this course.",
    );
  // Report the effort alongside the model. It is roughly half of what a session costs and
  // nothing else records it anywhere — not the session log, not the app — so a report that
  // names only the model cannot be compared with another one.
  const top = /^\s*model\s*=\s*"([^"]+)"/m.exec(text);
  const effort = /^\s*model_reasoning_effort\s*=\s*"([^"]+)"/m.exec(text);
  return `U-M gateway, model ${top ? top[1] : "not set"}, effort ${effort ? effort[1] : "not set"}`;
});

// --- the sandbox, reported alongside Runtime -------------------------------
//
// WINDOWS ONLY, and advisory. This gates nothing and can never fail: it is telemetry,
// collected because forty-eight Canvas submissions are the only sample of real machines this
// course will ever get.
//
// WHY IT IS HERE. Codex runs commands inside a sandbox, and on Windows there are two
// implementations of it — `elevated`, which needs an administrator to set up, and `unelevated`,
// which is what a machine falls back to when that is unavailable or fails. Nothing in this
// course chooses between them, so every machine negotiates its own, and NOTHING RECORDS WHICH.
//
// That is how "Windows machines behave differently" became something believed rather than
// measured. Two setup runs disagreed about where an installer's files landed, and with no
// record of the mode either machine was in, the difference got written up as an undetectable
// property of the platform. It may be. It may equally be one machine in each mode. This line
// exists so the next disagreement comes with the one fact that would tell them apart.
//
// It is deliberately NOT reported on macOS: there is one Seatbelt sandbox, no fork to record,
// and a line that always says the same thing trains people to skip it.
//
// WHAT IT CANNOT ESTABLISH, and this is most of it. `.codex-global-state.json` is the app's own
// undocumented internal state, not an interface — it can change shape in any update, and this
// reads it defensively and reports nothing rather than guessing. Worse, the policy it records
// (`workspaceWrite` and friends) is a DIFFERENT AXIS from the elevated/unelevated
// implementation, and whether that implementation is written down anywhere a program can read
// has not been established on a Windows machine. So this reports what it can see and says so;
// where it says `not recorded`, that is a fact about this check, not about the machine.

if (windows)
  runtime(
    "Codex sandbox",
    () => {
      const parts = [];

      // What the config ASKED for. Absent on every student machine today, because the course
      // config does not set it — which is the point of reporting it.
      const cfg = join(codexHome, "config.toml");
      if (existsSync(cfg)) {
        const w = /\[windows\]([\s\S]*?)(?=\n\[|$)/.exec(readFileSync(cfg, "utf8"));
        const asked = w && /^\s*sandbox\s*=\s*"([^"]+)"/m.exec(w[1]);
        parts.push(asked ? `config asks for ${asked[1]}` : "config asks for nothing");
      }

      // What the app actually applied. Report the DISTINCT set rather than picking a thread:
      // the entries are keyed by thread id with no ordering to read, and on the one machine
      // this was written against they were all background threads. A wrong pick reported
      // confidently is worse than a set.
      const state = join(codexHome, ".codex-global-state.json");
      if (existsSync(state)) {
        try {
          const seen = new Set();
          const walk = (o) => {
            if (!o || typeof o !== "object") return;
            if (typeof o.sandboxPolicy?.type === "string") seen.add(o.sandboxPolicy.type);
            for (const v of Object.values(o)) walk(v);
          };
          walk(JSON.parse(readFileSync(state, "utf8")));
          if (seen.size) parts.push(`policy ${[...seen].sort().join(", ")}`);
        } catch {
          // Unreadable or reshaped by an update. Not worth a word to the student.
        }
      }

      // WHO RAN THIS is the question the whole Windows investigation kept failing to answer,
      // and this program CANNOT ANSWER IT. Recorded here so that nobody spends another
      // afternoon looking: measured 2026-08-27 on the ARM64 test machine, a command run by the
      // agent and the same command pasted into the student's own PowerShell reported the same
      // `whoami` (`<host>\a11y`, not a dedicated sandbox user) and the same `TEMP`
      // (`%LOCALAPPDATA%\Temp`, nothing under `\Packages\OpenAI.`).
      //
      // So there is no environment signature separating the two contexts. A draft of this check
      // tested TEMP for the package path and would have reported every agent run as a student
      // run — confidently, and wrongly, which is the failure mode this whole program exists to
      // prevent. If a signature is ever found, this is where it goes.
      //
      // NOTE WHAT THAT MEASUREMENT ALSO SAYS: config.toml asked for `elevated`, and the agent's
      // command showed no sandbox identity at all. Either the mode was not in force, or it does
      // not work the way it is documented to. Unresolved.

      return parts.join("; ") || "not recorded";
    },
    { advisory: true },
  );

// --- report ----------------------------------------------------------------

const gating = (p) => p.checks.filter((c) => !c.advisory);
const failed = phases.flatMap((p) => gating(p).filter((c) => c.state === FAIL));

// A gate is satisfied by `CONFIRMED` as well as by `PASS`. An attested check is weaker
// evidence, and the report keeps the two visibly apart for exactly that reason — but a phase
// whose only remaining evidence is the student's word is a phase they have completed, and a
// gate that can never be satisfied is not a gate. Phase 6 has two attested checks and no other
// kind, so testing for `PASS` alone puts the frontier permanently at 5.
const satisfied = (c) => c.state === OK || c.state === SAID;

// The frontier is the last phase whose checks are all satisfied, counting from the first. A
// phase with anything `not yet` stops the count — that is what "contiguous" means here.
let frontier = phases[0];
for (const p of phases) {
  if (gating(p).every(satisfied)) frontier = p;
  else break;
}

// A phase passing while an earlier one did not is a state nobody designed, so say so — and name
// both halves. Saying only which one passed leaves the reader asking which one didn't, which is
// the whole content of the warning.
const frontierIndex = phases.indexOf(frontier);
const after = phases.slice(frontierIndex + 1);
const leapfrogged = after.filter((p) => gating(p).length && gating(p).every(satisfied));
const skipped = after.filter((p) => gating(p).length && !gating(p).every(satisfied));

// --- the three class-day sessions ------------------------------------------
//
// Which phases belong to which Canvas assignment. `through` is the last phase of a session, so
// a session is done exactly when the frontier has reached it — no separate notion of done, and
// nothing here that can disagree with the number above.
//
// FAIL is reported separately from `not yet` because they are different things to an instructor
// reading forty-eight of these: `not yet` is a student who has not got to that class day, and
// FAIL is one who did and whose machine said no.

const sessions = [
  { n: 1, through: 5 },
  { n: 2, through: 6 },
  { n: 3, through: 7 },
];

let firstPhase = 0;
const sessionRows = sessions.map((s) => {
  const covered = phases.filter((p) => p.n > firstPhase && p.n <= s.through);
  firstPhase = s.through;
  const broke = covered.some((p) => gating(p).some((c) => c.state === FAIL));
  return {
    label: `Installation ${s.n}`,
    covers: covered.map((p) => p.name).join(", "),
    state: frontier.n >= s.through ? "done" : broke ? FAIL : NOTYET,
  };
});

const width = Math.max(...phases.flatMap((p) => p.checks.map((c) => c.label.length)));
const lines = [
  "SI 212 — setup check",
  `${new Date().toISOString().slice(0, 10)}  ${platform()}  node ${process.version}`,
  "",
];

for (const p of phases) {
  lines.push(`${p.n}. ${p.name}`);
  for (const c of p.checks)
    lines.push(
      `   ${c.state.padEnd(9)}  ${c.label.padEnd(width)}  ${c.detail}${c.advisory ? "" : ""}`,
    );
  lines.push("");
}

lines.push(`Reached ${frontier.n} of ${phases[phases.length - 1].n} — ${frontier.name}.`);
if (leapfrogged.length)
  lines.push(
    `Note: ${leapfrogged.map((p) => p.name).join(" and ")} passed, but ` +
      `${skipped.map((p) => `${p.n} ${p.name}`).join(" and ")} did not. The setup does not ` +
      `produce that order, so something was run out of sequence or has stopped working since. ` +
      `Show this to your instructor.`,
  );
if (failed.length)
  lines.push(`${failed.length} check${failed.length === 1 ? "" : "s"} failed.`);

const covWidth = Math.max(...sessionRows.map((r) => r.covers.length));
lines.push("");
for (const r of sessionRows)
  lines.push(`${r.label}  ${r.covers.padEnd(covWidth)}  ${r.state}`);

if (phases.some((p) => p.checks.some((c) => c.state === SAID)))
  lines.push(
    "",
    "PASS is something this program checked. CONFIRMED is something you told it, which it",
    "has no way to check for itself.",
  );

lines.push(
  "",
  "Copy everything above into today's Canvas assignment — Installation 1, 2 or 3, whichever",
  "one you are handing in. Paste all of it, including if something failed: the Installation",
  "lines say how far you have got, and that is what your instructor is reading it for.",
);

console.log(lines.join("\n"));

// Deliberately not `process.exit()`: let stdout flush first. The exit code is for the agent
// that ran this; the student reads the text. `not yet` does not fail — see the header.
process.exitCode = failed.length ? 1 : 0;
