import { describe, expect, it } from "vitest";
import { registryAddress } from "./registry-address";
describe("privacy-preserving registry address lookup", () => {
  it("accepts shared local registry addresses and exact slugs", () => {
    for (const input of ["our-wedding", "/en/r/our-wedding", "https://kadolakay.example/fr/r/our-wedding"]) expect(registryAddress(input, "https://kadolakay.example")).toBe("our-wedding");
  });
  it("rejects external origins, script URLs, unrelated paths, credentials, and overlong input", () => {
    for (const input of ["https://evil.example/r/x", "javascript:alert(1)", "/admin", "//evil.example/r/x", "https://user:pass@kadolakay.example/r/x", "x".repeat(501), "/r/x?private=true"]) expect(registryAddress(input, "https://kadolakay.example")).toBeNull();
  });
});
