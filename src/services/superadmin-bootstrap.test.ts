import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "@prisma/client";
const mocks = vi.hoisted(() => ({ find: vi.fn(), other: vi.fn(), update: vi.fn(), audit: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: async (fn: (tx: unknown) => unknown) => fn({ $queryRaw: mocks.query, user: { findUnique: mocks.find, findFirst: mocks.other, update: mocks.update }, userRoleAuditEvent: { create: mocks.audit } }) } }));
import { bootstrapSuperadmin } from "../../scripts/lib/bootstrap-superadmin";
describe("operator owner bootstrap", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.find.mockResolvedValue({ role: "USER", accounts: [{ provider: "google" }] }); mocks.other.mockResolvedValue(null); });
  it.each(["USER", "BUSINESS_OWNER", "ADMIN"] as Role[])("grants the exact account and records its previous role %s", async role => {
    mocks.find.mockResolvedValue({ role, accounts: [{ provider: "google" }] });
    expect(await bootstrapSuperadmin("owner-fixture")).toEqual({ changed: true, role: "SUPERADMIN" });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "owner-fixture" }, data: { role: "SUPERADMIN" } });
    expect(mocks.audit).toHaveBeenCalledWith({ data: { actorId: "owner-fixture", targetId: "owner-fixture", previousRole: role, nextRole: "SUPERADMIN", source: "OPERATOR_BOOTSTRAP" } });
  });
  it("does not duplicate a completed grant", async () => {
    mocks.find.mockResolvedValue({ role: "SUPERADMIN", accounts: [{ provider: "google" }] });
    expect(await bootstrapSuperadmin("owner-fixture")).toEqual({ changed: false, role: "SUPERADMIN" });
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("refuses another owner and accounts without a linked identity", async () => {
    mocks.other.mockResolvedValue({ id: "another-owner" });
    await expect(bootstrapSuperadmin("owner-fixture")).rejects.toThrow("OWNER_ALREADY_BOOTSTRAPPED");
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.other.mockResolvedValue(null); mocks.find.mockResolvedValue({ role: "USER", accounts: [] });
    await expect(bootstrapSuperadmin("owner-fixture")).rejects.toThrow("LINKED_PROVIDER_REQUIRED");
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("does not report success if the audit insert fails", async () => {
    mocks.audit.mockRejectedValue(new Error("write failure"));
    await expect(bootstrapSuperadmin("owner-fixture")).rejects.toThrow("write failure");
  });
});
