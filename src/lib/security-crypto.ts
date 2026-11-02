import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
function encryptionKeys() {
  const values = [
    process.env.DATA_ENCRYPTION_KEY,
    ...(process.env.DATA_ENCRYPTION_PREVIOUS_KEYS || "").split(","),
  ].filter(Boolean) as string[];
  const keys = values.map((value) => {
    if (!/^[A-Za-z0-9+/]{43}=$/.test(value))
      throw new Error("ENCRYPTION_UNAVAILABLE");
    const key = Buffer.from(value, "base64");
    if (key.length !== 32) throw new Error("ENCRYPTION_UNAVAILABLE");
    return key;
  });
  if (!keys.length) throw new Error("ENCRYPTION_UNAVAILABLE");
  return keys;
}
export function encryptField(value: string, context: string) {
  const key = encryptionKeys()[0],
    iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "enc1",
    createHash("sha256").update(key).digest("hex").slice(0, 12),
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    data.toString("base64url"),
  ].join(".");
}
export function decryptField(value: string, context: string) {
  const [version, keyId, iv, tag, data, ...extra] = value.split(".");
  if (version !== "enc1" || !keyId || !iv || !tag || !data || extra.length)
    throw new Error("ENCRYPTED_FIELD_INVALID");
  const key = encryptionKeys().find(
    (k) => createHash("sha256").update(k).digest("hex").slice(0, 12) === keyId,
  );
  if (!key) throw new Error("ENCRYPTION_UNAVAILABLE");
  try {
    const cipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "base64url"),
    );
    cipher.setAAD(Buffer.from(context));
    cipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      cipher.update(Buffer.from(data, "base64url")),
      cipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("ENCRYPTED_FIELD_INVALID");
  }
}
export async function hashRegistryPassword(value: string) {
  if (value.length < 10 || value.length > 128)
    throw new Error("PASSWORD_LENGTH");
  const salt = randomBytes(16).toString("hex");
  const key = (await derive(value, salt, 32)) as Buffer;
  return `scrypt1:${salt}:${key.toString("hex")}`;
}
export async function checkRegistryPassword(value: string, stored: string) {
  if (value.length > 128 || !/^scrypt1:[a-f0-9]{32}:[a-f0-9]{64}$/.test(stored))
    return false;
  const [, salt, hash] = stored.split(":");
  const key = (await derive(value, salt, 32)) as Buffer;
  return timingSafeEqual(key, Buffer.from(hash, "hex"));
}
export function digestCapability(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
