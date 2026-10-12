import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const userFind = vi.fn();
const registryFind = vi.fn();
const itemFind = vi.fn();
const businessFind = vi.fn();
const productFind = vi.fn();

vi.mock("./auth", () => ({ auth: () => authMock() }));
vi.mock("./db", () => ({
  db: {
    user: { findUnique: (a: unknown) => userFind(a) },
    registry: { findUnique: (a: unknown) => registryFind(a) },
    registryItem: { findUnique: (a: unknown) => itemFind(a) },
    business: { findUnique: (a: unknown) => businessFind(a) },
    product: { findUnique: (a: unknown) => productFind(a) },
  },
}));

const { requireUser, requireRole, requireOwner } = await import("./authz");

const active = (id: string, role = "USER") => ({ id, role, bannedAt: null, deletedAt: null });

beforeEach(() => vi.clearAllMocks());

describe("requireUser", () => {
  it("throws UNAUTHENTICATED without a session", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireUser()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
  it("returns id + role", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });
    await expect(requireUser()).resolves.toEqual({ id: "u1", role: "USER" });
  });
});

describe("requireRole", () => {
  it("uses the DB role, not the JWT role", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } }); // stale JWT
    userFind.mockResolvedValue(active("u1", "USER"));
    await expect(requireRole("ADMIN")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("lets ADMIN through any role gate and rejects banned users", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });
    userFind.mockResolvedValue(active("u1", "ADMIN"));
    await expect(requireRole("BUSINESS_OWNER")).resolves.toEqual({ id: "u1", role: "ADMIN" });
    userFind.mockResolvedValue({ ...active("u1", "ADMIN"), bannedAt: new Date() });
    await expect(requireRole("ADMIN")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});

describe("requireOwner", () => {
  beforeEach(() => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });
    userFind.mockResolvedValue(active("u1"));
  });
  it("allows the owner for every resource kind", async () => {
    registryFind.mockResolvedValue({ userId: "u1" });
    itemFind.mockResolvedValue({ registry: { userId: "u1" } });
    businessFind.mockResolvedValue({ ownerId: "u1" });
    productFind.mockResolvedValue({ business: { ownerId: "u1" } });
    for (const kind of ["registry", "registryItem", "business", "product"] as const) {
      await expect(requireOwner(kind, "abc")).resolves.toMatchObject({ id: "u1" });
    }
  });
  it("returns NOT_FOUND (no existence oracle) for foreign or missing rows", async () => {
    registryFind.mockResolvedValueOnce({ userId: "someone-else" });
    await expect(requireOwner("registry", "abc")).rejects.toMatchObject({ code: "NOT_FOUND" });
    registryFind.mockResolvedValueOnce(null);
    await expect(requireOwner("registry", "abc")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rejects malformed ids before touching the DB", async () => {
    await expect(requireOwner("registry", "../x")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(registryFind).not.toHaveBeenCalled();
  });
  it("lets an admin act on others' resources", async () => {
    userFind.mockResolvedValue(active("u1", "ADMIN"));
    registryFind.mockResolvedValue({ userId: "someone-else" });
    await expect(requireOwner("registry", "abc")).resolves.toMatchObject({ role: "ADMIN" });
  });
});
