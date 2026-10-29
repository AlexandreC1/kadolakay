import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { globToRegExp, ownerOf, checkFiles } from "./check-ownership";

const map = JSON.parse(readFileSync(".github/ownership.json", "utf8"));

describe("ownership globs", () => {
  it("matches Next.js bracket paths literally", () => {
    expect(globToRegExp("src/app/[[]locale]/(auth)/**").test("src/app/[locale]/(auth)/login/page.tsx")).toBe(true);
    expect(globToRegExp("src/lib/payments/**").test("src/lib/payments/paypal.ts")).toBe(true);
    expect(globToRegExp("*.json").test("a/b.json")).toBe(false);
  });
  it("assigns existing files to the right workstream (most specific wins)", () => {
    expect(ownerOf("prisma/schema.prisma", map)).toBe("ws0");
    expect(ownerOf("src/lib/validators/user.ts", map)).toBe("ws6");
    expect(ownerOf("src/lib/validators/registry.ts", map)).toBe("ws3");
    expect(ownerOf("src/app/[locale]/(registry)/r/[slug]/checkout/page.tsx", map)).toBe("ws1");
    expect(ownerOf("src/app/[locale]/(registry)/r/[slug]/page.tsx", map)).toBe("ws3");
    expect(ownerOf("src/app/[locale]/(dashboard)/admin/businesses/actions.ts", map)).toBe("ws5");
  });
  it("flags cross-workstream edits and allows shared/test files", () => {
    const r = checkFiles("ws3/urls", ["src/lib/url.ts", "src/lib/auth.ts", "src/lib/url.test.ts"], map);
    expect(r.violations).toEqual([{ file: "src/lib/auth.ts", owner: "ws2" }]);
    expect(checkFiles("hotfix/x", ["anything"], map).skipped).toBe(true);
  });
});

describe("coverage", () => {
  it("every tracked source file has an owner", () => {
    const files = execSync("git ls-files src public prisma", { encoding: "utf8" }).split("\n").filter(Boolean);
    const shared: RegExp[] = (map.shared as string[]).map((g) => globToRegExp(g));
    const unowned = files.filter((f) => !shared.some((r) => r.test(f)) && !ownerOf(f, map));
    expect(unowned).toEqual([]);
  });
});
