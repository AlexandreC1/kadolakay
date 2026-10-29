import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findUnique: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.findUnique } } }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.limit }));
import { requireActor } from "./authorization";
describe("server-side actor authorization", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "owner", role: "ADMIN" } }); mocks.findUnique.mockResolvedValue({ id: "owner", role: "USER" }); mocks.limit.mockResolvedValue({ ok: true }); });
  it("rejects an absent session before querying private data", async () => {
    mocks.auth.mockResolvedValue(null); await expect(requireActor("registry:update")).rejects.toThrow("sign in"); expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it("reads current database role instead of trusting an old elevated session", async () => {
    expect(await requireActor("registry:update")).toEqual({ id: "owner", role: "USER" });
  });
  it("denies privileged actions even when an old session claims administrator", async () => {
    await expect(requireActor("admin:business")).rejects.toThrow("Forbidden");
    expect(mocks.limit).not.toHaveBeenCalled();
  });
  it("rejects deleted accounts even with a valid session", async () => {
    mocks.findUnique.mockResolvedValue(null); await expect(requireActor("registry:update")).rejects.toThrow("sign in again");
  });
  it("blocks mutations when the limiter refuses access", async () => {
    mocks.limit.mockResolvedValue({ ok: false }); await expect(requireActor("registry:update")).rejects.toThrow("wait a minute");
  });
});
