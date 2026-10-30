export const seasons = [
  "everyday",
  "valentine",
  "christmas",
  "independence",
  "flag",
  "vertieres",
] as const;
export type Season = (typeof seasons)[number];
export const seasonCookie = "bayou-season";
export function parseSeasonPreference(value: unknown): "auto" | "off" {
  return value === "off" ? "off" : "auto";
}
/** Fixed-date windows only. No guessed movable religious/carnival dates. */
export function currentSeason(
  now = new Date(),
  preference: "auto" | "off" = "auto",
): Season {
  if (preference === "off" || !Number.isFinite(now.getTime()))
    return "everyday";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Port-au-Prince",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  if (month === 12 && day >= 1 && day <= 25) return "christmas";
  if (month === 2 && day <= 14) return "valentine";
  if (month === 1 && day <= 2) return "independence";
  if (month === 5 && day === 18) return "flag";
  if (month === 11 && day === 18) return "vertieres";
  return "everyday";
}
export const palettes = ["mint", "rose", "ocean", "gold"] as const;
export type Palette = (typeof palettes)[number];
export function premiumActive(
  grant: { expiresAt: Date } | null | undefined,
  now = new Date(),
): boolean {
  return Boolean(
    grant &&
      Number.isFinite(now.getTime()) &&
      grant.expiresAt.getTime() > now.getTime(),
  );
}
