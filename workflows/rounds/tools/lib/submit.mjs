// SUBMIT.md, the hand-in, at project/SUBMIT.md in the student's assignments repository.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { unixLines } from "../../../record/tools/lib/record.mjs";
import { git } from "../../../record/tools/lib/git.mjs";

export const SUBMIT = "project/SUBMIT.md";
export const KINDS = ["deployed", "workflow", "negotiated"];
export const EXTENDS = ["PS1", "PS2", "PS3", "PS4", "PS5", "new"];
const SHOWCASE_RE = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+\/?$/;
const URL_RE = /^https:\/\/\S+$/;

const LINES = [
  ["kind", "Kind"],
  ["extends", "Extends"],
  ["work", "Work"],
  ["showcase", "Showcase"],
];

/** The four lines of SUBMIT.md in `assignmentsRepo`, and what is wrong with them.
 *
 *  A value still in angle brackets is the template's, so it is `null`. `problems` is empty when
 *  every line is set to something that fits it; it does not judge Work against Kind, which the
 *  check does, since only the check knows the kind. */
export function readSubmit(assignmentsRepo) {
  const out = { kind: null, extends: null, work: null, showcase: null, problems: [] };
  const path = join(assignmentsRepo ?? "", SUBMIT);
  if (!assignmentsRepo || !existsSync(path)) {
    out.problems.push(`${SUBMIT} does not exist.`);
    return out;
  }
  const lines = unixLines(readFileSync(path, "utf8")).split("\n");
  for (const [key, label] of LINES) {
    const line = lines.find((l) => l.startsWith(`${label}:`));
    const value = line === undefined ? "" : line.slice(label.length + 1).trim();
    if (line === undefined) out.problems.push(`${SUBMIT} has no ${label}: line.`);
    else if (!value || /^<.*>$/.test(value)) out.problems.push(`${label}: is not filled in.`);
    else out[key] = value;
  }
  if (out.kind !== null && !KINDS.includes(out.kind)) out.problems.push(`Kind: must be ${KINDS.join(", ")}, not "${out.kind}".`);
  if (out.extends !== null && !EXTENDS.includes(out.extends)) out.problems.push(`Extends: must be ${EXTENDS.join(", ")}, not "${out.extends}".`);
  if (out.work !== null && out.work !== "project/" && !URL_RE.test(out.work)) out.problems.push(`Work: must be a repository URL or project/, not "${out.work}".`);
  if (out.showcase !== null && !SHOWCASE_RE.test(out.showcase)) out.problems.push(`Showcase: must be the URL of a pull request, not "${out.showcase}".`);
  return out;
}

// The online half: what a stranger sees. Every function takes `fetch` last, so tests pass a fake,
// and none of them sends credentials.

const SHOWCASE_REPO = "umsi212F2026/student-showcase";
const API = "https://api.github.com";
const TIMEOUT_MS = 60000;
const HEADERS = { "User-Agent": "si212-rounds-check", Accept: "application/vnd.github+json" };

/** A request with the timeout and the header GitHub requires. Throws on a network failure, with
 *  the URL in the message so the caller can report it, and on GitHub's rate limit, with an error
 *  marked `rateLimited` that says when to try again.
 *
 *  THE CHECKS STAY UNSIGNED, so GitHub allows each address 60 requests an hour. A classroom sharing one
 *  address can use them up, and the student needs to hear that, not a bare 403. */
