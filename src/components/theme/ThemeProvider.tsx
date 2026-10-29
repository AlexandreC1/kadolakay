"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { parseTheme, shouldAnimateTheme, themeCookie, themePreferenceCookie, type ThemeChoice } from "@/lib/theme";

const ThemeContext = createContext<{ choice: ThemeChoice; pending: boolean; saved: boolean; change: (choice: ThemeChoice) => void } | null>(null);
export function ThemeProvider({ initialTheme, children }: { initialTheme: ThemeChoice; children: ReactNode }) {
  const [choice, setChoice] = useState(initialTheme), [pending, setPending] = useState(false), [saved, setSaved] = useState(true);
  const lock = useRef(false);
  const preferenceWritable = useRef(true);
  useEffect(() => {
    function sync() {
      if (lock.current || document.hidden || !preferenceWritable.current) return;
      try {
        const value = document.cookie.split(";").map(part => part.trim()).find(part => part.startsWith(`${themeCookie}=`))?.slice(themeCookie.length + 1);
        if (value === "light" || value === "dark" || value === "system") {
          document.documentElement.dataset.theme = value;
          setChoice(value); setSaved(true);
        }
      } catch { /* Browsers may block preference persistence. */ }
    }
    window.addEventListener("focus", sync); document.addEventListener("visibilitychange", sync);
    return () => { window.removeEventListener("focus", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);
  function change(value: ThemeChoice) {
    const next = parseTheme(value);
    if (lock.current || next === choice) return;
    // Persist immediately so navigating during the visual wipe keeps the choice.
    let persisted = false;
    try {
      document.cookie = themePreferenceCookie(next, location.protocol === "https:");
      persisted = document.cookie.split(";").some(part => part.trim() === `${themeCookie}=${next}`);
    } catch { /* Theme still works for this mounted visit when cookies are blocked. */ }
    preferenceWritable.current = persisted;
    let applied = false;
    function apply() {
      if (applied) return; applied = true;
      document.documentElement.dataset.theme = next;
      flushSync(() => { setChoice(next); setSaved(persisted); });
    }
    const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
    if (!shouldAnimateTheme(choice, next, prefersDark, matchMedia("(prefers-reduced-motion: reduce)").matches, typeof document.startViewTransition === "function")) { apply(); return; }
    lock.current = true; setPending(true);
    document.documentElement.dataset.themeTransition = "true";
    try {
      const transition = document.startViewTransition(apply);
      void transition.finished.catch(() => { if (!applied) apply(); }).finally(() => {
        delete document.documentElement.dataset.themeTransition;
        lock.current = false; setPending(false);
      });
    } catch {
      apply(); delete document.documentElement.dataset.themeTransition;
      lock.current = false; setPending(false);
    }
  }
  return <ThemeContext.Provider value={{ choice, change, pending, saved }}>{children}</ThemeContext.Provider>;
}
export function useThemePreference() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeProvider is required");
  return value;
}
