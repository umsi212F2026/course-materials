import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { readBank, readFolderBanks } from "../lib/bank.mjs";

// Build a source in a temp dir from { "tasks/a-x/crumbs.md": text, ... }.
function source(files) {
  const dir = mkdtempSync(join(tmpdir(), "bank-test-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

const CRUMBS_TASK = `# Crumbs

The app: Crumbs.

### v1

What should it do first?

### v4

What would you cut?
`;

const CRUMBS_RUBRIC = `# Crumbs key

Must name: sleep.

### v1

- **goal:** \`c-a\`, \`c-b\`
- **answer:** Sleep.
- **credit:** - \`c-a\`: full for sleep.
  - \`c-b\`: full for cost.
- **tutor note:** Ask about the partner question.

### v4

- **goal:** \`c-a\`, \`c-b\`
- **answer:** The feed.
- **credit:** full for the feed.
`;

test("a scenario's questions carry its setup, its key and every goal", () => {
  const dir = source({
    "tasks/a-x/crumbs.md": CRUMBS_TASK,
    "rubrics/a-x/crumbs.md": CRUMBS_RUBRIC,
  });
  const { items, problems } = readFolderBanks(dir);
  assert.deepEqual(problems, []);
  assert.deepEqual(items.map((i) => i.label), ["a-x/crumbs/v1", "a-x/crumbs/v4"]);
  const [v1] = items;
  assert.equal(v1.bank, "a-x");
  assert.equal(v1.activity, "a-x");
  assert.equal(v1.scenario, "crumbs");
  assert.equal(v1.id, "v1");
  assert.deepEqual(v1.goals, ["c-a", "c-b"]);
  assert.equal("goal" in v1, false);
  assert.equal(v1.setup, "The app: Crumbs.");
  assert.ok(v1.prompt.startsWith("The app: Crumbs."));
  assert.ok(v1.prompt.endsWith("What should it do first?"));
  assert.equal(v1.key, "Must name: sleep.");
  assert.ok(v1.rubric.startsWith("Must name: sleep."));
  assert.ok(v1.rubric.includes("`c-b`: full for cost."));
  assert.ok(v1.rubric.includes("- `c-a`: full for sleep.\n- `c-b`: full for cost."));
  assert.equal(v1.tutorNote, "Ask about the partner question.");
  assert.equal(readFolderBanks(dir, "src").items[0].bank, "src/a-x");
});

test("main-bank has no setup, and a single goal also sets goal", () => {
  const dir = source({
    "tasks/a-x/main-bank.md": "# Main\n\n### q1\n\nName a risk.\n",
    "rubrics/a-x/main-bank.md": "# Main key\n\n### q1\n\n- **goal:** g-one\n- **answer:** Cost.\n",
  });
  const [item] = readFolderBanks(dir).items;
  assert.equal(item.setup, "");
  assert.equal(item.goal, "g-one");
  assert.deepEqual(item.goals, ["g-one"]);
  assert.equal(item.prompt, "Name a risk.");
  assert.equal(item.rubric, "Cost.");
});

test("a vocabulary move becomes a tag", () => {
  const dir = source({
    "tasks/a-words/idempotent.md": "### w1\n\nSpot the error.\n",
    "rubrics/a-words/idempotent.md": "### w1\n\n- **goal:** w-idem\n- **move:** CATCH\n- **answer:** It repeats.\n",
  });
  const [item] = readFolderBanks(dir).items;
  assert.equal(item.move, "CATCH");
  assert.deepEqual(item.tags, ["production"]);
});

test("question ids repeat across scenarios but not within one", () => {
  const two = (id) => `### ${id}\n\nQ.\n\n### ${id}\n\nQ again.\n`;
  const rub = (id) => `### ${id}\n\n- **answer:** A.\n\n### ${id}\n\n- **answer:** A.\n`;
  const ok = source({
    "tasks/a-x/s1.md": "### q1\n\nQ.\n",
    "rubrics/a-x/s1.md": "### q1\n\n- **answer:** A.\n",
    "tasks/a-x/s2.md": "### q1\n\nQ.\n",
    "rubrics/a-x/s2.md": "### q1\n\n- **answer:** A.\n",
  });
  const good = readFolderBanks(ok);
  assert.equal(good.items.length, 2);
  assert.deepEqual(good.problems, []);

  const bad = source({ "tasks/a-x/s1.md": two("q1"), "rubrics/a-x/s1.md": rub("q1") });
  assert.ok(readFolderBanks(bad).problems.some((p) => p.includes("q1")));
});

test("a scenario file with no rubric file is a problem naming it", () => {
  const dir = source({ "tasks/a-x/lonely.md": "### q1\n\nQ.\n" });
  const { items, problems } = readFolderBanks(dir);
  assert.equal(items.length, 0);
  assert.ok(problems.some((p) => p.includes("lonely.md")));
});

test("a question with no rubric entry, and a rubric entry with no question, are problems", () => {
  const dir = source({
    "tasks/a-x/s.md": "### q1\n\nQ.\n\n### q2\n\nQ.\n",
    "rubrics/a-x/s.md": "### q1\n\n- **answer:** A.\n\n### q9\n\n- **answer:** A.\n",
  });
  const { items, problems } = readFolderBanks(dir);
  assert.deepEqual(items.map((i) => i.id), ["q1"]);
  assert.ok(problems.some((p) => p.includes("q2")));
  assert.ok(problems.some((p) => p.includes("q9")));
});

test("single-file banks read as before, with folder items after them", () => {
  const dir = source({
    "tasks/items.md": "### i1\n\nFirst?\n\n### i2\n\nSecond?\n",
    "rubrics/items.md": "### i1\n\n- **goal:** g-1\n- **answer:** One.\n- **credit:** full for one.\n\n### i2\n\n- **answer:** Two.\n",
    "tasks/a-x/s.md": "### q1\n\nQ.\n",
    "rubrics/a-x/s.md": "### q1\n\n- **answer:** A.\n",
  });
  const { items, problems } = readBank(dir);
  assert.deepEqual(problems, []);
  assert.equal(items.length, 3);
  assert.deepEqual(items.slice(0, 2).map((i) => [i.bank, i.id]), [["items", "i1"], ["items", "i2"]]);
  assert.equal(items[0].goal, "g-1");
  assert.equal(items[0].prompt, "First?");
  assert.equal(items[0].rubric, "One. Full for one.");
  assert.equal(items[2].label, "a-x/s/q1");
});
