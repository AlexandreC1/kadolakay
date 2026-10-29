import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOwnedOnboarding } from "@/services/onboarding";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { onboardingCopy } from "@/lib/onboarding-copy";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: onboardingCopy(locale).getStarted, robots: { index: false, follow: false } };
}
export default async function OnboardingPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ step?: string; review?: string }>;
}) {
  const [{ locale }, query, session] = await Promise.all([params, searchParams, auth()]);
  const returnTo = `/${locale}/onboarding?step=${query.step === "2" ? "2" : "1"}${query.review === "1" ? "&review=1" : ""}`;
  if (!session?.user?.id) redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  const state = await getOwnedOnboarding(session.user.id);
  if (!state) redirect(`/${locale}/login`);
  // Default login never replays completed or deferred setup. Explicit review remains available.
  if ((state.onboardingCompletedAt || state.onboardingDeferredAt) && query.review !== "1") redirect(`/${locale}/my-registries`);
  const initialStep = query.step === "1" ? 1 : query.step === "2" || state.onboardingStep > 0 || query.review === "1" ? 2 : 1;
  return <OnboardingFlow key={`${locale}-${initialStep}`} name={state.name || ""} initialStep={initialStep} review={query.review === "1"} />;
}
