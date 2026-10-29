"use client";
import { Baby, Cake, HeartHandshake, TreePine, ShoppingBag, Gift, Compass, LoaderCircle } from "lucide-react";
import { occasionTypes, occasionLabel, type Occasion } from "@/lib/occasions";
import { onboardingCopy } from "@/lib/onboarding-copy";
import "@/components/onboarding/onboarding.css";
const icons = { BIRTHDAY: Cake, BABY_SHOWER: Baby, WEDDING: HeartHandshake, CHRISTMAS: TreePine, SHOPPING: ShoppingBag, OTHER: Gift };
export function OccasionPicker({ locale, onChoose, pending = false, selected, onExplore, onSkip }: {
  locale: string; onChoose: (type: Occasion) => void; pending?: boolean; selected?: string;
  onExplore?: () => void; onSkip?: () => void;
}) {
  const c = onboardingCopy(locale);
  return <section className="occasion-picker" aria-labelledby="occasion-heading" aria-busy={pending}>
    <h1 id="occasion-heading">{c.title}</h1><p className="occasion-intro">{c.subtitle}</p>
    <div className="occasion-options">{occasionTypes.map(type => { const Icon = icons[type]; return <button type="button" key={type} className="occasion-chip" disabled={pending} aria-pressed={selected === type} onClick={() => onChoose(type)}>
      {pending && selected === type ? <LoaderCircle size={21} className="onboarding-spinner" aria-hidden="true" /> : <Icon size={22} strokeWidth={1.6} aria-hidden="true" />}<span>{occasionLabel(type, locale)}</span>
    </button>; })}
    {onExplore && <button type="button" className="occasion-chip" disabled={pending} onClick={onExplore}><Compass size={22} strokeWidth={1.6} aria-hidden="true" /><span>{c.explore}</span></button>}</div>
    {onSkip && <button type="button" className="onboarding-skip" disabled={pending} onClick={onSkip}>{c.skip}</button>}
    <p className="onboarding-announcement" role="status">{pending ? c.choosing : ""}</p>
  </section>;
}
