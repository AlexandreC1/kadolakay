import { afterEach, describe, expect, it, vi } from "vitest";
import {
  encryptField,
  decryptField,
  hashRegistryPassword,
  checkRegistryPassword,
} from "./security-crypto";
import { encodeBase32, totpAt, verifiedTotpCounter } from "./totp";
afterEach(() => vi.unstubAllEnvs());
describe("encrypted fields and protected registry passwords", () => {
  it("authenticates ciphertext and context, supports explicit previous keys and fails closed", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", Buffer.alloc(32, 1).toString("base64"));
    const encrypted = encryptField("private-provider-token", "account:one");
    expect(encrypted).not.toContain("private-provider-token");
    expect(decryptField(encrypted, "account:one")).toBe(
      "private-provider-token",
    );
    expect(() => decryptField(encrypted, "account:two")).toThrow();
    vi.stubEnv(
      "DATA_ENCRYPTION_PREVIOUS_KEYS",
      Buffer.alloc(32, 1).toString("base64"),
    );
    vi.stubEnv("DATA_ENCRYPTION_KEY", Buffer.alloc(32, 2).toString("base64"));
    expect(decryptField(encrypted, "account:one")).toBe(
      "private-provider-token",
    );
    vi.stubEnv("DATA_ENCRYPTION_PREVIOUS_KEYS", "");
    expect(() => decryptField(encrypted, "account:one")).toThrow(
      "ENCRYPTION_UNAVAILABLE",
    );
    vi.stubEnv("DATA_ENCRYPTION_KEY", "");
    expect(() => encryptField("value", "context")).toThrow();
  });
  it("salts passwords, rejects plaintext legacy rows and enforces bounded input", async () => {
    const a = await hashRegistryPassword("a long private passphrase"),
      b = await hashRegistryPassword("a long private passphrase");
    expect(a).not.toBe(b);
    expect(await checkRegistryPassword("a long private passphrase", a)).toBe(
      true,
    );
    expect(await checkRegistryPassword("wrong", a)).toBe(false);
    expect(await checkRegistryPassword("plaintext", "plaintext")).toBe(false);
    await expect(hashRegistryPassword("short")).rejects.toThrow(
      "PASSWORD_LENGTH",
    );
    expect(await checkRegistryPassword("x".repeat(129), a)).toBe(false);
  });
});
describe("RFC6238 SHA1 test vectors", () => {
  const secret = encodeBase32(Buffer.from("12345678901234567890"));
  it.each([
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ])("matches RFC time %s", (time, expected) =>
    expect(totpAt(secret, Number(time), 8)).toBe(expected),
  );
  it("accepts one adjacent time step and rejects malformed/expired codes", () => {
    const now = new Date(1800000000000);
    const code = totpAt(secret, Math.floor(now.getTime() / 1000));
    expect(verifiedTotpCounter(secret, code, now)).not.toBeNull();
    expect(verifiedTotpCounter(secret, "abc123", now)).toBeNull();
    expect(
      verifiedTotpCounter(secret, code, new Date(now.getTime() + 120000)),
    ).toBeNull();
  });
});
