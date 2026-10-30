"use client";

import { useEffect, useState } from "react";
import { GravityStarsBackground } from "@/components/animate-ui/backgrounds/gravity-stars";

export function AppBackground() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setPaused(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);
  // A bounded introduction needs no persistent playback control. The renderer
  // also honors reduced motion and stops when hidden, with no network assets.
  return (
    <GravityStarsBackground
      className="app-gravity-background"
      aria-hidden="true"
      paused={paused}
      starsCount={70}
      starsSize={1.5}
      starsOpacity={0.55}
      glowIntensity={6}
      movementSpeed={0.3}
      mouseInfluence={150}
      mouseGravity="attract"
      gravityStrength={65}
    />
  );
}
