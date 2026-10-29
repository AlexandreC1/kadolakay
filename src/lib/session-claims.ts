import type { Role } from "@prisma/client";
import type { JWT } from "next-auth/jwt";

export type SessionAccount = { id: string; role: Role; name: string | null; sessionVersion: number };

/** Database state is authoritative; client update payloads are never claims. */
export function resolveSessionClaims(token: JWT, account: SessionAccount | null, signingIn = false): JWT | null {
  if (!account || !Number.isSafeInteger(account.sessionVersion) || account.sessionVersion < 0) return null;
  if (!signingIn && (token.sub !== account.id || !Number.isSafeInteger(token.sessionVersion) || token.sessionVersion !== account.sessionVersion)) return null;
  return { ...token, id: account.id, sub: account.id, role: account.role, name: account.name, sessionVersion: account.sessionVersion };
}
