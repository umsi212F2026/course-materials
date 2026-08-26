// Run a scripted scenario through a workflow on a chosen model, and account for what it cost.
//
//   node workflows/develop/tools/model-trial.mjs --scenario <file> --model <name> [options]
//
// Status: draft, 2026-08-25. Written to answer one question — is `gpt-5.6-luna` good enough
// for the learn and develop workflows, given it is 10x cheaper than `gpt-5.6-terra` — and a
// second one it turned out to also answer: how many chats a sitting should be split into.
//
// WHY THIS EXISTS. Two facts make model choice a real decision for this course rather than a
// preference. The U-M gateway does not do prompt caching (ITS, 2026-08-25), so every turn
// re-buys the whole transcript and a session's cost is quadratic in its length. And the
// gateway's models span a 250x price range with, per vendor benchmarks, very little separating
// them on routine coding. Both of those are claims that should be measured on our own workflows
// rather than argued about.
//
// WHAT IT MEASURES. Per turn: prompt tokens, cached tokens (expected 0 — if this is ever
// non-zero, prompt caching has shipped on the gateway), completion tokens, cost,
// wall-clock, and whether the turn errored. Per run: totals, and turns-to-completion, which is
// the number that decides whether a cheap model is actually cheap. A model 10x cheaper that
// needs 3.2x the turns is a wash, because tokens grow with turns squared.
//
// SPENDING. Every run bills a real U-M budget. `--dry-run` is the default for that reason: it
// prints the estimate and exits. Pass `--live` to actually spend. `--probe` runs a single
// trivial turn (a fraction of a cent) and dumps the raw JSON event shapes, which is how the
// token parser below gets pinned to whatever this Codex build actually emits.
//
// A CAVEAT ON THE PARSER. The token-usage field names in `codex exec --json` output have not
// been observed yet — nothing has been run. `readUsage` below therefore tries several plausible
// shapes and reports which one matched, rather than assuming. Run `--probe` first and correct it
// against reality before trusting a number.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

// --- prices ----------------------------------------------------------------

// Per 1M tokens, [prompt, completion]. Copied from https://its.umich.edu/computing/ai/pricing
// on 2026-08-25. The page says pricing is subject to change, so this is a snapshot with a date
// on it, not a constant. These are U-M's numbers and they are what we are billed; the vendor's
// own list differs at least for gpt-5.6-sol.
const PRICES_ASOF = '2026-08-25';
const PRICES = {
  'gpt-5.6-sol': [5.0, 30.0],
  'gpt-5.6-terra': [2.0, 12.0],
  'gpt-5.6-luna': [0.2, 1.2],
  'gpt-5': [1.25, 10.0],
  'gpt-5-mini': [0.25, 2.0],
  'gpt-5.5': [5.0, 30.0],
  'gpt-4.1': [2.0, 8.0],
  'gpt-4.1-mini': [0.4, 1.6],
  'gpt-4.1-nano': [0.1, 0.4],
  'claude-opus-5': [5.0, 25.0],
  'claude-sonnet-5': [2.0, 10.0],
  'claude-haiku-4-5': [1.0, 5.0],
  'o3': [2.0, 8.0],
  'o4-mini': [1.1, 4.4],
};

const costOf = (model, promptTokens, completionTokens) => {
  const p = PRICES[model];
  if (!p) return null;
  return (promptTokens * p[0] + completionTokens * p[1]) / 1_000_000;
};

const usd = (n) => (n === null ? '  n/a  ' : '$' + n.toFixed(4));

// --- the codex binary ------------------------------------------------------

// The desktop app bundles its own CLI, and it is the one students will effectively be running.
// Prefer it over anything on PATH so a trial measures what a student gets.
const BUNDLED = '/Applications/ChatGPT.app/Contents/Resources/codex';
const codexBin = () => (existsSync(BUNDLED) ? BUNDLED : 'codex');

// --- scenario format -------------------------------------------------------

