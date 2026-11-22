import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { startProjectMessage, reportMessage, candidatesMessage } from "../lib/say.mjs";
import { main } from "../rounds.mjs";
import { passingProject, assignmentsRepo, submitText, roundsRepo, write, commit, withBase } from "./repo.mjs";

const BASE_RULE = "**Nothing before your base can be a round.** A round starts with a Superpowers spec and plan committed after it.";
const nextStep = (what) =>
  `**Next, get your base working and commit it:** ${what}. If it already works, the commit you have now is your base. Then put that commit's hash on the \`Base:\` line of \`ROUNDS.md\` and commit that too.`;
const sub = (kind, ext, work) => ({ kind, extends: ext, work, problems: [] });

// start-project

test("a private PS4 extension gets the host line, the base step and the base rule, word for word", () => {
  const msg = startProjectMessage(sub("deployed", "PS4", "project/"), { assignments: "/a/assignments" });
  assert.equal(
    msg,
    [
      "Your final project is set up in `/a/assignments/project`.",
      "It has your Problem Set 4 work in it, copied from its folder in `assignments`. If your site is already deployed from that folder, change the root directory in your host's settings to `project/`, so the live site runs this copy from now on.",
      nextStep("your problem set's work, publicly deployed"),
      BASE_RULE,
    ].join("\n\n"),
  );
});

test("a public PS5 extension is a sibling of assignments, with its URL", () => {
  const msg = startProjectMessage(sub("workflow", "PS5", "https://github.com/me/job-sorter"), { assignments: "/a/assignments" });
  assert.match(msg, /^Your final project is set up in `\/a\/job-sorter`\./);
  assert.match(msg, /It has your Problem Set 5 work in it, copied from `assignments`, at https:\/\/github.com\/me\/job-sorter\./);
  assert.ok(msg.includes(nextStep("your Problem Set 5 workflow, running")));
  assert.ok(msg.endsWith(BASE_RULE));
});

