/**
 * Workstream file-ownership check (kadolakay-plan.md §1).
 *
 * Usage:  npx tsx scripts/check-ownership.ts <branch> [file ...]
 *         (files default to `git diff --name-only origin/main...HEAD`)
 *
 * Branches not named ws<N>/... are skipped (hotfixes, dependabot). A file is
 * allowed if it matches the 'shared' list or its most specific owner is ws<N>.
 * Patterns are globs: ** = any depth, * = within a segment, [[] = literal '['.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

interface OwnershipMap {
  shared: string[];
  owners: Record<string, string[]>;
}

export function globToRegExp(glob: string): RegExp {
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

/** Specificity = length of the pattern without wildcards. */
function specificity(glob: string) {
  return glob.replace(/\*+/g, "").length;
}

export function ownerOf(file: string, map: OwnershipMap): string | null {
  let best: { ws: string; score: number } | null = null;
  for (const [ws, globs] of Object.entries(map.owners)) {
    for (const g of globs) {
      if (globToRegExp(g).test(file)) {
        const score = specificity(g);
        if (!best || score > best.score) best = { ws, score };
      }
    }
  }
  return best?.ws ?? null;
}

export function checkFiles(branch: string, files: string[], map: OwnershipMap) {
  const m = /^(ws\d+)\//.exec(branch);
  if (!m) return { skipped: true as const, violations: [] as { file: string; owner: string | null }[] };
  const ws = m[1];
  const shared = map.shared.map(globToRegExp);
  const violations = files
    .filter((f) => !shared.some((r) => r.test(f)))
    .map((file) => ({ file, owner: ownerOf(file, map) }))
    .filter((v) => v.owner !== ws);
  return { skipped: false as const, ws, violations };
}

function main() {
  const [branch = process.env.GITHUB_HEAD_REF ?? "", ...argFiles] = process.argv.slice(2);
  const map: OwnershipMap = JSON.parse(
    readFileSync(path.join(process.cwd(), ".github/ownership.json"), "utf8")
  );
  const base = process.env.OWNERSHIP_BASE ?? "origin/main";
  const files = argFiles.length
    ? argFiles
    : execSync(`git diff --name-only ${base}...HEAD`, { encoding: "utf8" }).split("\n").filter(Boolean);

  const result = checkFiles(branch, files, map);
  if (result.skipped) {
    console.log(`ownership: branch "${branch}" is not a workstream branch; skipping.`);
    return;
  }
  if (result.violations.length === 0) {
    console.log(`ownership: ${files.length} file(s) OK for ${result.ws}.`);
    return;
  }
  console.error(`ownership: ${result.ws} touched files it does not own:`);
  for (const v of result.violations) console.error(`  ${v.file}  (owner: ${v.owner ?? "unassigned"})`);
  console.error("Ask the owning workstream, or update .github/ownership.json in a WS0 PR.");
  process.exit(1);
}

if (process.argv[1] && /check-ownership\.ts$/.test(process.argv[1])) main();
