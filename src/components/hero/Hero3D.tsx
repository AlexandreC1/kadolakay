"use client";

/**
 * Hero3D — visual centerpiece for the landing page.
 *
 * Implements a real 3D parallax scene using CSS `perspective` +
 * `transform-style: preserve-3d` and framer-motion springs. We deliberately
 * avoid three.js / @react-three/fiber here: those add ~500 KB of JS and a
 * WebGL context just to render four floating cards, which would tank LCP
 * and battery on the low-end Android phones common in Haiti. CSS 3D ships
 * ~50 KB (framer-motion only), is GPU-accelerated by every browser since
 * 2014, degrades gracefully, and has zero SSR mismatch risk.
 *
 * Mouse position drives a tilt of the entire stage; each layer translates
 * along Z to create real parallax depth. Reduced-motion users get a static
 * arrangement.
 */

import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

const SPRING = { stiffness: 120, damping: 18, mass: 0.6 };

type FloatingCard = {
  emoji: string;
  label: string;
  z: number; // depth in px
  x: number; // % of stage width
  y: number; // % of stage height
  rotate: number;
  delay: number;
  hue: string;
};

const CARDS: FloatingCard[] = [
  { emoji: "🎁", label: "Kado",        z:  80, x: 50, y: 50, rotate: -6, delay: 0.0, hue: "from-amber-300 to-amber-500" },
  { emoji: "👶", label: "Baby Shower", z:  40, x: 18, y: 28, rotate: -10, delay: 0.1, hue: "from-pink-300 to-rose-400" },
  { emoji: "💍", label: "Maryaj",      z:  20, x: 82, y: 30, rotate:  9, delay: 0.2, hue: "from-violet-300 to-purple-400" },
  { emoji: "🎂", label: "Anivèsè",     z:  60, x: 78, y: 75, rotate:  4, delay: 0.3, hue: "from-sky-300 to-cyan-400" },
  { emoji: "🇭🇹", label: "MonCash",     z:   0, x: 22, y: 78, rotate: -3, delay: 0.4, hue: "from-emerald-300 to-teal-400" },
];

export function Hero3D() {
  const stageRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Raw mouse position normalized to [-0.5, 0.5]
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Smooth springs so the tilt eases instead of snapping
  const sx = useSpring(mx, SPRING);
  const sy = useSpring(my, SPRING);

  // Stage tilts up to ±12deg
  const rotateY = useTransform(sx, [-0.5, 0.5], [12, -12]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [-8, 8]);

  useEffect(() => {
    if (reduce) return;
    const el = stageRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width - 0.5);
      my.set((e.clientY - r.top) / r.height - 0.5);
    };
    const onLeave = () => {
      mx.set(0);
      my.set(0);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [mx, my, reduce]);

  return (
    <div
      ref={stageRef}
      className="relative mx-auto aspect-square w-full max-w-md sm:max-w-lg lg:max-w-xl"
      style={{ perspective: 1200 }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          rotateX: reduce ? 0 : rotateX,
          rotateY: reduce ? 0 : rotateY,
        }}
      >
        {CARDS.map((c) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{
              opacity: 1,
              y: [0, -8, 0],
              scale: 1,
            }}
            transition={{
              opacity: { duration: 0.6, delay: c.delay },
              scale: { duration: 0.6, delay: c.delay, type: "spring" },
              y: {
                duration: 4 + c.delay * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: c.delay,
              },
            }}
            className="absolute"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              translateX: "-50%",
              translateY: "-50%",
              translateZ: c.z,
              rotate: c.rotate,
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className={`relative rounded-2xl bg-gradient-to-br ${c.hue} px-5 py-4 shadow-2xl ring-1 ring-white/30 backdrop-blur-sm`}
              style={{
                boxShadow:
                  "0 25px 50px -12px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.15) inset",
              }}
            >
              <div className="text-4xl sm:text-5xl drop-shadow-md">{c.emoji}</div>
              <div className="mt-1 text-xs font-semibold tracking-wide text-white/90 uppercase">
                {c.label}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Soft floor reflection — anchored deepest in Z so the stack feels grounded. */}
        <div
          className="absolute inset-x-10 bottom-2 h-8 rounded-full bg-amber-300/30 blur-2xl"
          style={{ transform: "translateZ(-100px)" }}
        />
      </motion.div>
    </div>
  );
}

export default Hero3D;