async function get(url, fetchFn) {
  let res;
  try {
    res = await fetchFn(url, { headers: HEADERS, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    const why = e?.name === "TimeoutError" || e?.name === "AbortError" ? `did not answer within ${TIMEOUT_MS / 1000} seconds` : `could not be reached (${e?.message ?? e})`;
    throw new Error(`${url} ${why}.`);
  }
  if ((res.status === 403 || res.status === 429) && res.headers?.get?.("x-ratelimit-remaining") === "0") {
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    const when = reset ? new Date(reset * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "an hour";
    throw Object.assign(new Error(`GitHub's limit for unsigned checks was reached: try again after ${when}.`), { rateLimited: true });
  }
  return res;
}

async function getJson(url, fetchFn) {
  const res = await get(url, fetchFn);
  if (res.status >= 400) throw new Error(`${url} answered ${res.status}.`);
  return res.json();
}

/** The showcase pull request at `prUrl`: its state, the one `*-project.json` it adds and that
 *  card, and whether it deletes a `*-ps3.json`. Never throws: what could not be read is in
 *  `problems`, and `state` is then null. */
export async function showcaseEntry(prUrl, fetchFn = globalThis.fetch) {
  const out = { state: null, file: null, card: null, removesPs3: false, problems: [] };
  const m = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)\/?$/.exec(prUrl ?? "");
  if (!m) {
    out.problems.push(`${prUrl} is not the URL of a pull request.`);
    return out;
  }
  if (`${m[1]}/${m[2]}`.toLowerCase() !== SHOWCASE_REPO.toLowerCase()) {
    out.problems.push(`${prUrl} is not a pull request to ${SHOWCASE_REPO}.`);
    return out;
  }
  const base = `${API}/repos/${SHOWCASE_REPO}/pulls/${m[3]}`;
  // The student knows the pull request by its page, not by the API address the check reads.
  const theirs = (msg) => msg.split(base).join(prUrl.replace(/\/$/, ""));
  try {
    const pr = await getJson(base, fetchFn);
    out.state = pr.merged_at ? "merged" : pr.state === "open" ? "open" : "closed";
    const files = await getJson(`${base}/files`, fetchFn);
    out.removesPs3 = files.some((f) => (f.status === "removed" && /(^|\/)[^/]*-ps3\.json$/.test(f.filename)) || (f.status === "renamed" && /(^|\/)[^/]*-ps3\.json$/.test(f.previous_filename ?? "")));
    const added = files.filter((f) => (f.status === "added" || f.status === "renamed") && /(^|\/)[^/]*-project\.json$/.test(f.filename));
    if (added.length !== 1) {
      out.problems.push(`The pull request adds ${added.length} *-project.json files, not one.`);
      return out;
    }
    out.file = added[0].filename;
    try {
      out.card = await getJson(added[0].raw_url, fetchFn);
    } catch (e) {
      out.problems.push(e.message);
    }
  } catch (e) {
    out.state = null;
    out.problems.push(theirs(e.message));
  }
  return out;
}

/** Whether the repository at `repoUrl` is public, as a stranger sees it. A repository that cannot
 *  be read counts as not public; GitHub's rate limit throws instead, since it says nothing about
 *  the repository. */
export async function isPublic(repoUrl, fetchFn = globalThis.fetch) {
  const m = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?\/?$/.exec(repoUrl ?? "");
  if (!m) return false;
  try {
    return (await getJson(`${API}/repos/${m[1]}/${m[2]}`, fetchFn)).private === false;
  } catch (e) {
    if (e.rateLimited) throw e;
    return false;
  }
}

/** Whether `url` answers, with any status below 400 after redirects. `error` says why when the
 *  request failed outright, including a timeout, and always names the URL. */
export async function answers(url, fetchFn = globalThis.fetch) {
  try {
    const res = await get(url, fetchFn);
    res.body?.cancel?.().catch?.(() => {});
    return { ok: res.status < 400, status: res.status };
  } catch (e) {
    return { ok: false, status: null, error: e.message };
  }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** What is wrong with the report at `url` for the repository `repoUrl`: it needs a PNG that
 *  answers, and links into the repository that are pinned to a commit and answer. */
export async function reportProblems(url, repoUrl, fetchFn = globalThis.fetch) {
  let html;
  let base = url;
  try {
    const res = await get(url, fetchFn);
    if (res.status >= 400) return [`${url} answered ${res.status}.`];
    html = await res.text();
    base = res.url || url;
  } catch (e) {
    return [e.message];
  }
  const baseTag = /<base\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/i.exec(html);
  if (baseTag) {
    try {
      base = new URL(baseTag[1], base).href;
    } catch {}
  }
  const resolve = (ref) => {
    try {
      return new URL(ref.replace(/&amp;/g, "&"), base).href;
    } catch {
      return null;
    }
  };
  const out = [];
  const pngs = [...html.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)].map((x) => resolve(x[1])).filter((s) => s && /\.png(?:[?#].*)?$/i.test(s));
  if (!pngs.length) out.push("The report has no <img> with a .png src.");
  for (const png of [...new Set(pngs)]) {
    const r = await answers(png, fetchFn);
    if (!r.ok) out.push(`The image ${png} does not answer${r.status ? ` (${r.status})` : ""}.`);
  }
  const repo = escapeRe((repoUrl ?? "").replace(/\.git$/, "").replace(/\/$/, ""));
  const link = new RegExp(`^${repo}/blob/([^/]+)/`, "i");
  const hrefs = [...html.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi)].map((x) => resolve(x[1])).filter(Boolean);
  const into = [...new Set(hrefs.filter((h) => link.test(h)))];
  if (!into.length) out.push(`The report has no link into the project, of the form ${repoUrl}/blob/<commit>/...`);
  for (const href of into) {
    const ref = link.exec(href)[1];
    if (!/^[0-9a-f]{7,40}$/i.test(ref)) out.push(`The link ${href} is pinned to a branch, "${ref}", not a commit.`);
    const r = await answers(href, fetchFn);
    if (!r.ok) out.push(`The link ${href} does not answer${r.status ? ` (${r.status})` : ""}.`);
  }
  return out;
}

/** Why the deployed API is not running this project's HEAD, or null. DEPLOY.md in `dir` names the
 *  API with an `API:` line; without one there is nothing to compare, which is not a problem. */
export async function liveCommitProblem(dir, fetchFn = globalThis.fetch) {
  const path = join(dir, "DEPLOY.md");
  if (!existsSync(path)) return null;
  const line = unixLines(readFileSync(path, "utf8")).split("\n").find((l) => /^API:/.test(l));
  const api = line?.slice(4).trim().replace(/\/$/, "");
  if (!api) return null;
  const url = `${api}/api/version`;
  let live;
  try {
    const res = await get(url, fetchFn);
    if (res.status >= 400) return `${url} answered ${res.status}.`;
    live = String((await res.json()).commit ?? "").trim();
  } catch (e) {
    return e.message;
  }
  if (!live) return `${url} did not report a commit.`;
  if (!/^[0-9a-f]{7,40}$/i.test(live)) return `${url} reported "${live}", which is not a commit hash of 7 to 40 characters.`;
  live = live.toLowerCase();
  let head;
  try {
    head = git(dir, "rev-parse", "HEAD");
  } catch {
    return `${dir} has no HEAD to compare with.`;
  }
  if (head.startsWith(live)) return null;
  // A commit after the deployed one that changes only ROUNDS.md, such as attesting, leaves the
  // live code the project's HEAD.
  try {
    git(dir, "diff", "--quiet", live, "HEAD", "--", ".", ":!ROUNDS.md");
    return null;
  } catch {
    return `The live API runs ${live.slice(0, 7)}, not this project's HEAD, ${head.slice(0, 7)}.`;
  }
}