// A scenario is Markdown, so it can be read and edited as prose. Two headings are structural:
//
//   ## turn        everything until the next heading is one learner message
//   ## new chat    end the current chat here; the next turn starts a fresh session
//
// Anything before the first `## turn` is preamble and ignored, so a scenario can carry a
// paragraph explaining what it is testing.
const parseScenario = (text) => {
  const turns = [];
  let current = null;
  let breakBefore = false;

  for (const line of text.split('\n')) {
    const heading = line.match(/^##\s+(turn|new chat)\s*$/i);
    if (heading) {
      if (current) turns.push(current);
      if (/new chat/i.test(heading[1])) {
        current = null;
        breakBefore = true;
      } else {
        current = { text: '', newChat: breakBefore || turns.length === 0 };
        breakBefore = false;
      }
      continue;
    }
    if (current) current.text += line + '\n';
  }
  if (current) turns.push(current);

  return turns
    .map((t) => ({ ...t, text: t.text.trim() }))
    .filter((t) => t.text.length > 0);
};

// `--chats-per N` overrides the scenario's own `## new chat` markers, so one scenario can be
// swept across granularities to find where the returns flatten.
const applyChatsPer = (turns, n) => {
  if (!n) return turns;
  return turns.map((t, i) => ({ ...t, newChat: i % n === 0 }));
};

// --- estimating, so nothing is spent by surprise ---------------------------

// Rough, and deliberately so. Token counts here are approximations (4 chars per token) plus an
// explicit assumption about what the agent itself adds per turn — its reply, and the tool output
// it drags in. Both assumptions are flags rather than buried constants, because the estimate is
// only as honest as they are.
const estimate = (turns, model, { systemTokens, agentTokens, outTokens }) => {
  let prompt = 0;
  let completion = 0;
  let context = 0;

  for (const t of turns) {
    if (t.newChat) context = systemTokens;
    context += Math.ceil(t.text.length / 4);
    prompt += context;
    completion += outTokens;
    context += agentTokens;
  }
  return { prompt, completion, cost: costOf(model, prompt, completion) };
};

// --- reading usage out of the event stream ---------------------------------

// NOT YET VERIFIED against a real run. Several plausible shapes are tried and the one that
// matched is reported, so a wrong guess shows up as "no usage found" rather than as a
// confidently wrong number. Run with --probe and fix this against the actual output.
const readUsage = (events) => {
  const candidates = [];
  for (const e of events) {
    for (const u of [e?.usage, e?.token_usage, e?.info?.usage, e?.msg?.usage, e?.response?.usage]) {
      if (u && typeof u === 'object') candidates.push(u);
    }
  }
  if (!candidates.length) return null;

  const last = candidates[candidates.length - 1];
  const pick = (...names) => {
    for (const n of names) if (typeof last[n] === 'number') return last[n];
    return null;
  };
  return {
    prompt: pick('input_tokens', 'prompt_tokens', 'input', 'cached_and_uncached_input_tokens'),
    cached: pick('cached_input_tokens', 'cache_read_input_tokens', 'cached_tokens') ?? 0,
    completion: pick('output_tokens', 'completion_tokens', 'output'),
    raw: last,
  };
};

const runCodex = (args, { cwd }) =>
  new Promise((done) => {
    const started = Date.now();
    const child = spawn(codexBin(), args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => done({ code, out, err, ms: Date.now() - started }));
  });

const parseEvents = (stdout) =>
  stdout
    .split('\n')
    .filter((l) => l.trim().startsWith('{'))
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

// A thread id is needed to resume. Try the obvious field names; fall back to `resume --last`,
// which is correct as long as nothing else is driving Codex on this machine at the same time.
const findThreadId = (events) => {
  for (const e of events) {
    for (const k of ['thread_id', 'session_id', 'conversation_id', 'id']) {
      const v = e?.[k] ?? e?.msg?.[k] ?? e?.info?.[k];
      if (typeof v === 'string' && v.length > 8) return v;
    }
  }
  return null;
};

// --- the run ---------------------------------------------------------------

const runTrial = async (turns, opts) => {
  const rows = [];
  let thread = null;

  for (const [i, turn] of turns.entries()) {
    const fresh = turn.newChat || !thread;
    const args = fresh
      ? ['exec', '--json', '-m', opts.model, '-C', opts.cwd, '-s', opts.sandbox, turn.text]
      : ['exec', 'resume', thread ?? '--last', '--json', '-m', opts.model, '-C', opts.cwd, '-s', opts.sandbox, turn.text];

    process.stderr.write(`  turn ${i + 1}/${turns.length}${fresh ? ' (new chat)' : ''} … `);
    const res = await runCodex(args, { cwd: opts.cwd });
    const events = parseEvents(res.out);
    if (fresh) thread = findThreadId(events) ?? null;

    const usage = readUsage(events);
    const cost =
      usage && usage.prompt !== null && usage.completion !== null
        ? costOf(opts.model, usage.prompt, usage.completion)
        : null;

    rows.push({
      turn: i + 1,
      newChat: fresh,
      ok: res.code === 0,
      ms: res.ms,
      prompt: usage?.prompt ?? null,
      cached: usage?.cached ?? null,
      completion: usage?.completion ?? null,
      cost,
      stderr: res.code === 0 ? '' : res.err.slice(0, 500),
      events: opts.keepEvents ? events : undefined,
    });
    process.stderr.write(res.code === 0 ? `ok ${usd(cost)}\n` : `FAILED (exit ${res.code})\n`);

    if (res.code !== 0 && opts.stopOnError) break;
  }
  return rows;
};

const report = (rows, model) => {
  const sum = (k) => rows.reduce((a, r) => a + (r[k] ?? 0), 0);
  const lines = [];
  lines.push('');
  lines.push(`model: ${model}   prices as of ${PRICES_ASOF}`);
  lines.push('');
  lines.push(' turn  chat  prompt   cached  output      cost   secs  ok');
  for (const r of rows) {
    lines.push(
      [
        String(r.turn).padStart(5),
        (r.newChat ? 'new' : ' - ').padStart(6),
        String(r.prompt ?? '?').padStart(8),
        String(r.cached ?? '?').padStart(8),
        String(r.completion ?? '?').padStart(7),
        usd(r.cost).padStart(10),
        (r.ms / 1000).toFixed(1).padStart(7),
        r.ok ? '  y' : '  N',
      ].join('')
    );
  }
  lines.push('');
  lines.push(
    `totals: ${sum('prompt')} prompt, ${sum('cached')} cached, ${sum('completion')} output, ` +
      `${usd(sum('cost'))} over ${rows.length} turns`
  );
  const failed = rows.filter((r) => !r.ok).length;
  if (failed) lines.push(`${failed} turn(s) failed — see the JSON output for stderr`);
  if (sum('cached') > 0) {
    lines.push('');
    lines.push('NOTE: cached tokens are non-zero. Prompt caching appears to have shipped on the');
    lines.push('gateway. Anything costed on the assumption that it had not needs revisiting.');
  }
  return lines.join('\n');
};

// --- cli -------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name, dflt = null) => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? dflt : argv[i + 1];
};
const has = (name) => argv.includes('--' + name);

