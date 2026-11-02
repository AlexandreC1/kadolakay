import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  limit: vi.fn(),
  stepUp: vi.fn(),
}));
vi.mock("./device-sessions", () => ({ requireAdminStepUp: mocks.stepUp }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.findUnique } } }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.limit }));
import { requireActor } from "./authorization";
describe("server-side actor authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "owner", role: "ADMIN" } });
    mocks.findUnique.mockResolvedValue({ id: "owner", role: "USER" });
    mocks.limit.mockResolvedValue({ ok: true });
    mocks.stepUp.mockResolvedValue(undefined);
  });
  it("rejects an absent session before querying private data", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(requireActor("registry:update")).rejects.toThrow("sign in");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it("reads current database role instead of trusting an old elevated session", async () => {
    expect(await requireActor("registry:update")).toEqual({
      id: "owner",
      role: "USER",
    });
  });
  it("denies privileged actions even when an old session claims administrator", async () => {
    await expect(requireActor("admin:business")).rejects.toThrow("Forbidden");
    expect(mocks.limit).not.toHaveBeenCalled();
  });
  it("recognizes a newly granted superadmin role and requires device verification", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "owner", role: "USER" } });
    mocks.findUnique.mockResolvedValue({ id: "owner", role: "SUPERADMIN" });
    expect(await requireActor("admin:business")).toEqual({
      id: "owner",
      role: "SUPERADMIN",
    });
    expect(mocks.stepUp).toHaveBeenCalledWith("owner", undefined);
  });
  it("denies privileged actions when verification expires", async () => {
    mocks.findUnique.mockResolvedValue({ id: "owner", role: "SUPERADMIN" });
    mocks.stepUp.mockRejectedValue(new Error("MFA_REQUIRED"));
    await expect(requireActor("admin:user")).rejects.toThrow("MFA_REQUIRED");
  });
  it("rejects deleted accounts even with a valid session", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(requireActor("registry:update")).rejects.toThrow(
      "sign in again",
    );
  });
  it("blocks mutations when the limiter refuses access", async () => {
    mocks.limit.mockResolvedValue({ ok: false });
    await expect(requireActor("registry:update")).rejects.toThrow(
      "wait a minute",
    );
  });
});
