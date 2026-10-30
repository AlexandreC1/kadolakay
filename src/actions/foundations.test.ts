import { beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  actor: vi.fn(),
  setup: vi.fn(),
  palette: vi.fn(),
  grant: vi.fn(),
  revoke: vi.fn(),
  setCookie: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@/services/authorization", () => ({ requireActor: m.actor }));
vi.mock("@/services/product-foundations", () => ({
  requestMerchantPaymentSetup: m.setup,
  personalizeRegistry: m.palette,
  grantPremium: m.grant,
  revokePremium: m.revoke,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: m.setCookie }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: m.limit }));
import {
  saveMerchantPreference,
  saveRegistryPalette,
  savePremiumGrant,
  saveSeasonPreference,
  removePremiumGrant,
} from "./foundations";
const previous = { status: "idle" as const };
const form = (data: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.append(k, v);
  return f;
};
beforeEach(() => {
  vi.resetAllMocks();
  m.actor.mockResolvedValue({ id: "session-user", role: "SUPERADMIN" });
  m.limit.mockResolvedValue({ ok: true });
});
describe("foundation actions", () => {
  it("authorizes revocation explicitly and rejects privilege injection", async () => {
    expect((await removePremiumGrant(previous,form({targetId:"target"}))).status).toBe("saved");
    expect(m.actor).toHaveBeenCalledWith("premium:grant");expect(m.revoke).toHaveBeenCalledWith("session-user","target");
    expect((await removePremiumGrant(previous,form({targetId:"target",role:"SUPERADMIN"}))).status).toBe("invalid");
    expect(m.revoke).toHaveBeenCalledTimes(1);
  });
  it("binds merchant and registry mutations to server identity", async () => {
    expect(
      await saveMerchantPreference(previous, form({ provider: "moncash" })),
    ).toEqual({ status: "saved" });
    expect(m.setup).toHaveBeenCalledWith("session-user", "moncash");
    await saveRegistryPalette(
      previous,
      form({ registryId: "registry", palette: "rose" }),
    );
    expect(m.palette).toHaveBeenCalledWith("session-user", "registry", "rose");
  });
  it("rejects extra fields, duplicate fields and account verification injection", async () => {
    expect(
      (
        await saveMerchantPreference(
          previous,
          form({ provider: "moncash", verified: "true" }),
        )
      ).status,
    ).toBe("invalid");
    const duplicate = form({ provider: "moncash" });
    duplicate.append("provider", "natcash");
    expect((await saveMerchantPreference(previous, duplicate)).status).toBe(
      "invalid",
    );
    expect(
      (
        await saveRegistryPalette(
          previous,
          form({ registryId: "r", palette: "rose", userId: "other" }),
        )
      ).status,
    ).toBe("invalid");
    expect(m.setup).not.toHaveBeenCalled();
    expect(m.palette).not.toHaveBeenCalled();
  });
  it("does not mutate on absent authentication", async () => {
    m.actor.mockRejectedValue(new Error("Not signed in"));
    expect(
      (
        await savePremiumGrant(
          previous,
          form({ targetId: "target", days: "30" }),
        )
      ).status,
    ).toBe("unavailable");
    expect(m.grant).not.toHaveBeenCalled();
  });
  it("reports expired entitlement without exposing database errors", async () => {
    m.palette.mockRejectedValue(new Error("PREMIUM_REQUIRED"));
    expect(
      (
        await saveRegistryPalette(
          previous,
          form({ registryId: "r", palette: "rose" }),
        )
      ).status,
    ).toBe("premium");
    m.setup.mockRejectedValue(new Error("database password secret"));
    expect(
      await saveMerchantPreference(previous, form({ provider: "card" })),
    ).toEqual({ status: "unavailable" });
  });
  it("bounds grant duration and explicitly requires the superadmin permission", async () => {
    for (const days of ["0", "366", "1e2", "-1"])
      expect(
        (await savePremiumGrant(previous, form({ targetId: "u", days })))
          .status,
      ).toBe("invalid");
    expect(m.grant).not.toHaveBeenCalled();
    await savePremiumGrant(previous, form({ targetId: "u", days: "30" }));
    expect(m.actor).toHaveBeenCalledWith("premium:grant");
    expect(m.grant.mock.calls[0][0]).toBe("session-user");
  });
  it("persists a bounded visitor preference without granting any entitlement", async () => {
    expect(
      (await saveSeasonPreference(previous, form({ preference: "off" })))
        .status,
    ).toBe("saved");
    expect(m.setCookie).toHaveBeenCalledWith(
      "bayou-season",
      "off",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        maxAge: 31536000,
      }),
    );
    m.limit.mockResolvedValue({ ok: false });
    expect(
      (await saveSeasonPreference(previous, form({ preference: "auto" })))
        .status,
    ).toBe("unavailable");
    expect(m.setCookie).toHaveBeenCalledTimes(1);
  });
});
