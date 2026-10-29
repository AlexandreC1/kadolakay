/** Bound a decorative canvas independently of display resolution or caller input. */
export function gravityStarCount(width: number, requested: number) {
  return Math.max(0, Math.min(width < 640 ? 32 : 70, Number.isFinite(requested) ? Math.floor(requested) : 0));
}
export function gravityCanvasScale(width: number, height: number, deviceRatio: number) {
  const area = Math.max(1, width * height);
  return Math.min(1.5, Math.max(1, deviceRatio || 1), Math.sqrt(2500000 / area));
}
