import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function encodeBase32(data: Buffer) {
  let bits = 0,
    value = 0,
    out = "";
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
function decodeBase32(secret: string) {
  if (!/^[A-Z2-7]{16,128}$/.test(secret)) throw new Error("INVALID_MFA_SECRET");
  let bits = 0,
    value = 0;
  const out: number[] = [];
  for (const char of secret) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
export function newTotpSecret() {
  return encodeBase32(randomBytes(20));
}
export function totpAt(secret: string, seconds: number, digits = 6) {
  if (!Number.isSafeInteger(seconds) || seconds < 0 || ![6, 8].includes(digits))
    throw new Error("INVALID_MFA_TIME");
  const count = Buffer.alloc(8);
  count.writeBigUInt64BE(BigInt(Math.floor(seconds / 30)));
  const mac = createHmac("sha1", decodeBase32(secret)).update(count).digest();
  const offset = mac[mac.length - 1] & 15;
  return String(
    (mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits,
  ).padStart(digits, "0");
}
export function verifiedTotpCounter(
  secret: string,
  code: string,
  now = new Date(),
) {
  if (!/^\d{6}$/.test(code) || !Number.isFinite(now.getTime())) return null;
  const counter = Math.floor(now.getTime() / 30000);
  let matched: bigint | null = null;
  for (let delta = -1; delta <= 1; delta++) {
    const candidate = counter + delta;
    if (
      candidate >= 0 &&
      timingSafeEqual(
        Buffer.from(totpAt(secret, candidate * 30)),
        Buffer.from(code),
      )
    )
      matched = BigInt(candidate);
  }
  return matched;
}
