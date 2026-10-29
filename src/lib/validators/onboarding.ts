import { z } from "zod";
import { occasionTypes } from "@/lib/occasions";
export const onboardingProfileSchema = z.strictObject({
  name: z.string().trim().max(100),
  locale: z.enum(["ht", "fr", "en"]),
});
export const onboardingChoiceSchema = z.strictObject({
  choice: z.enum([...occasionTypes, "EXPLORE", "SKIP"]),
  locale: z.enum(["ht", "fr", "en"]),
});
export type OnboardingChoice = z.infer<typeof onboardingChoiceSchema>;
export function onboardingDestination({ choice, locale }: OnboardingChoice) {
  return choice === "EXPLORE" ? `/${locale}/browse` : choice === "SKIP" ? `/${locale}/my-registries` : `/${locale}/create?type=${choice}`;
}
