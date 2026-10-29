import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomBytes } from "node:crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Crockford base32 (no I, L, O, U): readable over the phone, unambiguous.
const ORDER_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Human-facing order number, e.g. KL-20261012-7K3M9QXD2A.
 * 10 chars of CSPRNG base32 = 50 bits, so collisions are negligible and the
 * number can't be enumerated (review H3). It is still NOT an access token:
 * pages look orders up by Order.publicToken.
 */
export function generateOrderNumber(now: Date = new Date()): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const bytes = randomBytes(10);
  let random = "";
  for (const b of bytes) random += ORDER_ALPHABET[b & 31];
  return `KL-${date}-${random}`;
}
