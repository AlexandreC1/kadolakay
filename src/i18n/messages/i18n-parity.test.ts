import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "src/i18n/messages");
const load = (l: string) => JSON.parse(readFileSync(path.join(dir, `${l}.json`), "utf8"));
function keys(o: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("i18n", () => {
  const [ht, fr, en] = ["ht", "fr", "en"].map((l) => keys(load(l)).sort());
  it("ht, fr and en have identical key sets", () => {
    expect(fr).toEqual(ht);
    expect(en).toEqual(ht);
  });
  it("no empty strings", () => {
    for (const l of ["ht", "fr", "en"]) {
      const flat = keys(load(l));
      const data = load(l);
      for (const k of flat) {
        const v = k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], data);
        expect(String(v).trim(), `${l}:${k}`).not.toBe("");
      }
    }
  });
  it("every _pending key is already merged", () => {
    const pendingDir = path.join(dir, "_pending");
    let files: string[] = [];
    try {
      files = readdirSync(pendingDir).filter((f) => f.endsWith(".json"));
    } catch {
      return;
    }
    for (const f of files) {
      const pending = JSON.parse(readFileSync(path.join(pendingDir, f), "utf8")) as Record<string, Record<string, unknown>>;
      for (const l of Object.keys(pending)) {
        const have = new Set(keys(load(l)));
        for (const k of keys(pending[l])) expect(have.has(k), `${f} ${l}:${k}`).toBe(true);
      }
    }
  });
});
