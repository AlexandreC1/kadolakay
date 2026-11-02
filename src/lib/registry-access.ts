import { createHash, createHmac, timingSafeEqual } from "node:crypto";
function key() {
  const key = process.env.AUTH_SECRET;
  if (!key || key.length < 32) throw new Error("ACCESS_UNAVAILABLE");
  return key;
}
export function registryAccessCookie(slug: string) {
  return `bayou-list-${createHash("sha256").update(slug).digest("hex").slice(0, 16)}`;
}
const passwordVersion = (hash: string) =>
  createHash("sha256").update(hash).digest("hex");
export function createRegistryGrant(
  id: string,
  passwordHash: string,
  now = Date.now(),
) {
  const payload = Buffer.from(
    JSON.stringify({
      id,
      version: passwordVersion(passwordHash),
      exp: now + 1800000,
    }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", key()).update(payload).digest("base64url")}`;
}
export function registryGrantValid(
  value: unknown,
  id: string,
  passwordHash: string,
  now = Date.now(),
) {
  if (typeof value !== "string" || value.length > 1000) return false;
  try {
    const [payload, signature, ...extra] = value.split(".");
    if (!payload || !signature || extra.length) return false;
    const expected = createHmac("sha256", key()).update(payload).digest();
    const given = Buffer.from(signature, "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected))
      return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return (
      data.id === id &&
      data.version === passwordVersion(passwordHash) &&
      Number.isSafeInteger(data.exp) &&
      data.exp > now &&
      data.exp <= now + 1800000
    );
  } catch {
    return false;
  }
}
