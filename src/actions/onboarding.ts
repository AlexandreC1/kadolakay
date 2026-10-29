"use server";
import { requireActor } from "@/services/authorization";
import { saveOnboardingProfile, finishOnboarding } from "@/services/onboarding";
import { onboardingProfileSchema, onboardingChoiceSchema } from "@/lib/validators/onboarding";
import { revalidatePath } from "next/cache";
type Failure = { ok: false; code: "invalid" | "expired" | "limited" | "error" };
function failure(error: unknown): Failure {
  const message = error instanceof Error ? error.message : "";
  return { ok: false, code: message === "INVALID_ONBOARDING" ? "invalid" : ["Please sign in to continue", "Please sign in again", "ONBOARDING_USER_MISSING"].includes(message) ? "expired" : message === "Please wait a minute and try again" ? "limited" : "error" };
}
export async function saveWelcomeProfile(input: unknown): Promise<{ ok: true } | Failure> {
  try {
    const actor = await requireActor("onboarding:profile");
    const parsed = onboardingProfileSchema.safeParse(input);
    if (!parsed.success) return { ok: false, code: "invalid" };
    await saveOnboardingProfile(actor.id, parsed.data);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) { return failure(error); }
}
export async function chooseWelcomeOccasion(input: unknown): Promise<{ ok: true; destination: string } | Failure> {
  try {
    const actor = await requireActor("onboarding:finish");
    const parsed = onboardingChoiceSchema.safeParse(input);
    if (!parsed.success) return { ok: false, code: "invalid" };
    const destination = await finishOnboarding(actor.id, parsed.data);
    revalidatePath("/", "layout");
    return { ok: true, destination };
  } catch (error) { return failure(error); }
}
