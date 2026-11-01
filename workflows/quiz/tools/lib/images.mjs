// The draw-time image step: rewrite a bank prompt's `![alt](file.png)` line to the content-hash
// URL the quiz app serves, and say which file each hash stands for.
//
// THE REWRITE HAPPENS HERE AND NOT IN bank.mjs. The study path reads `prompt` from the bank and
// shows it to a person at a desk; handing it `/api/images/<hash>.png`, a URL that exists only in
// the quiz app, would break every image there. So bank.mjs keeps the source-relative path, and
// only a draw, which is headed for the quiz app, rewrites it. The practice quiz and the
// instructor's bake both come through here, so the two cannot drift.
//
// PATHS ARE RETURNED, NOT BYTES. The quiz skill reads quiz-draw's stdout, and a few hundred
// kilobytes of base64 in that stream is noise the skill must carry and cannot use. The map says
// where each image is; whoever needs the bytes (the seed, the practice page) reads the file.
//
// BUILT-INS ONLY, because the instructor's bake imports this file by relative path.

import { readFileSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// The largest image, decoded, that the seed will accept. It matches the quiz app's cap and the
// seed's, so an author's bank check fails here rather than on seed day.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_LINE = /^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/;
// Greedy on purpose: alt text may hold brackets, and a reference must not slip past by having them.
// The renderer's fence pattern (lib/markdown.mjs), so the two agree on what is code.
const FENCE = /^\s*(`{3,}|~{3,})/;
const ANY_IMAGE = /!\[.*\]\(/;
// Two letters or more, so a Windows drive letter is not mistaken for a scheme.
const SCHEME = /^[A-Za-z][A-Za-z0-9+.-]+:/;
const DRIVE = /^[A-Za-z]:[\\/]/;

/** The source folder an item's task file lives in. A pool carrying `topic` is the single-source
 *  form, whose banks are bare names; otherwise `bank` is `<source label>/<activity or file>` and
 *  the source is everything before the last slash. */
export function sourceDir(pool, item, root) {
  if (pool.topic) return join(root, "learning-topics", pool.topic);
  return join(root, dirname(String(item.bank ?? "")));
}

/** The task file an item was read from: tasks/<activity>/<scenario>.md for a folder item, else
 *  tasks/<bank file>.md. An image path is relative to this file's folder. */
export function taskFile(src, item) {
  if (item.activity && item.scenario) return join(src, "tasks", item.activity, `${item.scenario}.md`);
  return join(src, "tasks", `${basename(String(item.bank ?? ""))}.md`);
}

// Resolve one image target to { path, hash } or { problem } (a reason, without the item id).
function load(src, item, target) {
  if (SCHEME.test(target)) return { problem: "is a URL, and only a file beside the task is allowed" };
  if (isAbsolute(target) || DRIVE.test(target)) return { problem: "is an absolute path, and only a path beside the task is allowed" };
  const path = resolve(dirname(taskFile(src, item)), target);
  const rel = relative(src, path);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    return { problem: "points outside the source folder" };
  }
  let bytes;
  try {
    // A link inside the source can point outside it, and readFileSync follows links, so the
    // lexical check above is not enough: compare where the file really is.
    const real = relative(realpathSync(src), realpathSync(path));
    if (real === "" || real === ".." || real.startsWith(`..${sep}`) || isAbsolute(real)) {
      return { problem: "points outside the source folder" };
    }
    bytes = readFileSync(path);
  } catch (e) {
    return { problem: e?.code === "ENOENT" ? "does not exist" : "cannot be read" };
  }
  if (bytes.length < PNG_SIGNATURE.length || !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return { problem: "is not a PNG" };
  }
  if (bytes.length > MAX_IMAGE_BYTES) return { problem: "is over 2 MB" };
  return { path, hash: createHash("sha256").update(bytes).digest("hex") };
}

/** Rewrite one item's image lines. Returns { item, images, problems }: `item` is a NEW object with
 *  the prompt rewritten (the input is not touched), or `null` when the item is dropped; `images`
 *  maps each hash to the absolute path of a file with those bytes; `problems` are strings naming
 *  the item and the path. An item with any problem is dropped rather than served with a broken
 *  picture, and the caller decides whether to proceed, as with the bank's own problems.
 *
 *  THIS IS THE PRIMITIVE, per item, so a caller can tell which input a result came from. Items
 *  from different topics can share an `id`, so matching output to input by id is not safe.
 *
 *  ONLY A LINE OF ITS OWN IS AN IMAGE. `![alt](file.png)` in mid-sentence, or an author's own
 *  `/api/images/...` URL, is a leftover and a problem: the renderer shows only a figure line, and
 *  an author must not be able to name a hash the seed never checked. */
export function resolveItem(item, src) {
  const bad = [];
  const found = {};
  const name = `${item.id}${item.bank ? ` (${item.bank})` : ""}`;
  let fence = null;
  const lines = String(item.prompt ?? "").split("\n").map((raw) => {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    // Inside a fenced block a line is code, shown as it is: never rewritten, never flagged.
    const mark = FENCE.exec(line)?.[1];
    if (fence) {
      if (mark && line.trim().startsWith(fence)) fence = null;
      return raw;
    }
    if (mark) {
      fence = mark;
      return raw;
    }
    const m = IMAGE_LINE.exec(line);
    if (!m) {
      if (ANY_IMAGE.test(line.replace(/`[^`]+`/g, ""))) bad.push(`${name}: image reference "${line.trim()}" is not on a line of its own, or is already a served URL`);
      return raw;
    }
    const [, alt, target] = m;
    if (target.startsWith("/api/images/")) {
      bad.push(`${name}: image reference "${target}" is a served URL; write the file name beside the task instead`);
      return raw;
    }
    const got = load(src, item, target);
    if (got.problem) {
      bad.push(`${name}: image ${target} ${got.problem}`);
      return raw;
    }
    found[got.hash] = got.path;
    return `![${alt}](/api/images/${got.hash}.png)`;
  });
  if (bad.length) return { item: null, images: {}, problems: bad };
  // An item with no prompt has nothing to rewrite, and gains no empty one.
  return { item: item.prompt == null ? { ...item } : { ...item, prompt: lines.join("\n") }, images: found, problems: [] };
}

/** Rewrite every image line in the drawn items' prompts, item by item through resolveItem.
 *
 *  `sourceOf(item)` gives the item's source folder. Returns { items, images, problems }: the kept
 *  items in input order, one `images` map (the first path wins for shared bytes), and all the
 *  problems. */
export function resolveImages(items, sourceOf) {
  const out = [];
  const images = {};
  const problems = [];
  for (const item of items) {
    const got = resolveItem(item, sourceOf(item));
    problems.push(...got.problems);
    if (!got.item) continue;
    for (const [hash, path] of Object.entries(got.images)) images[hash] ??= path;
    out.push(got.item);
  }
  return { items: out, images, problems };
}
