import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ actor: vi.fn(), revoke: vi.fn(), signOut: vi.fn() }));
vi.mock("@/services/authorization", () => ({ requireActor: m.actor }));
vi.mock("@/services/sessions", () => ({ revokeOwnSessions: m.revoke }));
vi.mock("@/lib/auth", () => ({ signOut: m.signOut }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr" }));
import { signOutEverywhere } from "./user";

beforeEach(() => { vi.resetAllMocks(); m.actor.mockResolvedValue({ id: "session-owner" }); });
describe("sign out everywhere action", () => {
  it("uses only the authenticated identity and redirects after revocation", async () => {
    await signOutEverywhere(new FormData());
    expect(m.actor).toHaveBeenCalledWith("session:revoke");
    expect(m.revoke).toHaveBeenCalledWith("session-owner");
    expect(m.revoke.mock.invocationCallOrder[0]).toBeLessThan(m.signOut.mock.invocationCallOrder[0]);
    expect(m.signOut).toHaveBeenCalledWith({ redirectTo: "/fr/login" });
  });
  it("rejects client-selected users, roles and duplicate fields", async () => {
    for (const key of ["userId", "role", "sessionVersion"]) {
      const form = new FormData(); form.append(key, "other"); form.append(key, "other");
      await expect(signOutEverywhere(form)).rejects.toThrow("Invalid form fields");
    }
    expect(m.revoke).not.toHaveBeenCalled();
  });
  it("does not revoke or sign out when authentication fails", async () => {
    m.actor.mockRejectedValue(new Error("Please sign in"));
    await expect(signOutEverywhere(new FormData())).rejects.toThrow("sign in");
    expect(m.revoke).not.toHaveBeenCalled(); expect(m.signOut).not.toHaveBeenCalled();
  });
  it("does not report success or sign out before a failed transaction", async () => {
    m.revoke.mockRejectedValue(new Error("database unavailable"));
    await expect(signOutEverywhere(new FormData())).rejects.toThrow("database unavailable");
    expect(m.signOut).not.toHaveBeenCalled();
  });
});
