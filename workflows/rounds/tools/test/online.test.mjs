import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../rounds.mjs";
import { showcaseEntry, isPublic, answers, reportProblems, liveCommitProblem } from "../lib/submit.mjs";
import { passingProject, assignmentsRepo, submitText, write, commit, git, emptyRepo } from "./repo.mjs";

const item = (result, name) => result.items.find((i) => i.name === name);
const PR = "https://github.com/umsi212F2026/student-showcase/pull/7";
const API = "https://api.github.com/repos/umsi212F2026/student-showcase/pulls/7";
const RAW = "https://raw.githubusercontent.com/x/card.json";
const SITE = "https://me.github.io/proj/";
const REPO = "https://github.com/me/proj";
const SHA = "a".repeat(40);

const CARD = { assignment: "Final Project", studentName: "Me", projectTitle: "T", description: "d", projectType: ["workflow"], projectUrl: SITE, githubUrl: REPO };
const REPORT = `<html><img src="shot.png"><a href="${REPO}/blob/${SHA}/skills/x/SKILL.md">skill</a></html>`;

const reply = (body, status = 200) => ({ status, ok: status < 400, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });

/** A fake fetch serving `routes`, a map from URL to a response body or a ready response; any other
 *  URL answers 404. A route that is an Error is thrown. Records every call. */
function fake(routes) {
  const calls = [];
  const f = async (url, opts) => {
    calls.push({ url, opts });
    const r = routes[url];
    if (r instanceof Error) throw r;
    if (r === undefined) return reply("", 404);
    return r.status ? r : reply(r);
  };
  f.calls = calls;
  return f;
}

const prRoutes = ({ merged_at = "2026-12-01T00:00:00Z", state = "closed", card = CARD, files } = {}) => ({
  [API]: { state, merged_at },
  [`${API}/files`]: files ?? [{ filename: "src/data/projects/me-project.json", status: "added", raw_url: RAW }],
  [RAW]: card,
});

const siteRoutes = { [SITE]: REPORT, [`${SITE}shot.png`]: "png", [`${REPO}/blob/${SHA}/skills/x/SKILL.md`]: "md", [REPO.replace("github.com", "api.github.com/repos")]: { private: false } };

const timeout = () => Object.assign(new Error("aborted"), { name: "TimeoutError" });

test("merged PR with a project card passes", async () => {
  const e = await showcaseEntry(PR, fake(prRoutes()));
  assert.equal(e.state, "merged");
  assert.equal(e.file, "src/data/projects/me-project.json");
  assert.equal(e.card.assignment, "Final Project");
  assert.equal(e.removesPs3, false);
  assert.deepEqual(e.problems, []);
});

test("an open PR reads as open, and a PS3 removal is reported", async () => {
  const files = [
    { filename: "src/data/projects/me-project.json", status: "added", raw_url: RAW },
    { filename: "src/data/projects/me-ps3.json", status: "removed", raw_url: "x" },
  ];
  const e = await showcaseEntry(PR, fake(prRoutes({ merged_at: null, state: "open", files })));
  assert.equal(e.state, "open");
  assert.equal(e.removesPs3, true);
});

test("a PR that cannot be read gives problems and never throws", async () => {
  const e = await showcaseEntry(PR, fake({}));
  assert.equal(e.state, null);
  assert.equal(e.card, null);
  assert.match(e.problems[0], /404/);
  const t = await showcaseEntry(PR, fake({ [API]: timeout() }));
  assert.match(t.problems[0], new RegExp(PR));
  assert.doesNotMatch(t.problems[0], /api\.github\.com/);
  assert.doesNotMatch(e.problems[0], /api\.github\.com/);
});