if (has('help') || argv.length === 0) {
  console.log(`
Run a scripted scenario through a model and account for what it cost.

  node workflows/develop/tools/model-trial.mjs --scenario <file> --model <name> [options]

  --scenario <file>   Markdown scenario; '## turn' and '## new chat' are structural
  --model <name>      e.g. gpt-5.6-terra, gpt-5.6-luna
  --cwd <dir>         working root for the agent (default: repository root)
  --chats-per <n>     override the scenario's chat breaks: start a new chat every n turns
  --sandbox <mode>    read-only | workspace-write | danger-full-access  (default workspace-write)
  --out <dir>         write per-turn JSON here (default: no JSON written)

  --dry-run           estimate and exit. THIS IS THE DEFAULT.
  --live              actually run, and actually spend
  --probe             one trivial turn; dump raw event shapes so the token parser can be fixed
  --keep-events       include full event stream in the JSON output

Estimation assumptions, all overridable because the estimate is only as good as they are:
  --system-tokens <n>  fixed prompt sent every turn (default 9300, measured 2026-08-24)
  --agent-tokens <n>   what the agent adds to context per turn (default 5000)
  --out-tokens <n>     completion tokens per turn (default 800)

Models with known U-M prices: ${Object.keys(PRICES).join(', ')}
`);
  process.exit(0);
}

