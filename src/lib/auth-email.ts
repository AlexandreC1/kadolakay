import { z } from "zod";

/** Canonicalize before validating so Unicode separators cannot redirect a magic link. */
export function normalizeEmailIdentifier(identifier: string): string {
  const normalized = identifier.normalize("NFKC").trim().toLowerCase();
  const result = z.email().max(254).safeParse(normalized);
  if (!result.success) throw new Error("Invalid email address");
  return result.data;
}
