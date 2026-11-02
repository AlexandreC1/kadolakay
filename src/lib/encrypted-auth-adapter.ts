import type { Adapter, AdapterAccount } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import { encryptField, decryptField } from "./security-crypto";
type TokenField = "access_token" | "refresh_token" | "id_token";
export function encryptedAuthAdapter(): Adapter {
  const adapter = PrismaAdapter(db) as Adapter;
  function transform(account: AdapterAccount, decrypt = false): AdapterAccount {
    function token(field: TokenField) {
      const value = account[field];
      if (!value) return value;
      const context = `oauth:${account.userId}:${account.provider}:${account.providerAccountId}:${field}`;
      if (!decrypt) return encryptField(value, context);
      if (!value.startsWith("enc1."))
        throw new Error("TOKEN_MIGRATION_REQUIRED");
      return decryptField(value, context);
    }
    return {
      ...account,
      access_token: token("access_token"),
      refresh_token: token("refresh_token"),
      id_token: token("id_token"),
    };
  }
  return {
    ...adapter,
    async linkAccount(account) {
      const stored = await adapter.linkAccount!(transform(account));
      return stored
        ? {
            ...stored,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            id_token: account.id_token,
          }
        : undefined;
    },
    async getAccount(providerAccountId, provider) {
      const account = await adapter.getAccount!(providerAccountId, provider);
      return account ? transform(account, true) : null;
    },
  };
}
