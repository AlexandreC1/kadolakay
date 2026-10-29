import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), exec: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: async () => ({ ok: true }) }));
vi.mock("@/lib/db", () => ({ db: { registryItem: { findUnique: m.find }, $executeRaw: m.exec } }));
const { confirmExternalPurchase } = await import("./checkout");

beforeEach(() => vi.clearAllMocks());

describe("confirmExternalPurchase (C1)", () => {
  it("rejects anonymous callers", async () => {
    m.auth.mockResolvedValue(null);
    await expect(confirmExternalPurchase("item1")).rejects.toThrow("Unauthorized");
    expect(m.exec).not.toHaveBeenCalled();
  });
  it("rejects a signed-in user who doesn't own the registry", async () => {
    m.auth.mockResolvedValue({ user: { id: "attacker" } });
    m.find.mockResolvedValue({ id: "item1", source: "EXTERNAL", registry: { userId: "owner", slug: "s" } });
    await expect(confirmExternalPurchase("item1")).rejects.toThrow("Not found");
    expect(m.exec).not.toHaveBeenCalled();
  });
  it("rejects non-external items and malformed ids", async () => {
    m.auth.mockResolvedValue({ user: { id: "owner" } });
    m.find.mockResolvedValue({ id: "item1", source: "CUSTOM", registry: { userId: "owner", slug: "s" } });
    await expect(confirmExternalPurchase("item1")).rejects.toThrow();
    await expect(confirmExternalPurchase("../x")).rejects.toThrow("Not found");
  });
  it("lets the owner confirm with an atomic clamped update", async () => {
    m.auth.mockResolvedValue({ user: { id: "owner" } });
    m.find.mockResolvedValue({ id: "item1", source: "AMAZON", registry: { userId: "owner", slug: "s" } });
    await confirmExternalPurchase("item1");
    expect(m.exec).toHaveBeenCalledTimes(1);
    expect(String(m.exec.mock.calls[0][0].strings.join("?"))).toContain("LEAST(quantity");
  });
});
