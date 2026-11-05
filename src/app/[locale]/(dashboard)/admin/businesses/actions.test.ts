import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), user: vi.fn(), business: vi.fn(), updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: m.user }, business: { update: m.business } } }));
vi.mock("next/cache", () => ({ updateTag: m.updateTag, revalidatePath: m.revalidatePath }));
import { updateBusinessStatus } from "./actions";
beforeEach(() => { vi.clearAllMocks(); m.auth.mockResolvedValue({ user: { id: "admin1" } }); m.user.mockResolvedValue({ role: "ADMIN" }); });
describe("business moderation", () => {
  it("invalidates cached browse results after a status change", async () => {
    await updateBusinessStatus("business1", "SUSPENDED");
    expect(m.business).toHaveBeenCalledWith({ where: { id: "business1" }, data: { status: "SUSPENDED" } });
    expect(m.updateTag).toHaveBeenCalledWith("browse");
  });
  it("rejects unauthorized users without changing or invalidating data", async () => {
    m.user.mockResolvedValue({ role: "USER" });
    await expect(updateBusinessStatus("business1", "APPROVED")).rejects.toThrow("Forbidden");
    expect(m.business).not.toHaveBeenCalled(); expect(m.updateTag).not.toHaveBeenCalled();
  });
  it("rejects unsupported statuses from untrusted clients", async () => {
    await expect(updateBusinessStatus("business1", "PENDING" as "APPROVED")).rejects.toThrow("Invalid business status");
    expect(m.business).not.toHaveBeenCalled();
  });
});
