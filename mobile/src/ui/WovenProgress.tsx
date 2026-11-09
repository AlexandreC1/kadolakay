import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming, Easing } from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";
import { useColors } from "@/data/StoreProvider";
import type { Gift } from "@/data/types";

export type StrandState = "confirmed" | "held" | "open";
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const MAX = 36, W = 600, H = 96, ROWS = [24, 48, 72], RIB = 10;

/** One strand per requested unit: given first, then being paid, then open. Same rule as the web. */
export function strandsFor(items: Pick<Gift, "quantity" | "fulfilledQty" | "reservedQty">[]): StrandState[] {
  const out: StrandState[] = [];
  for (const g of items) {
    const req = Math.max(0, g.quantity);
    const given = Math.min(req, Math.max(0, g.fulfilledQty));
    const held = Math.min(req - given, Math.max(0, g.reservedQty));
    out.push(...Array<StrandState>(given).fill("confirmed"), ...Array<StrandState>(held).fill("held"), ...Array<StrandState>(req - given - held).fill("open"));
  }
  const order = { confirmed: 0, held: 1, open: 2 };
  return out.sort((a, b) => order[a] - order[b]);
}

function resample(s: StrandState[], n: number): StrandState[] {
  const c = Math.round((s.filter((x) => x === "confirmed").length / s.length) * n);
  const h = Math.min(n - c, Math.round((s.filter((x) => x === "held").length / s.length) * n));
  return [...Array(c).fill("confirmed"), ...Array(h).fill("held"), ...Array(n - c - h).fill("open")];
}

/**
 * Progress as a woven band, after the panye baskets families carry gifts in.
 * Strands fill from the bottom as gifts are given. Decorative: the caller
 * always shows the same numbers as text, and the label carries them for screen readers.
 */
export function WovenProgress({ strands, label }: { strands: StrandState[]; label: string }) {
  const c = useColors();
  const shown = strands.length > MAX ? resample(strands, MAX) : strands;
  const n = Math.max(shown.length, 1);
  const gap = n <= 8 ? 14 : n <= 20 ? 9 : 6;
  const sw = (W - gap * (n - 1)) / n;
  const r = Math.min(sw / 2, 12);
  const fill = (s: StrandState) => (s === "confirmed" ? c.strandGiven : s === "held" ? c.strandHeld : c.strandOpen);
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{ width: "100%", aspectRatio: W / H }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {ROWS.map((y) => <Rect key={`u${y}`} x={0} y={y - RIB / 2} width={W} height={RIB} rx={RIB / 2} fill={c.line} />)}
        {shown.map((s, i) => (
          <Strand key={i} x={i * (sw + gap)} w={sw} r={r} open={c.strandOpen} color={fill(s)} filled={s !== "open"} index={i} />
        ))}
        {ROWS.map((y, row) => shown.map((_, i) => ((i + row) % 2 === 0
          ? <Rect key={`o${y}-${i}`} x={i * (sw + gap) - 2} y={y - RIB / 2} width={sw + 4} height={RIB} rx={RIB / 2} fill={c.surfaceMuted} opacity={0.9} />
          : null)))}
      </Svg>
    </View>
  );
}

function Strand({ x, w, r, color, open, filled, index }: { x: number; w: number; r: number; color: string; open: string; filled: boolean; index: number }) {
  const reduced = useReducedMotion();
  const level = useSharedValue(reduced || !filled ? (filled ? 1 : 0) : 0);
  useEffect(() => {
    level.set(reduced ? (filled ? 1 : 0) : withDelay(index * 35, withTiming(filled ? 1 : 0, { duration: 520, easing: Easing.out(Easing.cubic) })));
  }, [filled, index, level, reduced]);
  const props = useAnimatedProps(() => ({ y: 2 + (H - 4) * (1 - level.get()), height: (H - 4) * level.get() }));
  return (
    <>
      <Rect x={x} y={2} width={w} height={H - 4} rx={r} fill={open} />
      <AnimatedRect x={x} width={w} rx={r} fill={color} animatedProps={props} />
    </>
  );
}
