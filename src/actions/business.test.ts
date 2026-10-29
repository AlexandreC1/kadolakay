import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  refreshSession: vi.fn(),
  tx: { business: { create: vi.fn() }, user: { updateMany: vi.fn() } },
  findUnique: vi.fn(),
  order: [] as string[],
}));
vi.mock("@/lib/auth", () => ({ auth: m.auth, refreshSession: m.refreshSession }));
vi.mock("@/lib/db", () => ({
  db: {
    business: { findUnique: m.findUnique },
    $transaction: async (fn: (tx: typeof m.tx) => unknown) => {
      const r = await fn(m.tx);
      m.order.push("commit");
      return r;
    },
  },
}));
vi.mock("@/lib/slug", () => ({ generateUniqueSlug: async () => "biz-abc" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => m.order.push("redirect")) }));

import { registerBusiness } from "./business";

const form = () => {
  const f = new FormData();
  f.set("name", "Boutik Ana");
  f.set("category", "food");
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  m.order = [];
  m.auth.mockResolvedValue({ user: { id: "u1" } });
  m.findUnique.mockResolvedValue(null);
  m.refreshSession.mockImplementation(async () => m.order.push("refresh"));
});

describe("registerBusiness", () => {
  it("refreshes the session after the role change commits, before redirect", async () => {
    await registerBusiness(form());
    expect(m.tx.user.updateMany).toHaveBeenCalledWith({ where: { id: "u1", role: "USER" }, data: { role: "BUSINESS_OWNER" } });
    expect(m.order).toEqual(["commit", "refresh", "redirect"]);
  });
  it("does not refresh on a duplicate business (P2002)", async () => {
    m.tx.business.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }));
    await expect(registerBusiness(form())).rejects.toThrow("already have a registered business");
    expect(m.refreshSession).not.toHaveBeenCalled();
  });
});
