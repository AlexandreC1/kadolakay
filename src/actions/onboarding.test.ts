import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), profile: vi.fn(), finish: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/services/authorization", () => ({ requireActor: mocks.actor }));
vi.mock("@/services/onboarding", () => ({ saveOnboardingProfile: mocks.profile, finishOnboarding: mocks.finish }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { saveWelcomeProfile, chooseWelcomeOccasion } from "./onboarding";
describe("onboarding public action boundary", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.actor.mockResolvedValue({ id: "real-actor", role: "USER" }); mocks.finish.mockResolvedValue("/en/create?type=BIRTHDAY"); });
  it("authenticates each invocation and binds persistence to the session actor", async () => {
    await saveWelcomeProfile({ name: "Family", locale: "en" });
    await chooseWelcomeOccasion({ choice: "BIRTHDAY", locale: "en" });
    expect(mocks.actor).toHaveBeenCalledTimes(2);
    expect(mocks.profile).toHaveBeenCalledWith("real-actor", { name: "Family", locale: "en" });
    expect(mocks.finish).toHaveBeenCalledWith("real-actor", { choice: "BIRTHDAY", locale: "en" });
  });
  it("rejects unknown fields without reaching persistence", async () => {
    expect(await saveWelcomeProfile({ name: "Family", locale: "en", userId: "victim" })).toEqual({ ok: false, code: "invalid" });
    expect(await chooseWelcomeOccasion({ choice: "BIRTHDAY", locale: "en", role: "ADMIN" })).toEqual({ ok: false, code: "invalid" });
    expect(mocks.profile).not.toHaveBeenCalled(); expect(mocks.finish).not.toHaveBeenCalled();
  });
  it("does not persist when authentication or rate limiting fails", async () => {
    mocks.actor.mockRejectedValue(new Error("Please sign in to continue"));
    expect(await chooseWelcomeOccasion({ choice: "SKIP", locale: "en" })).toEqual({ ok: false, code: "expired" });
    mocks.actor.mockRejectedValue(new Error("Please wait a minute and try again"));
    expect(await saveWelcomeProfile({ name: "", locale: "en" })).toEqual({ ok: false, code: "limited" });
    expect(mocks.profile).not.toHaveBeenCalled(); expect(mocks.finish).not.toHaveBeenCalled();
  });
  it("never returns private server errors or claims completion after failure", async () => {
    mocks.finish.mockRejectedValue(new Error("database-private-connection-detail"));
    expect(await chooseWelcomeOccasion({ choice: "EXPLORE", locale: "fr" })).toEqual({ ok: false, code: "error" });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