const model = flag('model');
if (!model) {
  console.error('--model is required. Known: ' + Object.keys(PRICES).join(', '));
  process.exit(1);
}
if (!PRICES[model]) {
  console.error(`No U-M price on file for "${model}". Costs will read n/a.`);
  console.error(`Add it to PRICES from https://its.umich.edu/computing/ai/pricing if it is real.`);
}

const cwd = resolve(flag('cwd', root));
const sandbox = flag('sandbox', 'workspace-write');

if (has('probe')) {
  if (!has('live')) {
    console.log('--probe spends a fraction of a cent. Re-run with --live to confirm.');
    process.exit(0);
  }
  console.error(`probing ${model} …`);
  const res = await runCodex(
    ['exec', '--json', '-m', model, '-C', cwd, '-s', 'read-only', 'Reply with exactly: ok'],
    { cwd }
  );
  const events = parseEvents(res.out);
  console.log(`exit ${res.code}, ${events.length} events`);
  console.log('\ndistinct event shapes:');
  const seen = new Set();
  for (const e of events) {
    const shape = Object.keys(e).sort().join(',');
    if (!seen.has(shape)) {
      seen.add(shape);
      console.log('  ' + shape);
    }
  }
  console.log('\nanything usage-shaped:');
  for (const e of events) {
    const s = JSON.stringify(e);
    if (/token|usage|cach/i.test(s)) console.log('  ' + s.slice(0, 400));
  }
  if (res.code !== 0) console.log('\nstderr:\n' + res.err.slice(0, 1000));
  process.exit(0);
}

const scenarioPath = flag('scenario');
if (!scenarioPath) {
  console.error('--scenario is required (or use --probe).');
  process.exit(1);
}
const turns = applyChatsPer(
  parseScenario(readFileSync(resolve(scenarioPath), 'utf8')),
  Number(flag('chats-per', 0)) || 0
);

if (!turns.length) {
  console.error(`No turns found in ${scenarioPath}. Turns are '## turn' headings.`);
  process.exit(1);
}

const assumptions = {
  systemTokens: Number(flag('system-tokens', 9300)),
  agentTokens: Number(flag('agent-tokens', 5000)),
  outTokens: Number(flag('out-tokens', 800)),
};

if (!has('live')) {
  const est = estimate(turns, model, assumptions);
  const chats = turns.filter((t) => t.newChat).length;
  console.log(`
DRY RUN — nothing spent.

  scenario   ${basename(scenarioPath)}
  turns      ${turns.length}, split across ${chats} chat(s)
  model      ${model}
  cwd        ${cwd}

  assuming ${assumptions.systemTokens} system tokens per turn, ${assumptions.agentTokens} added
  per turn by the agent, and ${assumptions.outTokens} out per turn:

  ~${est.prompt.toLocaleString()} prompt + ~${est.completion.toLocaleString()} completion tokens
  ~${usd(est.cost)}

  As one single chat instead, the same turns would cost about
  ~${usd(estimate(turns.map((t, i) => ({ ...t, newChat: i === 0 })), model, assumptions).cost)}.

Re-run with --live to spend it.
`);
  process.exit(0);
}

console.error(`running ${turns.length} turns on ${model} …`);
const rows = await runTrial(turns, {
  model,
  cwd,
  sandbox,
  stopOnError: !has('continue-on-error'),
  keepEvents: has('keep-events'),
});
console.log(report(rows, model));

const outDir = flag('out');
if (outDir) {
  mkdirSync(resolve(outDir), { recursive: true });
  const name = `${basename(scenarioPath, '.md')}-${model}.json`;
  const path = join(resolve(outDir), name);
  writeFileSync(path, JSON.stringify({ model, scenario: scenarioPath, pricesAsOf: PRICES_ASOF, assumptions, rows }, null, 2));
  console.log(`\nwrote ${path}`);
}
