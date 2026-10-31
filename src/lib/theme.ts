/** Color themes a user can pick (see globals.css). Dark is the default. */
export const THEMES = ["dark", "light", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "theme";

/** Cookie value to a known theme; anything else falls back to dark. */
export function parseTheme(value: string | undefined): Theme {
  return THEMES.includes(value as Theme) ? (value as Theme) : "dark";
}
