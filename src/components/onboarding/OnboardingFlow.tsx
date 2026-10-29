"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { chooseWelcomeOccasion, saveWelcomeProfile } from "@/actions/onboarding";
import { OccasionPicker } from "@/components/registry/OccasionPicker";
import { onboardingCopy } from "@/lib/onboarding-copy";
import type { OnboardingChoice } from "@/lib/validators/onboarding";
import "./onboarding.css";

export function OnboardingFlow({ name, initialStep, review = false }: { name: string; initialStep: 1 | 2; review?: boolean }) {
  const locale = useLocale(), c = onboardingCopy(locale), router = useRouter();
  const [step, setStep] = useState(initialStep), [displayName, setName] = useState(name);
  const [language, setLanguage] = useState(locale), [pending, setPending] = useState(false);
  const [error, setError] = useState<"invalid" | "expired" | "limited" | "error" | null>(null);
  const [selected, setSelected] = useState<string>();
  const lock = useRef(false), heading = useRef<HTMLDivElement>(null);
  function move(next: 1 | 2) {
    setError(null); setStep(next);
    router.push(`/${locale}/onboarding?step=${next}${review ? "&review=1" : ""}`, { scroll: false });
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function saveProfile(event: React.FormEvent) {
    event.preventDefault(); if (lock.current) return;
    lock.current = true; setPending(true); setError(null);
    try {
      const result = await saveWelcomeProfile({ name: displayName, locale: language });
      if (!result.ok) { setError(result.code); return; }
      if (language !== locale) router.push(`/${language}/onboarding?step=2${review ? "&review=1" : ""}`);
      else move(2);
    } catch { setError("error"); }
    finally { lock.current = false; setPending(false); }
  }
  async function choose(choice: OnboardingChoice["choice"]) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setSelected(choice);
    try {
      const result = await chooseWelcomeOccasion({ choice, locale });
      if (!result.ok) { setError(result.code); lock.current = false; setPending(false); return; }
      router.push(result.destination);
    } catch { setError("error"); lock.current = false; setPending(false); }
  }
  return <div className="onboarding-page" aria-busy={pending}>
    <div className="onboarding-steps" aria-label={step === 1 ? c.step1 : c.step2}>
      <span className="onboarding-step-line is-current" aria-hidden="true" /><span>{step === 1 ? c.step1 : c.step2}</span><span className={`onboarding-step-line${step === 2 ? " is-current" : ""}`} aria-hidden="true" />
    </div>
    <div ref={heading} tabIndex={-1}>
      {step === 1 ? <form className="onboarding-profile" onSubmit={saveProfile}>
        <h1>{c.welcome}</h1><p>{c.intro}</p>
        <div className="onboarding-field"><label htmlFor="welcome-name">{c.name} <span className="onboarding-hint">({c.optional})</span></label>
          <input id="welcome-name" name="name" value={displayName} onChange={event => setName(event.target.value)} maxLength={100} autoComplete="name" disabled={pending} aria-describedby="welcome-name-hint" />
          <p id="welcome-name-hint" className="onboarding-hint">{c.nameHint}</p></div>
        <div className="onboarding-field"><label htmlFor="welcome-language">{c.language}</label>
          <select id="welcome-language" value={language} onChange={event => setLanguage(event.target.value)} disabled={pending}>
            <option value="ht">Kreyòl</option><option value="fr">Français</option><option value="en">English</option>
          </select></div>
        <button type="submit" className="onboarding-continue" disabled={pending}>{pending ? c.saving : c.continue}</button>
        <button type="button" className="onboarding-skip" disabled={pending} onClick={() => move(2)}>{c.later}</button>
      </form> : <><button type="button" className="onboarding-back" onClick={() => move(1)} disabled={pending}>{c.back}</button>
        <OccasionPicker locale={locale} pending={pending} selected={selected} onChoose={choose} onExplore={() => choose("EXPLORE")} onSkip={() => choose("SKIP")} /></>}
    </div>
    {error && <div className="onboarding-error" role="alert">{c[error]}{error === "expired" && <a href={`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/onboarding?step=${step}`)}`}>{c.retryLogin}</a>}</div>}
  </div>;
}
