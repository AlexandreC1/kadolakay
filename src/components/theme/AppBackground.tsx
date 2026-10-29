"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Pause, Play } from "lucide-react";
import { GravityStarsBackground } from "@/components/animate-ui/backgrounds/gravity-stars";

const copy = {
  en: { pause: "Pause background animation", play: "Resume background animation" },
  fr: { pause: "Mettre l’animation de fond en pause", play: "Reprendre l’animation de fond" },
  ht: { pause: "Kanpe animasyon fon an", play: "Reprann animasyon fon an" },
};

export function AppBackground() {
  const locale = useLocale();
  const c = copy[locale as keyof typeof copy] || copy.en;
  const [paused, setPaused] = useState(false);
  return <>
    <GravityStarsBackground className="app-gravity-background" aria-hidden="true" paused={paused} starsCount={70} starsSize={1.5} starsOpacity={0.55} glowIntensity={6} movementSpeed={0.3} mouseInfluence={150} mouseGravity="attract" gravityStrength={65} />
    <button type="button" className="background-motion-control" aria-label={paused ? c.play : c.pause} title={paused ? c.play : c.pause} onClick={() => setPaused(value => !value)}>
      {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
    </button>
  </>;
}
