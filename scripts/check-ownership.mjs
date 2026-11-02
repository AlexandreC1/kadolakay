#!/usr/bin/env node
/**
 * Workstream file-ownership check for parallel agents (docs/agents/README.md).
 *
 *   node scripts/check-ownership.mjs <branch> [file ...]   check a branch's changed files
 *   node scripts/check-ownership.mjs --coverage            list tracked files with no owner
 *
 * Changed files default to `git diff --name-only $OWNERSHIP_BASE...HEAD`.
 * Branches not named ws<N>/... are skipped (lead work, hotfixes, Codex branches).
 * A file is allowed when it matches 'shared' or its most specific owner is ws<N>.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (glob.startsWith("[[]", i)) { re += "\\["; i += 2; continue; }
    if (glob.startsWith("**/", i)) { re += "(?:.*/)?"; i += 2; continue; }
    if (glob.startsWith("**", i)) { re += ".*"; i += 1; continue; }
    if (c === "*") { re += "[^/]*"; continue; }
    if (c === "?") { re += "[^/]"; continue; }
    re += /[.+^${}()|\\\]]/.test(c) ? `\\${c}` : c;
  }
  return new RegExp(`^${re}$`);
}

/** Specificity: the pattern's length without wildcards. Longest literal match wins. */
const specificity = (glob) => glob.replace(/\*+/g, "").length;

export function ownerOf(file, map) {
  let best = null;
  for (const [ws, globs] of Object.entries(map.owners)) {
    for (const glob of globs) {
      if (!globToRegExp(glob).test(file)) continue;
      const score = specificity(glob);
      if (!best || score > best.score) best = { ws, score };
    }
  }
  return best?.ws ?? null;
}

export const isShared = (file, map) => map.shared.some((glob) => globToRegExp(glob).test(file));

export function checkFiles(branch, files, map) {
  const match = /^(ws\d+)\//.exec(branch);
  if (!match) return { skipped: true, violations: [] };
  const ws = match[1];
  if (!map.owners[ws]) return { skipped: false, ws, violations: files.map((file) => ({ file, owner: null })), unknownWorkstream: true };
  const violations = files
    .filter((file) => !isShared(file, map))
    .map((file) => ({ file, owner: ownerOf(file, map) }))
    .filter((v) => v.owner !== ws);
  return { skipped: false, ws, violations };
}

export function unowned(files, map) {
  return files.filter((file) => !isShared(file, map) && !ownerOf(file, map));
}

export function loadMap(root = process.cwd()) {
  return JSON.parse(readFileSync(path.join(root, ".github/ownership.json"), "utf8"));
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).split("\n").filter(Boolean);
}

function main(argv) {
  const map = loadMap();
  if (argv[0] === "--coverage") {
    const missing = unowned(git(["ls-files"]), map);
    if (!missing.length) return console.log("ownership: every tracked file has an owner.");
    console.error(`ownership: ${missing.length} tracked file(s) have no owner:`);
    for (const file of missing) console.error(`  ${file}`);
    process.exitCode = 1;
    return;
  }
  const [branch = process.env.GITHUB_HEAD_REF ?? "", ...argFiles] = argv;
  const base = process.env.OWNERSHIP_BASE ?? "origin/main";
  const files = argFiles.length ? argFiles : git(["diff", "--name-only", `${base}...HEAD`]);
  const result = checkFiles(branch, files, map);
  if (result.skipped) return console.log(`ownership: "${branch}" is not a workstream branch; skipping.`);
  if (result.unknownWorkstream) {
    console.error(`ownership: ${result.ws} is not defined in .github/ownership.json.`);
    process.exitCode = 1;
    return;
  }
  if (!result.violations.length) return console.log(`ownership: ${files.length} file(s) OK for ${result.ws}.`);
  console.error(`ownership: ${result.ws} changed files it does not own:`);
  for (const v of result.violations) console.error(`  ${v.file}  (owner: ${v.owner ?? "unassigned"})`);
  console.error("Ask the owning workstream in your PR body, or change .github/ownership.json in a ws0 PR.");
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
