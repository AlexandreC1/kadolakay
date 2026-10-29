import { describe, expect, it } from "vitest";
import { canPerform, permissions } from "./permissions";
describe("role permission policy", () => {
  it("permits ordinary member tasks without granting administrative access", () => {
    for (const role of ["USER", "BUSINESS_OWNER", "ADMIN"] as const) {
      expect(canPerform(role, "registry:create")).toBe(true);
      expect(canPerform(role, "profile")).toBe(true);
      expect(canPerform(role, "admin:business")).toBe(role === "ADMIN");
      expect(canPerform(role, "product:edit")).toBe(role !== "USER");
    }
  });
  it("denies unknown actions and inherited property names", () => {
    for (const action of ["", "admin:users", "toString", "__proto__"]) expect(canPerform("ADMIN", action)).toBe(false);
    expect(Object.keys(permissions).length).toBeGreaterThan(10);
  });
});
