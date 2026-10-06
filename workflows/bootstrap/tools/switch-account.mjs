// Move Codex off the U-M gateway and onto the student's own ChatGPT account, or back again.
//
//   node workflows/bootstrap/tools/switch-account.mjs           switch to their own account
//   node workflows/bootstrap/tools/switch-account.mjs --back    restore the U-M gateway
//
// The app reads its settings only when it starts, so this changes them and the student finishes
// the switch by logging out, restarting and signing in. A run ends in one of three lines, and
// the skill acts on which one it got:
//
//   SWITCHED: ...           the settings are right; log out, restart and sign in
//   ALREADY SWITCHED: ...   signed in with a ChatGPT account, no gateway configured
//   STOPPED: ...            something here is not what the course installed
//
// WHAT CHANGES. In ~/.codex/config.toml, the top-level `model_provider = "toolkit"`, `model` and
// `model_reasoning_effort` lines and the whole [model_providers.toolkit] section, and nothing
// else. The model lines go because they pin the course's gateway starting point, Luna at medium,
// and left in place they would override the model the student picks in the app.
//
// --BACK PUTS LINES IN, IT NEVER REPLACES THE FILE. The app writes its own settings into
// config.toml (plugins, projects, desktop preferences), so a copy taken at the switch is stale
// by the time anyone wants it back. Instead --back takes the gateway lines from the course's
// own config/codex-config.toml, the file first-day setup installed, and adds them to whatever
// is there now, replacing only the top-level model and effort.
//
// THE SIGN-IN IS NOT TOUCHED. The student logs out of the U-M key with the app's own Logout, and
// this only reads which way the app is signed in. Signing the app out from here would pull the
// key from under the very turn that is running this.
//
// It never prints auth.json or any part of the key. Only its auth_mode field is read.
//
// Exit code 1 on STOPPED.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const codexHome = join(homedir(), ".codex");
const config = join(codexHome, "config.toml");
const auth = join(codexHome, "auth.json");
const courseConfig = join(dirname(fileURLToPath(import.meta.url)), "..", "config", "codex-config.toml");

const GATEWAY = /api\.toolkit\.umgpt\.umich\.edu/;
const PROVIDER_LINE = /^\s*model_provider\s*=\s*"toolkit"\s*(#.*)?$/;
const MODEL_LINE = /^\s*(model|model_reasoning_effort)\s*=/;
const SECTION = /^\s*\[model_providers\.toolkit\]\s*(#.*)?$/;
const ANY_SECTION = /^\s*\[/;

const say = (status, text) => {
  console.log(`${status}: ${text}`);
  if (status === "STOPPED") process.exitCode = 1;
};

// Only auth_mode, never the rest: the file holds the key.
const authMode = () => {
  if (!existsSync(auth)) return null;
  try {
    return JSON.parse(readFileSync(auth, "utf8")).auth_mode ?? "unknown";
  } catch {
    return "unreadable";
  }
};

// --- back to the gateway ----------------------------------------------------

if (process.argv.includes("--back")) {
  const text = existsSync(config) ? readFileSync(config, "utf8") : "";
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text ? text.split(/\r?\n/) : [];
  if (lines.some((l) => SECTION.test(l) || PROVIDER_LINE.test(l))) {
    say("ALREADY SWITCHED BACK", "config.toml already points at the U-M gateway");
    process.exit();
  }

  // The course file, split into its top-level settings and its [model_providers.toolkit] section.
  const course = readFileSync(courseConfig, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#"));
  const at = course.findIndex((l) => SECTION.test(l));
  const top = course.slice(0, at);
  const section = course.slice(at);

  // Top-level keys must come before the first [section], so they go first. Any top-level model
  // or effort the student had is dropped in favour of the course's.
  let topLevel = true;
  const kept = lines.filter((l) => {
    if (ANY_SECTION.test(l)) topLevel = false;
    return !(topLevel && MODEL_LINE.test(l));
  });
  while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
  const result = [...top, ...kept, "", ...section, ""].join(eol);
  writeFileSync(config, result);
  say("SWITCHED BACK", "put the U-M gateway and the course's starting model back in config.toml");
  process.exit();
}

// --- to their own account ---------------------------------------------------

const changed = [];

if (existsSync(config)) {
  const text = readFileSync(config, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const kept = [];
  let inSection = false;
  const lines = text.split(/\r?\n/);
  // Only while the gateway is still here. Afterwards a model line is the student's own choice.
  const onGateway = lines.some((l) => SECTION.test(l) || PROVIDER_LINE.test(l));
  let topLevel = onGateway; // and only above the first [section]
  for (const line of lines) {
    if (ANY_SECTION.test(line)) topLevel = false;
    if (SECTION.test(line)) inSection = true;
    else if (inSection && ANY_SECTION.test(line)) inSection = false;
    if (inSection || PROVIDER_LINE.test(line)) continue;
    if (topLevel && MODEL_LINE.test(line)) continue;
    kept.push(line);
  }
  const result = kept.join(eol);
  // Something pointing at the gateway that is not the course's file. Not ours to rewrite, so
  // stop before writing anything.
  if (GATEWAY.test(result)) {
    say("STOPPED", `config.toml mentions the U-M gateway outside the [model_providers.toolkit] section`);
    process.exit();
  }
  if (result !== text) {
    writeFileSync(config, result);
    changed.push("removed the U-M gateway and the course's starting model from config.toml");
  }
}

if (changed.length) say("SWITCHED", changed.join(" and "));
else if (authMode() === "chatgpt") say("ALREADY SWITCHED", "signed in with a ChatGPT account, no U-M gateway configured");
else say("SWITCHED", "the U-M gateway was already gone, but the app is not signed in with a ChatGPT account yet");
