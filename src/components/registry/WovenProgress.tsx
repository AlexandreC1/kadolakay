import styles from "./woven-progress.module.css";

export type StrandState = "confirmed" | "held" | "open";

const MAX_STRANDS = 36;
const WIDTH = 600;
const HEIGHT = 96;
const ROWS = [24, 48, 72];
const RIBBON = 10;

/**
 * Progress drawn as a woven band, after the panyen baskets families give gifts in.
 * One vertical strand per requested gift; a strand fills when that gift is confirmed,
 * and is hatched while a payment hold is pending. Weft ribbons pass over and under
 * the strands in a checkerboard, so the band reads as woven rather than as a bar chart.
 * Purely visual: the caller always renders the same numbers as text.
 */
export function WovenProgress({ strands, label, size = "regular" }: { strands: StrandState[]; label: string; size?: "regular" | "large" }) {
  // Very long lists are drawn proportionally so the band stays legible.
  const shown = strands.length > MAX_STRANDS ? resample(strands, MAX_STRANDS) : strands;
  const count = Math.max(shown.length, 1);
  // The band always fills its width: few gifts make broad strands, like a woven mat.
  const GAP = count <= 8 ? 14 : count <= 20 ? 9 : 6;
  const STRAND = (WIDTH - GAP * (count - 1)) / count;
  const radius = Math.min(STRAND / 2, 12);
  const width = WIDTH;
  return (
    <svg
      className={`${styles.weave} ${size === "large" ? styles.large : ""}`}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      {/* Weft ribbons run continuously behind the strands... */}
      {ROWS.map((y) => (
        <rect key={`under-${y}`} className={styles.weftUnder} x={0} y={y - RIBBON / 2} width={width} height={RIBBON} rx={RIBBON / 2} />
      ))}
      {shown.map((state, i) => (
        <g key={i} className={styles.strand} data-state={state} style={{ ["--i" as string]: i }}>
          <rect className={styles.warp} x={i * (STRAND + GAP)} y={2} width={STRAND} height={HEIGHT - 4} rx={radius} />
          <rect className={styles.fill} x={i * (STRAND + GAP)} y={2} width={STRAND} height={HEIGHT - 4} rx={radius} />
        </g>
      ))}
      {/* ...and cross over every other strand, alternating by row: the over/under of a weave. */}
      {ROWS.map((y, row) => (
        <g key={`over-${y}`} className={styles.weftOver}>
          {shown.map((_, i) =>
            (i + row) % 2 === 0 ? <rect key={i} x={i * (STRAND + GAP) - 2} y={y - RIBBON / 2} width={STRAND + 4} height={RIBBON} rx={RIBBON / 2} /> : null,
          )}
        </g>
      ))}
    </svg>
  );
}

/** Keep the share of each state when drawing fewer strands than gifts. */
function resample(strands: StrandState[], target: number): StrandState[] {
  const confirmed = strands.filter((s) => s === "confirmed").length;
  const held = strands.filter((s) => s === "held").length;
  const c = Math.round((confirmed / strands.length) * target);
  const h = Math.min(target - c, Math.round((held / strands.length) * target));
  return [...Array(c).fill("confirmed"), ...Array(h).fill("held"), ...Array(target - c - h).fill("open")];
}

/** Expand gift rows into one strand per requested unit, confirmed first, then held. */
export function strandsFor(items: { quantity: number; fulfilledQty: number; reservedQty?: number }[]): StrandState[] {
  const out: StrandState[] = [];
  for (const item of items) {
    const requested = Math.max(0, item.quantity);
    const confirmed = Math.min(requested, Math.max(0, item.fulfilledQty));
    const held = Math.min(requested - confirmed, Math.max(0, item.reservedQty ?? 0));
    out.push(...Array(confirmed).fill("confirmed"), ...Array(held).fill("held"), ...Array(requested - confirmed - held).fill("open"));
  }
  return out.sort((a, b) => rank(a) - rank(b));
}
const rank = (s: StrandState) => (s === "confirmed" ? 0 : s === "held" ? 1 : 2);
