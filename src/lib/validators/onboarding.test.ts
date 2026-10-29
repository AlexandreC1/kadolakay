import { describe, expect, it } from "vitest";
import { onboardingChoiceSchema, onboardingProfileSchema, onboardingDestination } from "./onboarding";
import { createRegistrySchema } from "./registry";
import { occasionTypes, occasionLabel } from "@/lib/occasions";
describe("onboarding input and safe destinations", () => {
  it.each(occasionTypes)("supports a real %s registry and internal destination", choice => {
    const parsed = onboardingChoiceSchema.parse({ choice, locale: "fr" });
    expect(onboardingDestination(parsed)).toBe(`/fr/create?type=${choice}`);
    expect(createRegistrySchema.safeParse({ type: choice, title: "Our wishlist" }).success).toBe(true);
    for (const locale of ["ht", "fr", "en"]) expect(occasionLabel(choice, locale)).not.toBe(choice);
  });
  it("keeps exploring and skipping distinct from registry creation", () => {
    expect(onboardingDestination({ choice: "EXPLORE", locale: "en" })).toBe("/en/browse");
    expect(onboardingDestination({ choice: "SKIP", locale: "ht" })).toBe("/ht/my-registries");
  });
  it("rejects impersonation, role assignment and arbitrary redirects", () => {
    for (const extra of [{ userId: "other" }, { role: "ADMIN" }, { destination: "https://evil.example" }, { completedAt: "now" }]) {
      expect(onboardingChoiceSchema.safeParse({ choice: "BIRTHDAY", locale: "en", ...extra }).success).toBe(false);
      expect(onboardingProfileSchema.safeParse({ name: "A name", locale: "en", ...extra }).success).toBe(false);
    }
    expect(onboardingChoiceSchema.safeParse({ choice: "https://evil.example", locale: "en" }).success).toBe(false);
    expect(onboardingChoiceSchema.safeParse({ choice: "SKIP", locale: "//evil.example" }).success).toBe(false);
  });
  it("permits optional names, bounds them and treats markup as literal content", () => {
    expect(onboardingProfileSchema.parse({ name: "  ", locale: "ht" }).name).toBe("");
    expect(onboardingProfileSchema.safeParse({ name: "x".repeat(101), locale: "en" }).success).toBe(false);
    expect(onboardingProfileSchema.parse({ name: "<script>alert(1)</script>", locale: "fr" }).name).toBe("<script>alert(1)</script>");
  });
});
