/**
 * URL safety helpers (review H1). User-supplied links are rendered as
 * href / window.open targets; anything but http(s) (javascript:, data:,
 * vbscript:, file:) can run script in our origin. zod's z.string().url()
 * accepts `javascript:alert(1)`, so it is NOT enough on its own.
 */
import { z } from "zod";

export const MAX_URL_LENGTH = 2048;

export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_URL_LENGTH) return false;
  // Reject control chars / whitespace that browsers strip before parsing the scheme.
  if (/[\u0000-\u0020\u007f]/.test(value)) return false;
  try {
    const u = new URL(value);
    return (u.protocol === "https:" || u.protocol === "http:") && !!u.hostname && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** Returns the URL if safe, otherwise null. Use at render sinks. */
export function safeHref(value: string | null | undefined): string | null {
  return isSafeHttpUrl(value) ? value : null;
}

export const safeHttpUrl = z
  .string()
  .trim()
  .max(MAX_URL_LENGTH)
  .refine(isSafeHttpUrl, { message: "Must be an http(s) URL" });

/** Optional link from a form: "" / undefined → undefined. */
export const optionalSafeHttpUrl = z
  .union([z.literal(""), safeHttpUrl])
  .optional()
  .transform((v) => (v ? v : undefined));

const AMAZON_HOST = /(^|\.)amazon\.(com|ca|fr|co\.uk|de|es|it|com\.mx|com\.br)$/i;
export function isAmazonUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && AMAZON_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Image URLs we render in <img>: must be https and, when a CDN is configured,
 * hosted on it (uploads go through presigned R2 URLs → S3_PUBLIC_URL).
 */
export function isAllowedImageUrl(value: unknown, cdnBase = process.env.S3_PUBLIC_URL): value is string {
  if (!isSafeHttpUrl(value)) return false;
  if (!cdnBase) return value.startsWith("https://");
  const base = cdnBase.endsWith("/") ? cdnBase : `${cdnBase}/`;
  return value.startsWith(base);
}

export const optionalImageUrl = z
  .union([z.literal(""), z.string().trim().max(MAX_URL_LENGTH)])
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || isAllowedImageUrl(v), { message: "Image must be uploaded to KadoLakay" });
