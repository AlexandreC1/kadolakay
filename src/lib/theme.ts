export const themeCookie = "kadolakay-theme";
export type ThemeChoice = "light" | "dark" | "system";
export function parseTheme(value: unknown): ThemeChoice {
  return value === "light" || value === "dark" ? value : "system";
}
export function resolveTheme(choice: ThemeChoice, prefersDark: boolean) {
  return choice === "system" ? prefersDark ? "dark" : "light" : choice;
}
export function shouldAnimateTheme(current: ThemeChoice, next: ThemeChoice, prefersDark: boolean, reducedMotion: boolean, supported: boolean) {
  return supported && !reducedMotion && resolveTheme(current, prefersDark) !== resolveTheme(next, prefersDark);
}
export function themePreferenceCookie(choice: ThemeChoice, secure: boolean) {
  return `${themeCookie}=${parseTheme(choice)}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`;
}
