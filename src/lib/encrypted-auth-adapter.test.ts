import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import type { AdapterAccount } from "next-auth/adapters";
const mocks = vi.hoisted(() => ({ linkAccount: vi.fn(), getAccount: vi.fn() }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => mocks }));
vi.mock("./db", () => ({ db: {} }));
import { encryptedAuthAdapter } from "./encrypted-auth-adapter";
const account: AdapterAccount = {
  userId: "fixture-user",
  provider: "google",
  providerAccountId: "fixture-provider-id",
  type: "oauth",
  access_token: "fixture-access",
  refresh_token: "fixture-refresh",
  id_token: "fixture-id",
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("DATA_ENCRYPTION_KEY", Buffer.alloc(32, 4).toString("base64"));
  mocks.linkAccount.mockImplementation(async (input) => input);
});
afterEach(() => vi.unstubAllEnvs());
describe("encrypted provider token adapter", () => {
  it("stores ciphertext while returning expected plaintext tokens only to Auth.js", async () => {
    const adapter = encryptedAuthAdapter(),
      result = await adapter.linkAccount!(account),
      stored = mocks.linkAccount.mock.calls[0][0];
    expect(stored.access_token).toMatch(/^enc1\./);
    expect(JSON.stringify(stored)).not.toContain("fixture-access");
    expect(result?.access_token).toBe(account.access_token);
    mocks.getAccount.mockResolvedValue(stored);
    expect(
      await adapter.getAccount!(account.providerAccountId, account.provider),
    ).toEqual(account);
  });
  it("rejects historical plaintext reads until operator migration is complete", async () => {
    mocks.getAccount.mockResolvedValue(account);
    await expect(
      encryptedAuthAdapter().getAccount!(
        account.providerAccountId,
        account.provider,
      ),
    ).rejects.toThrow("TOKEN_MIGRATION_REQUIRED");
  });
  it("blocks token writes without an encryption key and rejects copied ciphertext on another account", async () => {
    const adapter = encryptedAuthAdapter();
    await adapter.linkAccount!(account);
    const stored = mocks.linkAccount.mock.calls[0][0];
    mocks.getAccount.mockResolvedValue({ ...stored, userId: "other-user" });
    await expect(
      adapter.getAccount!(account.providerAccountId, account.provider),
    ).rejects.toThrow("ENCRYPTED_FIELD_INVALID");
    vi.stubEnv("DATA_ENCRYPTION_KEY", "");
    await expect(adapter.linkAccount!(account)).rejects.toThrow(
      "ENCRYPTION_UNAVAILABLE",
    );
    expect(mocks.linkAccount).toHaveBeenCalledTimes(1);
  });
});
