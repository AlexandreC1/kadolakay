"use client";

/**
 * Landing hero visual: a phone showing a registry that fills up in real
 * time (gifts get checked off, the progress bar grows, a "gift received"
 * notification slides in). It shows the product instead of decorating it.
 * Demo content mirrors the seed registry. Reduced-motion users get a
 * static, half-filled registry.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Baby, Bed, Check, CircleCheck, Shirt, ShoppingBag, type LucideIcon } from "lucide-react";

const ITEMS: { title: string; price: string; icon: LucideIcon }[] = [
  { title: "Bèso pou ti bebe", price: "G 18,500", icon: Bed },
  { title: "Poussèt bebe", price: "G 24,000", icon: Baby },
  { title: "Rad pou ti bebe (0-3 mwa)", price: "G 4,200", icon: Shirt },
  { title: "Bibwon ak akseswa", price: "G 2,800", icon: ShoppingBag },
  { title: "Matla pou bèso", price: "G 7,500", icon: Bed },
];

const GIFTS = [
  { who: "Rose", what: "Bèso pou ti bebe", via: "MonCash" },
  { who: "Jean", what: "Poussèt bebe", via: "Visa" },
  { who: "Mirlande", what: "Rad pou ti bebe", via: "PayPal" },
  { who: "Ralph", what: "Bibwon ak akseswa", via: "MonCash" },
  { who: "Nadège", what: "Matla pou bèso", via: "Natcash" },
];

/** Counts 0..n, holds the full registry for a beat, then starts over. */
function useGiftedCount(n: number, ms: number) {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setTick((v) => (v + 1) % (n + 2)), ms);
    return () => clearInterval(id);
  }, [n, ms, reduce]);
  return reduce ? 2 : Math.min(tick, n);
}

export function LiveRegistryDemo({ giftedLabel }: { giftedLabel: string }) {
  const reduce = useReducedMotion();
  const gifted = useGiftedCount(ITEMS.length, 1800);
  const pct = Math.round((gifted / ITEMS.length) * 100);
  const gift = gifted > 0 ? GIFTS[gifted - 1] : null;

  return (
    <div className="relative mx-auto w-fit" aria-hidden="true">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 40 }}
        animate={reduce ? { rotate: -4 } : { opacity: 1, y: [0, -10, 0], rotate: -4 }}
        transition={{ opacity: { duration: 0.8 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
      >
        {/* Phone */}
        <div className="relative h-[540px] w-[270px] rounded-[44px] bg-gradient-to-b from-white/25 to-white/5 p-2.5 shadow-[0_40px_120px_-20px_rgba(59,91,255,0.55)] ring-1 ring-white/20">
          <div className="absolute left-1/2 top-4 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
          <div className="flex h-full w-full flex-col gap-3 overflow-hidden rounded-[36px] bg-[#0e1428] p-4 pt-10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Fèt Ti Bebe</p>
              <p className="text-base font-semibold leading-tight text-white">Marie &amp; Pierre</p>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-white/50">
                <span>{gifted}/{ITEMS.length}</span>
                <span>{pct}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-[#f5b83d]"
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 80, damping: 18 }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {ITEMS.map((item, i) => {
                const done = i < gifted;
                return (
                  <motion.div
                    key={item.title}
                    className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] p-2.5"
                    animate={{ opacity: done ? 0.55 : 1 }}
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">
                      <item.icon className="h-4 w-4 text-white" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-white">{item.title}</p>
                      <p className="text-[11px] text-white/50">{item.price}</p>
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                      {done ? (
                        <motion.span
                          key="done"
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.4, opacity: 0 }}
                          className="grid h-6 w-6 place-items-center rounded-full bg-emerald-400 text-[#070b18]"
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="open"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-2 w-2 rounded-full bg-[#f5b83d]"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* "Gift received" notification */}
      <div className="absolute -left-16 bottom-24 w-64 sm:-left-28 sm:w-72">
        <AnimatePresence mode="popLayout">
          {gift && (
            <motion.div
              key={gifted}
              initial={{ y: 16, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[#070b18] shadow-2xl"
            >
              <CircleCheck className="h-5 w-5 shrink-0 text-emerald-600" />
              <div className="text-sm leading-tight">
                <p className="font-semibold">{gift.who} · {giftedLabel}</p>
                <p className="text-[#070b18]/60">{gift.what} · {gift.via}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