test("something new in public is empty, and a new workflow's base names what it needs", () => {
  const msg = startProjectMessage(sub("workflow", "new", "https://github.com/me/idea"), { assignments: "/a/assignments" });
  assert.match(msg, /It's empty apart from `AGENTS.md` and `ROUNDS.md`, at https:\/\/github.com\/me\/idea\./);
  assert.ok(msg.includes(nextStep("a diagram, a skill, a step done by a program or by you, and at least ten real inputs processed, each saved beside its output")));
});

test("something new and deployed, kept private", () => {
  const msg = startProjectMessage(sub("deployed", "new", "project/"), { assignments: "/a/assignments" });
  assert.match(msg, /\n\nYour code goes in that folder\.\n\n/);
  assert.ok(msg.includes(nextStep("a live URL anyone can open")));
});

test("an adopted PS3 repository uses the folder given", () => {
  const msg = startProjectMessage(sub("deployed", "PS3", "https://github.com/me/ps3-site"), { assignments: "/a/assignments", folder: "/a/my-ps3", adopted: true });
  assert.match(msg, /^Your final project is set up in `\/a\/my-ps3`\.\n\nIt's your Problem Set 3 repository, with `ROUNDS.md` added\.\n\n/);
  assert.ok(msg.includes(nextStep("your problem set's work, publicly deployed")));
});

test("a negotiated project's base is what its agreed terms start from", () => {
  const msg = startProjectMessage(sub("negotiated", "new", "project/"), { assignments: "/a/assignments" });
  assert.ok(msg.includes(nextStep("your project's starting point, as your agreed terms describe it")));
  assert.ok(msg.endsWith(BASE_RULE));
});

test("start-project refuses a SUBMIT.md that is not filled in, and an adoption that is not PS3", () => {
  assert.throws(() => startProjectMessage({ kind: null, extends: "PS4", work: "project/", problems: ["Kind: is not filled in."] }, { assignments: "/a" }), /Kind: is not filled in/);
  assert.throws(() => startProjectMessage(sub("deployed", "PS4", "project/"), { assignments: "/a", adopted: true }), /Problem Set 3/);
});

test("say start-project reads SUBMIT.md from the assignments repository", () => {
  const a = assignmentsRepo({ submit: submitText({ kind: "deployed", extendsPs: "PS4", work: "project/" }) });
  const msg = main(["say", "start-project", a]);
  assert.ok(msg.startsWith(`Your final project is set up in \`${join(a, "project")}\`.`));
  assert.ok(msg.includes("root directory in your host's settings"));
});

// project-ready

const ok = (name, detail = "fine") => ({ name, ok: true, detail });
const bad = (name, detail) => ({ name, ok: false, detail });
const HEAD = "Here's how your final project checks out against what the grader looks for. The online items are what a stranger sees, without your sign-in:";

test("with parts to confirm: every item, warnings, flags, then the request to answer", () => {
  const msg = reportMessage({
    kind: "deployed",
    items: [ok("base named"), bad("project pushed", "2 commits are not pushed yet. Run: git push"), ok("README", "Warning: README.md does not mention \"chart\".")],
    toConfirm: 2,
    weak: [{ n: 1, key: "why", text: "because it seemed useful", reason: "the grader looks for a reason, and this gives none" }],
    looksLike: [{ n: 2, label: "a bug fix" }],
  });
  assert.equal(
    msg,
    [
      HEAD,
      "- ✅ Base named\n- ❌ Project pushed: 2 commits are not pushed yet. Run: git push\n- ✅ README",
      "⚠️ Round 1, why next, \"because it seemed useful\", might lose credit: the grader looks for a reason, and this gives none.",
      "⚠️ Round 2 looks like a bug fix, which earns nothing as a round.",
      "⚠️ README: README.md does not mention \"chart\".",
      "Please answer the questions about the parts of your record that are in your own words.",
    ].join("\n\n"),
  );
});

test("nothing to confirm and everything passing: confirmed, graded live, ready", () => {
  const msg = reportMessage({ kind: "deployed", items: [ok("base named"), ok("attested")], toConfirm: 0 });
  assert.equal(
    msg,
    [
      HEAD,
      "- ✅ Base named\n- ✅ Attested",
      "Every own-words part is confirmed as yours.",
      "Your site will be graded live, so keep it running the code on `main` until grading is done.",
      "It's ready to submit on Canvas.",
    ].join("\n\n"),
  );
});

test("nothing to confirm with a failure offers help, and a workflow has no live-site line", () => {
  const msg = reportMessage({ kind: "workflow", items: [ok("base named"), bad("SUBMIT.md", "Showcase: is not filled in.")], toConfirm: 0 });
  assert.ok(msg.endsWith("Want me to help with the ones marked ❌?"));
  assert.ok(!msg.includes("ready to submit"));
  assert.ok(!msg.includes("graded live"));
});

test("when only the pushes fail, the offer is to push", () => {
  const msg = reportMessage({ kind: "deployed", items: [ok("base named"), bad("project pushed", "x"), bad("assignments pushed", "y")], toConfirm: 0 });
  assert.ok(msg.endsWith("Want me to push it?"));
  assert.ok(!msg.includes("Want me to help"));
});

test("a negotiated project has no own-words line", () => {
  const msg = reportMessage({ kind: "negotiated", items: [ok("TERMS.md")], toConfirm: 0 });
  assert.ok(!msg.includes("own-words"));
  assert.ok(msg.endsWith("It's ready to submit on Canvas."));
});

test("say report runs the check itself, names the flagged part's own text, and puts flags after the verdict", async () => {
  const { dir } = passingProject();
  const a = assignmentsRepo();
  const msg = await main(["say", "report", dir, "--assignments", a, "--weak", "1 why=it gives no reason", "--looks-like", "2=deployment"]);
  assert.ok(msg.startsWith(HEAD));
  assert.ok(msg.includes("Every own-words part is confirmed as yours."));
  assert.ok(
    msg.endsWith(
      [
        "It's ready to submit on Canvas.",
        '⚠️ Round 1, why next, "why 0", might lose credit: it gives no reason.',
        "⚠️ Round 2 looks like deployment, which earns nothing as a round.",
      ].join("\n\n"),
    ),
  );
});

test("say report refuses a flag it cannot place", async () => {
  const { dir } = passingProject();
  const a = assignmentsRepo();
  await assert.rejects(async () => main(["say", "report", dir, "--assignments", a, "--looks-like", "2=a refactor"]), /a bug fix/);
  await assert.rejects(async () => main(["say", "report", dir, "--assignments", a, "--weak", "7 new=vague"]), /round 7/);
  await assert.rejects(async () => main(["say", "report", dir, "--assignments", a, "--weak", "1 how=vague"]), /new or why/);
});

// find-rounds

const plan = (over) => ({ plan: "docs/superpowers/plans/2026-11-25-chart.md", spec: "docs/superpowers/specs/2026-11-25-chart-design.md", date: "2026-11-25", recorded: false, suggestedCommits: "abc1234..def5678", suggestedReason: null, ...over });

test("the candidate list words every missing spec, missing commits and judgment", () => {
  const msg = candidatesMessage({
    valid: 1,
    plans: [
      plan({}),
      plan({ plan: "docs/superpowers/plans/2026-11-26-a.md", spec: null, suggestedCommits: null, suggestedReason: "no code yet" }),
      plan({ plan: "docs/superpowers/plans/2026-11-27-b.md", suggestedCommits: null, suggestedReason: "code only before the plan" }),
      plan({ plan: "docs/superpowers/plans/2026-11-28-c.md", suggestedCommits: null, suggestedReason: "shares a commit with the next plan" }),
    ],
    outside: [],
    looksLike: { "docs/superpowers/plans/2026-11-25-chart.md": "catch-up on Problem Set 4" },
  });
  assert.equal(
    msg,
    [
      "Your project needs two rounds, and `ROUNDS.md` has 1 so far. Since your base, these plans aren't in it yet:",
      [
        "1. 2026-11-25, `docs/superpowers/plans/2026-11-25-chart.md`: spec `docs/superpowers/specs/2026-11-25-chart-design.md`, commits abc1234..def5678. This looks like catch-up on Problem Set 4, which does not count as a round.",
        "2. 2026-11-25, `docs/superpowers/plans/2026-11-26-a.md`: no spec with its name, so which spec goes with it?, and no commits implement it yet.",
        "3. 2026-11-25, `docs/superpowers/plans/2026-11-27-b.md`: spec `docs/superpowers/specs/2026-11-25-chart-design.md`, and its code was all committed before the plan, and code committed before its plan can't be a round.",
        "4. 2026-11-25, `docs/superpowers/plans/2026-11-28-c.md`: spec `docs/superpowers/specs/2026-11-25-chart-design.md`, and its code is in the commit that adds the next plan: which commits implement it?",
      ].join("\n"),
      "Only a plan committed after your base can be a round, and only the commits from the plan's own commit on can implement it.",
      "Which of these do you want to record? For each, are those the commits that implement it?",
    ].join("\n\n"),
  );
});

test("plans outside the project folder are named, in the list and when it is empty", () => {
  const outside = ["docs/superpowers/plans/2026-11-29-top.md"];
  const list = candidatesMessage({ valid: 0, plans: [plan({})], outside, looksLike: {} });
  assert.ok(list.includes("These plans are at the top of your repository, outside your project folder, so they can't be rounds: `docs/superpowers/plans/2026-11-29-top.md`. Put the next round's spec and plan in `docs/superpowers/` inside your project folder."));
  const empty = candidatesMessage({ valid: 1, plans: [], outside, looksLike: {} });
  assert.equal(
    empty,
    "Your project needs two rounds, and `ROUNDS.md` has 1 so far. These plans are at the top of your repository, outside your project folder, so they can't be rounds: `docs/superpowers/plans/2026-11-29-top.md`. A new round starts with a Superpowers spec and plan, inside your project folder in `docs/superpowers/`.",
  );
});

test("an empty list with nothing outside says every plan is in", () => {
  assert.equal(
    candidatesMessage({ valid: 2, plans: [], outside: [], looksLike: {} }),
    "Your project needs two rounds, and `ROUNDS.md` has 2 so far. Every plan committed since your base is already in it. A new round starts with a Superpowers spec and plan, inside your project folder in `docs/superpowers/`.",
  );
});

test("say candidates on a project with no base says why, and how to set one", () => {
  const { dir } = roundsRepo();
  assert.equal(
    main(["say", "candidates", dir]),
    "I can't look for rounds yet: ROUNDS.md has no Base: line with a commit hash yet.\n\nYour rounds start from your base. When your base works, put the hash of the commit where it does on the `Base:` line of `ROUNDS.md`, and commit that.",
  );
});

test("say candidates lists unrecorded plans and takes judgments by plan", () => {
  const r = roundsRepo();
  write(r.repo, "ROUNDS.md", withBase(r.base.slice(0, 7)));
  commit(r.repo, "name base");
  const msg = main(["say", "candidates", r.dir, "--looks-like", "docs/superpowers/plans/2026-11-22-exporter.md=a bug fix"]);
  assert.match(msg, /has 0 so far/);
  assert.match(msg, /1\. \d{4}-\d\d-\d\d, `docs\/superpowers\/plans\/2026-11-20-parser\.md`: spec `docs\/superpowers\/specs\/2026-11-20-parser-design\.md`, commits [0-9a-f]{7}\.\.[0-9a-f]{7}\.\n/);
  assert.match(msg, /2\. .*exporter\.md`.*This looks like a bug fix, which does not count as a round\./);
  assert.throws(() => main(["say", "candidates", r.dir, "--looks-like", "docs/superpowers/plans/nope.md=a bug fix"]), /not one of the plans/);
});

test("say needs a message name", () => {
  assert.throws(() => main(["say", "goodbye", "/x"]), /start-project, report or candidates/);
});
