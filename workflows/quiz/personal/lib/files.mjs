//
// Every file under one folder of a student's clone, as paths relative to the clone.
//
// NEVER FOLLOWS A SYMLINK AND SKIPS DEPENDENCY AND ENVIRONMENT FOLDERS (node_modules, .git, Python
// virtual environments and their caches). A clone is student-controlled, so a link to / or a
// committed node_modules or .venv would otherwise turn one listing into a walk of the whole disk,
// and could exhaust the cap before the folders that matter sort into view. The cap is the
// backstop for whatever else a repository holds. A `dir` that is a symlink, or whose own path
// runs through one, or is not a directory, lists nothing.
//
// readRepoFile READS ONE FILE UNDER THE SAME RULE: IT RETURNS null FOR A PATH THAT IS OR RUNS THROUGH
// A SYMLINK. A committed REFLECTION.md that links to ~/.ssh/id_ed25519 would otherwise be read on the
// host and handed to a judge or an extractor. Only a regular file, reached through real directories,
// is read; an absolute path or a `..` segment is refused for the same reason.

import { readdirSync, readFileSync, lstatSync, existsSync } from "node:fs";
import { join, isAbsolute } from "node:path";

const SKIP = new Set(["node_modules", ".git", ".venv", "venv", "__pycache__", "site-packages"]);
export const MAX_FILES = 5000;

export function listFiles(root, dir = "") {
  const base = dir === "." ? "" : dir.replace(/\/+$/, "");
  const out = [];
  if (!existsSync(join(root, base))) return out;
  let at = "";
  for (const part of base.split("/").filter(Boolean)) {
    at = at ? `${at}/${part}` : part;
    if (lstatSync(join(root, at)).isSymbolicLink()) return out;
  }
  if (!lstatSync(join(root, base)).isDirectory()) return out;
  (function walk(rel) {
    for (const name of readdirSync(join(root, rel)).sort()) {
      if (out.length >= MAX_FILES) return;
      const r = rel ? `${rel}/${name}` : name;
      const st = lstatSync(join(root, r));
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) { if (!SKIP.has(name)) walk(r); }
      else if (st.isFile()) out.push(r);
    }
  })(base);
  return out;
}

export function readRepoFile(root, rel) {
  if (typeof rel !== "string" || !rel || isAbsolute(rel)) return null;
  const parts = rel.split("/").filter(Boolean);
  if (!parts.length || parts.includes("..")) return null;
  let at = "";
  for (let i = 0; i < parts.length; i++) {
    at = at ? `${at}/${parts[i]}` : parts[i];
    let st;
    try { st = lstatSync(join(root, at)); } catch { return null; }
    if (st.isSymbolicLink()) return null;
    if (i < parts.length - 1 ? !st.isDirectory() : !st.isFile()) return null;
  }
  return readFileSync(join(root, at), "utf8");
}
