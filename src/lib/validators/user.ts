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

export const updateProfileSchema = z.strictObject({
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
