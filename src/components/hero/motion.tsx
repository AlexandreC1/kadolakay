"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Headline that rises in word by word. Static for reduced-motion users. */
export function Reveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ y: "0.6em", opacity: 0, filter: "blur(6px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ delay: delay + 0.08 * i, duration: 0.6, ease: EASE }}
        >
          {word}&nbsp;
        </motion.span>
      ))}
    </span>
  );
}

/** Fades and lifts its children in the first time they scroll into view. */
export function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay, duration: 0.6, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Two slow-drifting light fields behind a dark section. */
export function Glow() {
  const reduce = useReducedMotion();
  const drift = (x: number, y: number, duration: number) =>
    reduce ? {} : { animate: { x: [0, x, 0], y: [0, y, 0] }, transition: { duration, repeat: Infinity, ease: "easeInOut" as const } };
  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[620px] w-[620px] rounded-full bg-[#3b5bff] opacity-30 blur-[140px]"
        {...drift(80, 40, 18)}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 right-0 -z-10 h-[560px] w-[560px] rounded-full bg-[#f5b83d] opacity-20 blur-[140px]"
        {...drift(-60, -30, 22)}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-grid" />
    </>
  );
}
