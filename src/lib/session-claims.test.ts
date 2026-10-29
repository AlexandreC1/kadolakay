import { describe, expect, it } from "vitest";
import { resolveSessionClaims, type SessionAccount } from "./session-claims";

const account: SessionAccount = { id: "member", name: "Test member", role: "USER", sessionVersion: 3 };
describe("server-authoritative session claims", () => {
  it("issues a fresh sign-in at the current database version", () => {
    expect(resolveSessionClaims({ role: "SUPERADMIN", sessionVersion: 99 }, account, true)).toMatchObject({ sub: "member", id: "member", role: "USER", sessionVersion: 3 });
  });
  it("rejects every cookie issued before revocation", () => {
    expect(resolveSessionClaims({ sub: "member", sessionVersion: 2 }, account)).toBeNull();
    expect(resolveSessionClaims({ sub: "member", sessionVersion: 3 }, account)).toMatchObject({ role: "USER" });
  });
  it("rejects legacy cookies without a revocation version", () => {
    expect(resolveSessionClaims({ sub: "member", role: "SUPERADMIN" }, account)).toBeNull();
  });
  it("rejects deleted accounts and mismatched identities", () => {
    expect(resolveSessionClaims({ sub: "member", sessionVersion: 3 }, null)).toBeNull();
    expect(resolveSessionClaims({ sub: "someone-else", sessionVersion: 3 }, account)).toBeNull();
  });
  it("refreshes roles and names without trusting stale claims", () => {
    expect(resolveSessionClaims({ sub: "member", role: "SUPERADMIN", name: "Old name", sessionVersion: 3 }, account)).toMatchObject({ role: "USER", name: "Test member" });
  });
  it.each([undefined, -1, 1.5, Infinity, "3"])("rejects an invalid token version: %s", (version) => {
    expect(resolveSessionClaims({ sub: "member", sessionVersion: version as number }, account)).toBeNull();
  });
  it("rejects invalid database state even at sign-in", () => {
    expect(resolveSessionClaims({}, { ...account, sessionVersion: -1 }, true)).toBeNull();
  });
});
