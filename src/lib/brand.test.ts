import { describe, expect, it } from "vitest";
import { brandEmailSender } from "./brand";

describe("sender branding", () => {
  it("renames the display label while preserving the verified address", () => {
    expect(brandEmailSender("KadoLakay <noreply@kadolakay.example>")).toBe("Bayou <noreply@kadolakay.example>");
    expect(brandEmailSender("noreply@kadolakay.example")).toBe("noreply@kadolakay.example");
  });
  it("preserves custom sender names and missing configuration", () => {
    expect(brandEmailSender("Support <support@example.com>")).toBe("Support <support@example.com>");
    expect(brandEmailSender(undefined)).toBeUndefined();
  });
});
