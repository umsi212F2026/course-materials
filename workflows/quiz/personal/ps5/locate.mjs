//
// Where PS5's folder is in a student's clone. It reads files on the host and runs nothing.
//
// THE FOLDER IS A TOP-LEVEL ONE WHOSE NAME STARTS WITH ps5. The student's agent sometimes names
// it for the workflow (ps5-tracker). `ps5` is tried first and the rest alphabetically, ignoring
// case, so every machine picks the same one.
//
// A FOLDER COUNTS WHEN THE STUDENT HAS WORKED IN IT. The assignments repository hands every
// student six starter files, and those prove nothing. A CHANGES.md counts only when it is no
// longer the placeholder. Any other file, or any starter file's name used by a different path,
// counts.

import { readdirSync } from "node:fs";
import { listFiles, readRepoFile } from "../lib/files.mjs";

const STARTER = new Set(["AGENTS.md", "CHANGES.md", "INSTRUCTIONS.md", "README.md", "examples/README.md", "skills/README.md"]);
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const squash = (s) => s.replace(/\r/g, "").replace(/\s+/g, " ").trim();
const PLACEHOLDER = squash("# Change record\n\nInitial design: <commit hash>");

export function locatePs5(repoDir) {
  const folders = readdirSync(repoDir, { withFileTypes: true }).filter((d) => d.isDirectory() && /^ps5/i.test(d.name)).map((d) => d.name)
    .sort((a, b) => (b.toLowerCase() === "ps5") - (a.toLowerCase() === "ps5") || byName(a.toLowerCase(), b.toLowerCase()));
  for (const folder of folders) {
    const below = listFiles(repoDir, folder).map((p) => p.slice(folder.length + 1));
    const worked = below.some((p) => {
      if (!STARTER.has(p)) return true;
      if (p !== "CHANGES.md") return false;
      return squash(readRepoFile(repoDir, `${folder}/${p}`) ?? "") !== PLACEHOLDER;
    });
    if (worked) return { folder };
  }
  return { missing: "No ps5/ folder with work of your own was found in your assignments repository." };
}
