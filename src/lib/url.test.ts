import { describe, it, expect } from "vitest";
import { isSafeHttpUrl, safeHref, safeHttpUrl, isAllowedImageUrl, isAmazonUrl, optionalSafeHttpUrl } from "./url";
import { z } from "zod";

const evil = [
  "javascript:alert(document.cookie)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "\tjavascript:alert(1)",
  "java\nscript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)", "file:///etc/passwd",
  "//evil.com", "https://user:pass@evil.com", "", "a".repeat(3000),
];

describe("isSafeHttpUrl (H1)", () => {
  it("documents the zod gap this closes", () => {
    expect(z.string().url().safeParse("javascript:alert(document.cookie)").success).toBe(true);
  });
  it.each(evil)("rejects %j", (u) => {
    expect(isSafeHttpUrl(u)).toBe(false);
    expect(safeHref(u)).toBeNull();
    expect(safeHttpUrl.safeParse(u).success).toBe(false);
  });
  it("accepts normal shop links", () => {
    for (const u of ["https://www.amazon.com/dp/B0", "http://shop.ht/item?id=1#x"]) expect(isSafeHttpUrl(u)).toBe(true);
  });
  it("optional form field: '' → undefined, bad → error", () => {
    expect(optionalSafeHttpUrl.parse("")).toBeUndefined();
    expect(optionalSafeHttpUrl.safeParse("javascript:x").success).toBe(false);
  });
});

describe("image + amazon hosts", () => {
  it("images must live on the CDN when configured", () => {
    expect(isAllowedImageUrl("https://cdn.kadolakay.com/uploads/a.png", "https://cdn.kadolakay.com")).toBe(true);
    expect(isAllowedImageUrl("https://cdn.kadolakay.com.evil.io/a.png", "https://cdn.kadolakay.com")).toBe(false);
    expect(isAllowedImageUrl("https://evil.io/a.png", "https://cdn.kadolakay.com")).toBe(false);
    expect(isAllowedImageUrl("http://x.io/a.png", undefined)).toBe(false);
  });
  it("amazon wishlist host allowlist", () => {
    expect(isAmazonUrl("https://www.amazon.com/hz/wishlist/ls/X")).toBe(true);
    expect(isAmazonUrl("https://amazon.com.evil.io/x")).toBe(false);
  });
});
