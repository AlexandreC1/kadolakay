import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { checkFiles, globToRegExp, loadMap, ownerOf, unowned } from "./check-ownership.mjs";

const map = loadMap();

test("glob patterns handle brackets, single and deep wildcards", () => {
  assert.ok(globToRegExp("src/app/[[]locale]/admin/**").test("src/app/[locale]/admin/orders/page.tsx"));
  assert.ok(!globToRegExp("src/lib/*.ts").test("src/lib/payments/stripe.ts"));
  assert.ok(globToRegExp("**/*.test.ts").test("src/lib/a.test.ts"));
  assert.ok(globToRegExp("*").test("package.json"));
  assert.ok(!globToRegExp("*").test("src/proxy.ts"));
});

test("the most specific pattern decides the owner", () => {
  assert.equal(ownerOf("src/components/registry/ItemCard.tsx", map), "ws3");
  assert.equal(ownerOf("src/components/layout/Footer.tsx", map), "ws6");
  assert.equal(ownerOf("src/lib/registry-access.ts", map), "ws2");
  assert.equal(ownerOf("src/lib/registry-progress.ts", map), "ws3");
  assert.equal(ownerOf("src/lib/inventory-copy.ts", map), "ws1");
  assert.equal(ownerOf("src/lib/home-copy.ts", map), "ws6");
  assert.equal(ownerOf("src/app/[locale]/(business)/browse/page.tsx", map), "ws3");
  assert.equal(ownerOf("src/app/[locale]/(business)/business/orders/page.tsx", map), "ws5");
  assert.equal(ownerOf("src/app/[locale]/(registry)/r/[slug]/checkout/page.tsx", map), "ws1");
  assert.equal(ownerOf("prisma/schema.prisma", map), "ws0");
  assert.equal(ownerOf("docs/QUALITY-LOOP.md", map), "ws8");
  assert.equal(ownerOf("docs/agents/README.md", map), "ws0");
});

test("workstream branches may only touch their own and shared files", () => {
  const ok = checkFiles("ws6/T6.2-header", ["src/components/layout/Header.tsx", "src/components/layout/Header.test.tsx", "src/i18n/messages/_pending/ws6.json"], map);
  assert.deepEqual(ok.violations, []);
  const bad = checkFiles("ws6/T6.2-header", ["prisma/schema.prisma", "src/lib/auth.ts"], map);
  assert.deepEqual(bad.violations.map((v) => v.owner), ["ws0", "ws2"]);
  assert.equal(checkFiles("codex/quality-loop", ["prisma/schema.prisma"], map).skipped, true);
  assert.equal(checkFiles("ws9/x", ["README.md"], map).unknownWorkstream, true);
});

test("every tracked file has an owner", () => {
  const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
  assert.deepEqual(unowned(files, map), []);
});
