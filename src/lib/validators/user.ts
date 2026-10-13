import { z } from "zod";

// Empty form fields arrive as "" — store them as null, not as empty strings.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null);

export const updateProfileSchema = z.object({
  name: optionalText(100),
  // Digits, spaces, dashes, parentheses and a leading +: covers +509 local
  // numbers and diaspora numbers without guessing at one country's format.
  phone: optionalText(30).refine(
    (v) => v === null || /^\+?[0-9\s()-]{6,30}$/.test(v),
    { message: "Invalid phone number" }
  ),
  preferredLocale: z.enum(["ht", "fr", "en"]).default("ht"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Account deletion: the user must type their own email address. */
export const deleteAccountSchema = z.object({
  confirmEmail: z.string().trim().toLowerCase().max(254),
});

export function deletionConfirmed(typed: string, actualEmail: string): boolean {
  return typed.trim().toLowerCase() === actualEmail.trim().toLowerCase() && typed.trim().length > 0;
}

/** Public contact form. `website` is a honeypot and must stay empty. */
export const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(500).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Deterministic anonymised email for deleted users (keeps the unique index). */
export function deletedEmail(userId: string): string {
  return `deleted+${userId}@invalid`;
}

export const DELETED_USER_NAME = "Deleted user";
