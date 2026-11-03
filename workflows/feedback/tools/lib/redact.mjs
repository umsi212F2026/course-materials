// Redact what a transcript should never carry off the machine: keys, tokens, and the home path.
//
// A PROGRAM, NOT A JUDGMENT. The shapes below are the ones a student in this course could
// plausibly have pasted or had printed: OpenAI, Anthropic, GitHub, AWS, Slack, and bearer
// headers. Anything else that looks like a secret is caught by length, as a long run of
// token characters with both a letter and a digit in it.
//
// NO SLASH IN THE LONG-RUN CLASS, though base64 has one, because a long path such as
// `workflows/learn/skills/study/references` would otherwise read as a token. Real keys are
// almost all base64url or hex, which has none.

const SHAPES = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/g,
  /\bsk-ant-[A-Za-z0-9_-]{10,}/g,
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bAKIA[A-Z0-9]{16}\b/g,
  /\bxox[bp]-[A-Za-z0-9-]{10,}/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\b[spr]k_(?:live|test)_[A-Za-z0-9]{10,}/g,
];

// SHAPES THAT KEEP THEIR CONTEXT: only the secret part is replaced, so the quote still reads.
// A password in a connection string, and the value on a line that names a key, secret, password
// or token, which is how a `.env` echoed in an agent's reply looks.
const IN_CONTEXT = [
  /(:\/\/[^:\s/@]+:)([^@\s]+)(@)/g,
  /(\b[A-Z0-9_]*(?:KEY|SECRET|PASSWORD|TOKEN)[A-Z0-9_]*\s*[=:]\s*["']?)([^\s"']{6,})(["']?)/g,
];

const LONG_RUN = /(?<![A-Za-z0-9_+=-])[A-Za-z0-9_+=-]{40,}(?![A-Za-z0-9_+=-])/g;

// Topic and goal slugs (`cloud-hosting-2026-10`, `a-critique-permissions-plan`), dates and
// session ids (`2026-10-27T11-48-44-01a17e0c-b42e-...`) are long runs with digits in them, and
// transcripts are full of them. What they share is short pieces between hyphens or underscores;
// a token has at least one long piece.
const SLUG = /^[A-Za-z0-9]{1,16}(?:[-_][A-Za-z0-9]{1,16})+$/;

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replace secrets with `[redacted]`, counting them, and the home path with `~`, not counting it. */
export function redact(text, home) {
  let count = 0;
  let out = text;
  for (const shape of SHAPES) {
    out = out.replace(shape, () => (count++, "[redacted]"));
  }
  for (const shape of IN_CONTEXT) {
    out = out.replace(shape, (all, before, secret, after) =>
      secret === "[redacted]" ? all : (count++, `${before}[redacted]${after}`)
    );
  }
  out = out.replace(LONG_RUN, (run) =>
    /[A-Za-z]/.test(run) && /[0-9]/.test(run) && !SLUG.test(run) ? (count++, "[redacted]") : run
  );
  if (home) {
    // A Windows home also turns up with forward slashes, with its backslashes doubled by JSON,
    // and in any letter case, since Windows paths ignore case.
    const flags = /^[A-Za-z]:/.test(home) ? "gi" : "g";
    for (const form of new Set([home.replaceAll("\\", "\\\\"), home, home.replaceAll("\\", "/")])) {
      out = out.replace(new RegExp(escape(form), flags), "~");
    }
  }
  return { text: out, count };
}
