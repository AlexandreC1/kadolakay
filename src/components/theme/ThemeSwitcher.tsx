"use client";
import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { resolveTheme } from "@/lib/theme";
import { useThemePreference } from "./ThemeProvider";

const copy = {
  en: { label: "Dark mode", light: "Switch to light mode", dark: "Switch to dark mode", unsaved: "Theme changed for this visit. Your browser could not save the preference." },
  fr: { label: "Mode sombre", light: "Passer au mode clair", dark: "Passer au mode sombre", unsaved: "Le thème est appliqué pour cette visite. Votre navigateur ne peut pas enregistrer ce choix." },
  ht: { label: "Mòd fonse", light: "Chanje pou mòd klè", dark: "Chanje pou mòd fonse", unsaved: "Tèm nan chanje pou vizit sa a. Navigatè ou pa ka sove chwa a." },
};
const subscribe = (notify: () => void) => {
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
export function ThemeSwitcher({ showLabel = false }: { showLabel?: boolean }) {
  const locale = useLocale(), c = copy[locale as keyof typeof copy] || copy.en;
  const { choice, change, pending, saved } = useThemePreference();
  const prefersDark = useSyncExternalStore(subscribe, () => matchMedia("(prefers-color-scheme: dark)").matches, () => false);
  const dark = resolveTheme(choice, prefersDark) === "dark";
  return <div className="theme-switcher">
    <button type="button" role="switch" aria-checked={dark} aria-label={c.label} aria-disabled={pending} className="theme-trigger" title={dark ? c.light : c.dark} onClick={() => { if (!pending) change(dark ? "light" : "dark"); }}>
      {dark ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}{showLabel && <span>{c.label}</span>}
    </button>
    {!saved && <p role="status" className="theme-save-status">{c.unsaved}</p>}
  </div>;
}
