"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GravityStarsBackground } from "@/components/animate-ui/backgrounds/gravity-stars";

const HOME = /^\/(?:ht|fr|en)?\/?$/;

export function AppBackground() {
  const pathname = usePathname();
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setPaused(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);
  // Only the home page keeps the stars, so working pages stay calm and readable.
  if (!HOME.test(pathname)) return null;
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
