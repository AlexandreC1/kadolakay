import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    user: { findUnique: vi.fn() },
    registry: { findMany: vi.fn() },
    order: { findMany: vi.fn() },
    business: { findUnique: vi.fn() },
    auditLog: { count: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/db", () => ({ db: m.db }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  m.auth.mockResolvedValue({ user: { id: "u1" } });
  m.db.auditLog.count.mockResolvedValue(0);
  m.db.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.c" });
  m.db.registry.findMany.mockResolvedValue([{ id: "r1", items: [] }]);
  m.db.order.findMany
    .mockResolvedValueOnce([{ orderNumber: "KL-P" }])
    .mockResolvedValueOnce([
      { orderNumber: "KL-R1", buyerName: "Jan", isAnonymous: false },
      { orderNumber: "KL-R2", buyerName: "Secret", isAnonymous: true },
    ]);
  m.db.business.findUnique.mockResolvedValue(null);
});

describe("GET /settings/export", () => {
  it("401 when signed out", async () => {
    m.auth.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
  });
  it("returns all user data as an attachment and audits it", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="kadolakay-export-/);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body.profile.id).toBe("u1");
    expect(body.registries).toHaveLength(1);
    expect(body.ordersPlaced[0].orderNumber).toBe("KL-P");
    expect(body.ordersReceived.map((o: { buyerName: string | null }) => o.buyerName)).toEqual(["Jan", null]);
    expect(m.db.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "user.data_export", actorId: "u1" });
    // received orders never select other people's contact details
    const receivedSelect = m.db.order.findMany.mock.calls[1][0].select;
    expect(receivedSelect.buyerEmail).toBeUndefined();
    expect(receivedSelect.buyerPhone).toBeUndefined();
  });
  it("429 when an export was made in the last 24h", async () => {
    m.db.auditLog.count.mockResolvedValueOnce(1);
    expect((await GET()).status).toBe(429);
    expect(m.db.user.findUnique).not.toHaveBeenCalled();
  });
});
