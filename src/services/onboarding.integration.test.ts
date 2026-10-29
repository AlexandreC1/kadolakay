import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getOwnedOnboarding, saveOnboardingProfile, finishOnboarding } from "./onboarding";
import { createRegistryForUser, findPublicRegistry } from "./registry";
const run = process.env.RUN_DB_TESTS === "1", users: string[] = [];
async function user() { const result = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(result.id); return result; }
afterAll(async () => { for (const id of users) await db.user.delete({ where: { id } }); if (run) await db.$disconnect(); });
describe.skipIf(!run)("onboarding persistence on PostgreSQL", () => {
  it("saves profile, resumes, completes without creating lists, and never promotes roles", async () => {
    const owner = await user();
    await saveOnboardingProfile(owner.id, { name: "  Family name  ", locale: "fr" });
    const state = await getOwnedOnboarding(owner.id);
    expect(state?.name).toBe("Family name"); expect(state?.onboardingStep).toBe(1);
    expect(state).not.toHaveProperty("email"); expect(state).not.toHaveProperty("role");
    expect(await finishOnboarding(owner.id, { choice: "CHRISTMAS", locale: "fr" })).toBe("/fr/create?type=CHRISTMAS");
    const first = await db.user.findUniqueOrThrow({ where: { id: owner.id } });
    expect(first.onboardingCompletedAt).toBeInstanceOf(Date); expect(first.role).toBe("USER");
    expect(await db.registry.count({ where: { userId: owner.id } })).toBe(0);
    await Promise.all([finishOnboarding(owner.id, { choice: "SKIP", locale: "en" }), saveOnboardingProfile(owner.id, { name: "Family", locale: "fr" })]);
    const replayed = await getOwnedOnboarding(owner.id);
    expect(replayed?.onboardingStep).toBe(2); expect(replayed?.onboardingCompletedAt).toEqual(first.onboardingCompletedAt); expect(replayed?.onboardingDeferredAt).toBeNull();
  });
  it("supports defer then resume, optional names and completion without a profile", async () => {
    const owner = await user();
    await saveOnboardingProfile(owner.id, { name: "", locale: "ht" });
    await finishOnboarding(owner.id, { choice: "SKIP", locale: "ht" });
    expect((await getOwnedOnboarding(owner.id))?.onboardingCompletedAt).toBeNull();
    expect((await getOwnedOnboarding(owner.id))?.onboardingDeferredAt).toBeInstanceOf(Date);
    await finishOnboarding(owner.id, { choice: "EXPLORE", locale: "en" });
    expect((await getOwnedOnboarding(owner.id))?.onboardingDeferredAt).toBeNull();
    expect((await getOwnedOnboarding(owner.id))?.onboardingCompletedAt).toBeInstanceOf(Date);
    expect((await getOwnedOnboarding(owner.id))?.name).toBeNull();
  });
  it("rejects tampered input without changing either account", async () => {
    const owner = await user(), other = await user();
    await expect(saveOnboardingProfile(owner.id, { userId: other.id, name: "Hijack", locale: "en" })).rejects.toThrow("INVALID_ONBOARDING");
    await expect(finishOnboarding(owner.id, { choice: "BIRTHDAY", locale: "en", role: "ADMIN" })).rejects.toThrow("INVALID_ONBOARDING");
    expect((await getOwnedOnboarding(other.id))?.onboardingStep).toBe(0);
    expect((await getOwnedOnboarding(owner.id))?.onboardingStep).toBe(0);
    await expect(finishOnboarding("missing-user", { choice: "SKIP", locale: "en" })).rejects.toThrow("ONBOARDING_USER_MISSING");
  });
  it("persists the added occasions as real private drafts", async () => {
    const owner = await user();
    for (const type of ["CHRISTMAS", "SHOPPING", "OTHER"] as const) {
      const registry = await createRegistryForUser(owner.id, { type, title: `Our ${type} list`, locale: "en", isPublic: true });
      expect(registry.type).toBe(type); expect(registry.status).toBe("DRAFT");
      expect(await findPublicRegistry(registry.slug)).toBeNull();
    }
  });
});
