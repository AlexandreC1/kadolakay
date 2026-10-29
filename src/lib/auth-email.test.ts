import { describe, expect, it } from "vitest";
import { normalizeEmailIdentifier } from "./auth-email";

describe("magic-link email normalization", () => {
  it("canonicalizes before validating", () => {
    expect(normalizeEmailIdentifier("  Marie.Jean+gift@Example.COM ")).toBe("marie.jean+gift@example.com");
    expect(normalizeEmailIdentifier("marie＠example.com")).toBe("marie@example.com");
  });
  it.each([
    "victim@example.com＠attacker.com",
    "victim@example.com﹫attacker.com",
    "victim@example.com,attacker@example.com",
    "victim@example.com\nattacker@example.com",
    "victim@example.com@attacker.com",
    "invalid",
  ])("rejects ambiguous recipients: %s", (identifier) => {
    expect(() => normalizeEmailIdentifier(identifier)).toThrow("Invalid email address");
  });
});