const RESET = Date.UTC(2026, 11, 1, 15, 30) / 1000;
const limited = (status = 403) => ({ ...reply({ message: "API rate limit exceeded" }, status), headers: new Headers({ "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(RESET) }) });
const resetTime = new Date(RESET * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

test("GitHub's rate limit reads as the limit, with the local reset time", async () => {
  for (const status of [403, 429]) {
    const e = await showcaseEntry(PR, fake({ [API]: limited(status) }));
    assert.match(e.problems[0], /GitHub's limit for unsigned checks was reached/);
    assert.ok(e.problems[0].includes(`try again after ${resetTime}`), e.problems[0]);
  }
  const forbidden = await showcaseEntry(PR, fake({ [API]: reply({}, 403) }));
  assert.match(forbidden.problems[0], /403/);
  const p = passingProject();
  const f = full({ "https://api.github.com/repos/me/proj": limited() });
  const it = item(await check(p.dir, { assignments: assignmentsRepo(), online: true, fetch: f }), "public repository");
  assert.equal(it.ok, false);
  assert.match(it.detail, /limit for unsigned checks/);
});

test("requests are unauthenticated, carry a User-Agent and a timeout", async () => {
  const f = fake(prRoutes());
  await showcaseEntry(PR, f);
  for (const c of f.calls) {
    assert.ok(c.opts.signal);
    assert.equal(c.opts.headers["User-Agent"], "si212-rounds-check");
    assert.equal(c.opts.headers.Authorization, undefined);
  }
});

test("isPublic reads private === false", async () => {
  const url = "https://api.github.com/repos/me/proj";
  assert.equal(await isPublic(REPO, fake({ [url]: { private: false } })), true);
  assert.equal(await isPublic(REPO, fake({ [url]: { private: true } })), false);
  assert.equal(await isPublic(REPO, fake({})), false);
});

test("answers accepts anything below 400, and a timeout names the URL", async () => {
  assert.deepEqual(await answers(SITE, fake({ [SITE]: reply("", 302) })), { ok: true, status: 302 });
  assert.equal((await answers(SITE, fake({}))).ok, false);
  const t = await answers(SITE, fake({ [SITE]: timeout() }));
  assert.equal(t.ok, false);
  assert.match(t.error, new RegExp(SITE));
});

test("report with a PNG and a pinned link that answer has no problems", async () => {
  assert.deepEqual(await reportProblems(SITE, REPO, fake(siteRoutes)), []);
});

test("report link to blob/main is pinned to a branch", async () => {
  const link = `${REPO}/blob/main/skills/x/SKILL.md`;
  const routes = { ...siteRoutes, [SITE]: `<img src="shot.png"><a href="${link}">x</a>`, [link]: "md" };
  const p = await reportProblems(SITE, REPO, fake(routes));
  assert.equal(p.length, 1);
  assert.match(p[0], /pinned to a branch/);
});

test("report linking only to another repository has no links into the project", async () => {
  const routes = { ...siteRoutes, [SITE]: `<img src="shot.png"><a href="https://github.com/other/repo/blob/${SHA}/a.md">x</a>` };
  const p = await reportProblems(SITE, REPO, fake(routes));
  assert.equal(p.length, 1);
  assert.match(p[0], /no link into the project/);
});

test("missing PNG fails", async () => {
  const routes = { ...siteRoutes };
  delete routes[`${SITE}shot.png`];
  const p = await reportProblems(SITE, REPO, fake(routes));
  assert.equal(p.length, 1);
  assert.match(p[0], /shot\.png/);
});

test("a report link that does not answer fails", async () => {
  const routes = { ...siteRoutes };
  delete routes[`${REPO}/blob/${SHA}/skills/x/SKILL.md`];
  assert.match((await reportProblems(SITE, REPO, fake(routes)))[0], /does not answer/);
});

function deployedProject(apiLine) {
  const p = passingProject();
  if (apiLine !== null) write(p.repo, "DEPLOY.md", `# Deploy\n\n${apiLine}\n`);
  commit(p.repo, "deploy");
  return p;
}

test("api/version on an older commit fails, on the same commit passes", async () => {
  const p = deployedProject("API: https://api.example.com/");
  const url = "https://api.example.com/api/version";
  const head = git(p.repo, "rev-parse", "HEAD");
  const old = await liveCommitProblem(p.dir, fake({ [url]: { commit: "0".repeat(40) } }));
  assert.match(old, /not this project's HEAD/);
  assert.equal(await liveCommitProblem(p.dir, fake({ [url]: { commit: head.slice(0, 7) } })), null);
  assert.equal(await liveCommitProblem(p.dir, fake({ [url]: { commit: head } })), null);
  assert.match(await liveCommitProblem(p.dir, fake({})), /404/);
  assert.equal(await liveCommitProblem(p.dir, fake({ [url]: { commit: head.slice(0, 10).toUpperCase() } })), null);
  for (const bad of ["main", head.slice(0, 6), `${head}0`, "zzzzzzz"]) assert.match(await liveCommitProblem(p.dir, fake({ [url]: { commit: bad } })), /commit hash/, bad);
});

test("a live commit whose tree matches HEAD apart from ROUNDS.md passes", async () => {
  const p = deployedProject("API: https://api.example.com/");
  const url = "https://api.example.com/api/version";
  const deployed = git(p.repo, "rev-parse", "HEAD");
  write(p.repo, "ROUNDS.md", git(p.repo, "show", "HEAD:ROUNDS.md") + "\n");
  commit(p.repo, "rounds: attested");
  assert.equal(await liveCommitProblem(p.dir, fake({ [url]: { commit: deployed.slice(0, 7) } })), null);
  write(p.repo, "src/late.js", "late\n");
  commit(p.repo, "late change");
  assert.match(await liveCommitProblem(p.dir, fake({ [url]: { commit: deployed.slice(0, 7) } })), /not this project's HEAD/);
});

test("no API line passes live commit", async () => {
  const none = deployedProject("Hosted on a school server.");
  const f = fake({});
  assert.equal(await liveCommitProblem(none.dir, f), null);
  assert.equal(f.calls.length, 0);
  assert.equal(await liveCommitProblem(passingProject().dir, f), null);
});

const full = (extra = {}) => fake({ ...prRoutes(), ...siteRoutes, ...extra });
const NAMES_ONLINE = ["showcase pull request", "public repository", "project URL answers", "report"];

test("a workflow project passes items 10 to 13", async () => {
  const p = passingProject();
  const r = await check(p.dir, { assignments: assignmentsRepo(), online: true, fetch: full() });
  assert.deepEqual(r.items.slice(-4).map((i) => i.name), NAMES_ONLINE);
  assert.deepEqual(r.items.filter((i) => !i.ok), []);
  assert.equal(r.ok, true);
});

test("card with assignment Problem Set 3 fails", async () => {
  const p = passingProject();
  const f = fake({ ...prRoutes({ card: { ...CARD, assignment: "Problem Set 3" } }), ...siteRoutes });
  const it = item(await check(p.dir, { assignments: assignmentsRepo(), online: true, fetch: f }), "showcase pull request");
  assert.equal(it.ok, false);
  assert.match(it.detail, /Problem Set 3/);
});

test("a closed, unmerged PR fails", async () => {
  const p = passingProject();
  const f = fake({ ...prRoutes({ merged_at: null }), ...siteRoutes });
  assert.equal(item(await check(p.dir, { assignments: assignmentsRepo(), online: true, fetch: f }), "showcase pull request").ok, false);
});

test("an open PR passes", async () => {
  const p = passingProject();
  const f = fake({ ...prRoutes({ merged_at: null, state: "open" }), ...siteRoutes });
  assert.equal(item(await check(p.dir, { assignments: assignmentsRepo(), online: true, fetch: f }), "showcase pull request").ok, true);
});

test("githubUrl on a private-work card fails", async () => {
  const p = passingProject();
  const a = assignmentsRepo({ submit: submitText({ kind: "deployed", work: "project/" }) });
  const r = await check(p.dir, { assignments: a, online: true, fetch: full() });
  const it = item(r, "showcase pull request");
  assert.equal(it.ok, false);
  assert.match(it.detail, /private/);
  const clean = { ...CARD };
  delete clean.githubUrl;
  const ok = await check(p.dir, { assignments: a, online: true, fetch: fake({ ...prRoutes({ card: clean }), ...siteRoutes }) });
  assert.equal(item(ok, "showcase pull request").ok, true);
});

test("githubUrl that differs from Work fails", async () => {
  const p = passingProject();
  const f = fake({ ...prRoutes({ card: { ...CARD, githubUrl: "https://github.com/me/other" } }), ...siteRoutes });
  assert.equal(item(await check(p.dir, { assignments: assignmentsRepo(), online: true, fetch: f }), "showcase pull request").ok, false);
});

test("private repository fails for a workflow", async () => {
  const p = passingProject();
  const f = full({ "https://api.github.com/repos/me/proj": { private: true } });
  const it = item(await check(p.dir, { assignments: assignmentsRepo(), online: true, fetch: f }), "public repository");
  assert.equal(it.ok, false);
});

test("a PR that cannot be read fails 10 and items 12 to 14 say there is no card", async () => {
  const p = passingProject();
  const r = await check(p.dir, { assignments: assignmentsRepo(), online: true, fetch: fake({}) });
  assert.match(item(r, "showcase pull request").detail, /404/);
  assert.ok(item(r, "showcase pull request").detail.includes(PR));
  assert.equal(item(r, "project URL answers").detail, "no showcase card to read the project URL from");
  assert.equal(item(r, "report").detail, "no showcase card to read the project URL from");
});

test("a timeout reads as not answering, with the URL in the detail", async () => {
  const p = passingProject();
  const f = full({ [SITE]: timeout() });
  const r = await check(p.dir, { assignments: assignmentsRepo(), online: true, fetch: f });
  const it = item(r, "project URL answers");
  assert.equal(it.ok, false);
  assert.match(it.detail, new RegExp(SITE));
  assert.match(it.detail, /did not answer/);
});

const run = (routes) => check(passingProject().dir, { assignments: assignmentsRepo(), online: true, fetch: fake(routes) });
const rateLimitedReply = { status: 403, headers: { get: (h) => (h === "x-ratelimit-remaining" ? "0" : null) } };

test("rate-limited showcase read is unresolved", async () => {
  const it = item(await run({ ...prRoutes(), ...siteRoutes, [API]: rateLimitedReply }), "showcase pull request");
  assert.equal(it.ok, false);
  assert.equal(it.unresolved, true);
});

test("GitHub API timeout is unresolved", async () => {
  const it = item(await run({ ...prRoutes(), ...siteRoutes, "https://api.github.com/repos/me/proj": timeout() }), "public repository");
  assert.equal(it.ok, false);
  assert.equal(it.unresolved, true);
});

test("student site timeout is not unresolved", async () => {
  const it = item(await run({ ...prRoutes(), ...siteRoutes, [SITE]: timeout() }), "project URL answers");
  assert.equal(it.ok, false);
  assert.equal("unresolved" in it, false);
});

test("an error marked unresolved by the caller's fetch is unresolved", async () => {
  const it = item(await run({ ...prRoutes(), ...siteRoutes, [SITE]: Object.assign(new Error("down"), { unresolved: true }) }), "project URL answers");
  assert.equal(it.ok, false);
  assert.equal(it.unresolved, true);
});

test("a workflow whose PR read is rate-limited has its card-dependent items unresolved", async () => {
  const r = await run({ ...prRoutes(), ...siteRoutes, [API]: rateLimitedReply });
  assert.equal(item(r, "project URL answers").unresolved, true);
  assert.equal(item(r, "report").unresolved, true);
  assert.equal(item(r, "project URL answers").detail, "no showcase card to read the project URL from");
  assert.equal(item(r, "public repository").ok, true);
  assert.equal("unresolved" in item(r, "public repository"), false);
});

test("a deployed project whose PR read is rate-limited does not pass public repository by default", async () => {
  const p = deployedProject(null);
  const a = assignmentsRepo({ submit: submitText({ kind: "deployed", work: "project/" }) });
  const r = await check(p.dir, { assignments: a, online: true, fetch: fake({ ...prRoutes(), ...siteRoutes, [API]: rateLimitedReply }) });
  for (const name of ["public repository", "project URL answers"]) {
    assert.equal(item(r, name).ok, false, name);
    assert.equal(item(r, name).unresolved, true, name);
  }
});

test("a 404 is a plain failure", async () => {
  const it = item(await run(siteRoutes), "showcase pull request");
  assert.equal(it.ok, false);
  assert.equal("unresolved" in it, false);
});

test("passing items carry no unresolved key", async () => {
  const r = await run({ ...prRoutes(), ...siteRoutes });
  assert.equal(r.items.some((i) => "unresolved" in i), false);
});

test("deployed runs the live commit item and not the report", async () => {
  const p = deployedProject("API: https://api.example.com");
  const a = assignmentsRepo({ submit: submitText({ kind: "deployed", work: "project/" }) });
  const clean = { ...CARD };
  delete clean.githubUrl;
  const f = fake({ ...prRoutes({ card: clean }), ...siteRoutes, "https://api.example.com/api/version": { commit: "0".repeat(40) } });
  const r = await check(p.dir, { assignments: a, online: true, fetch: f });
  assert.deepEqual(r.items.slice(-4).map((i) => i.name), ["showcase pull request", "public repository", "project URL answers", "live commit"]);
  assert.equal(item(r, "live commit").ok, false);
  assert.equal(item(r, "public repository").ok, true);
});

test("deployed with no API line has no live commit item, even with no card", async () => {
  const p = deployedProject(null);
  const a = assignmentsRepo({ submit: submitText({ kind: "deployed", work: "project/" }) });
  const clean = { ...CARD };
  delete clean.githubUrl;
  const withCard = await check(p.dir, { assignments: a, online: true, fetch: fake({ ...prRoutes({ card: clean }), ...siteRoutes }) });
  assert.deepEqual(withCard.items.slice(-3).map((i) => i.name), ["showcase pull request", "public repository", "project URL answers"]);
  const starter = "<https://github.com/umsi212F2026/student-showcase/pull/N>";
  const noPr = assignmentsRepo({ submit: submitText({ kind: "deployed", work: "project/", showcase: starter }) });
  const bare = await check(p.dir, { assignments: noPr, online: true, fetch: fake({}) });
  assert.equal(item(bare, "live commit"), undefined);
  assert.equal(item(bare, "project URL answers").ok, false);
});

test("negotiated runs only the pull request and project URL items", async () => {
  const empty = emptyRepo();
  write(empty, "README.md", "x\n");
  commit(empty, "x");
  const a = assignmentsRepo({ submit: submitText({ kind: "negotiated", work: "project/" }), terms: "# Terms\n" });
  const clean = { ...CARD };
  delete clean.githubUrl;
  const r = await check(empty, { assignments: a, online: true, fetch: fake({ ...prRoutes({ card: clean }), ...siteRoutes }) });
  assert.deepEqual(r.items.map((i) => i.name), ["TERMS.md", "SUBMIT.md", "assignments pushed", "showcase pull request", "project URL answers"]);
  assert.deepEqual(r.items.filter((i) => !i.ok), []);
});

test("relative URLs resolve against the final URL after a redirect", async () => {
  const bare = "https://me.github.io/proj";
  const routes = { ...siteRoutes, [bare]: { status: 200, url: SITE, text: async () => REPORT } };
  assert.deepEqual(await reportProblems(bare, REPO, fake(routes)), []);
});

test("a base href is honored", async () => {
  const routes = { ...siteRoutes, [SITE]: `<base href="https://cdn.example.com/a/">${REPORT}`, "https://cdn.example.com/a/shot.png": "png" };
  assert.deepEqual(await reportProblems(SITE, REPO, fake(routes)), []);
});

test("a renamed ps3 card counts as the project card and as removing the ps3 card", async () => {
  const files = [{ filename: "src/data/projects/me-project.json", previous_filename: "src/data/projects/me-ps3.json", status: "renamed", raw_url: RAW }];
  const e = await showcaseEntry(PR, fake(prRoutes({ files })));
  assert.equal(e.file, "src/data/projects/me-project.json");
  assert.equal(e.removesPs3, true);
  assert.deepEqual(e.problems, []);
});
