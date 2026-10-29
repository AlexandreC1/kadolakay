import { db } from "@/lib/db";
import { parseEntityId } from "@/lib/validators/entity-id";
import { onboardingProfileSchema, onboardingChoiceSchema, onboardingDestination } from "@/lib/validators/onboarding";

export async function getOwnedOnboarding(userId: string) {
  return db.user.findUnique({ where: { id: parseEntityId(userId) }, select: {
    name: true, preferredLocale: true, onboardingStep: true, onboardingCompletedAt: true, onboardingDeferredAt: true,
  } });
}
export async function saveOnboardingProfile(userId: string, input: unknown) {
  const id = parseEntityId(userId), parsed = onboardingProfileSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_ONBOARDING");
  await db.$transaction(async tx => {
    const result = await tx.user.updateMany({ where: { id }, data: { name: parsed.data.name || null, preferredLocale: parsed.data.locale } });
    if (!result.count) throw new Error("ONBOARDING_USER_MISSING");
    // Profile edits may continue; stale submissions can never decrease saved progress.
    await tx.user.updateMany({ where: { id, onboardingStep: 0 }, data: { onboardingStep: 1 } });
  });
}
export async function finishOnboarding(userId: string, input: unknown) {
  const id = parseEntityId(userId), parsed = onboardingChoiceSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_ONBOARDING");
  // SQL predicate makes completion idempotent and monotonic across tabs. No list is created here.
  const skipped = parsed.data.choice === "SKIP";
  const result = await db.user.updateMany({ where: { id, onboardingCompletedAt: null }, data: {
    onboardingStep: 2, preferredLocale: parsed.data.locale,
    ...(skipped ? { onboardingDeferredAt: new Date() } : { onboardingCompletedAt: new Date(), onboardingDeferredAt: null }),
  } });
  if (!result.count && !await db.user.findUnique({ where: { id }, select: { id: true } })) throw new Error("ONBOARDING_USER_MISSING");
  return onboardingDestination(parsed.data);
}
