import { describe, it, expect, vi } from "vitest";

vi.mock("./db", () => ({ db: {} }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("next-auth", () => ({ default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), unstable_update: vi.fn() }) }));
vi.mock("next-auth/providers/google", () => ({ default: () => ({}) }));
vi.mock("next-auth/providers/resend", () => ({ default: () => ({}) }));
const { refreshClaims } = await import("./auth");

const ok = { role: "USER" as const, tokenVersion: 2, bannedAt: null, deletedAt: null };

describe("refreshClaims (M1)", () => {
  it("picks up a promotion or demotion from the DB", () => {
    expect(refreshClaims({ tokenVersion: 2 }, { ...ok, role: "BUSINESS_OWNER" })).toEqual({ role: "BUSINESS_OWNER", tokenVersion: 2 });
    expect(refreshClaims({ tokenVersion: 2 }, { ...ok, role: "USER" })?.role).toBe("USER");
  });
  it("ends the session for banned, deleted, missing, or revoked users", () => {
    expect(refreshClaims({ tokenVersion: 2 }, { ...ok, bannedAt: new Date() })).toBeNull();
    expect(refreshClaims({ tokenVersion: 2 }, { ...ok, deletedAt: new Date() })).toBeNull();
    expect(refreshClaims({ tokenVersion: 2 }, null)).toBeNull();
    expect(refreshClaims({ tokenVersion: 1 }, ok)).toBeNull(); // signed out everywhere
  });
  it("adopts the version for tokens issued before tokenVersion existed", () => {
    expect(refreshClaims({}, ok)).toEqual({ role: "USER", tokenVersion: 2 });
  });
});
