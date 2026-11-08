import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** 256-bit bearer token for the mobile app. Only its SHA-256 is stored. */
export function newMobileToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashMobileToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Reads `Authorization: Bearer <token>`; anything else is treated as signed out. */
export function bearerToken(headers: Headers): string | null {
  const value = headers.get("authorization");
  const match = value?.match(/^Bearer ([A-Za-z0-9_-]{43})$/);
  return match ? match[1] : null;
}

/** Six digits, uniformly random. */
export function newSignInCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Keyed so a database leak alone cannot test the million possible codes.
 * The key is the server's AUTH_SECRET, which never leaves the server.
 */
export function hashSignInCode(email: string, code: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required");
  return createHmac("sha256", secret).update(`mobile-code:${email}:${code}`).digest("hex");
}

export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
