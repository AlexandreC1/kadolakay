import { describe, expect, it } from "vitest";
import { checkoutAccessAllowed } from "@/lib/validators/checkout";

const reg = (o: Partial<{ status: string; isPublic: boolean; shareToken: string }> = {}) => ({
  status: "PUBLISHED", isPublic: true, shareToken: "tok_abcdefghijkl", ...o,
});

describe("checkoutAccessAllowed", () => {
  it("allows public published registries", () => expect(checkoutAccessAllowed(reg())).toBe(true));
  it("blocks drafts and archived even with token", () => {
    expect(checkoutAccessAllowed(reg({ status: "DRAFT" }), "tok_abcdefghijkl")).toBe(false);
    expect(checkoutAccessAllowed(reg({ status: "ARCHIVED" }))).toBe(false);
  });
  it("private requires the exact share token", () => {
    const r = reg({ isPublic: false });
    expect(checkoutAccessAllowed(r)).toBe(false);
    expect(checkoutAccessAllowed(r, "wrong")).toBe(false);
    expect(checkoutAccessAllowed(r, "tok_abcdefghijkX")).toBe(false);
    expect(checkoutAccessAllowed(r, "tok_abcdefghijkl")).toBe(true);
  });
});
