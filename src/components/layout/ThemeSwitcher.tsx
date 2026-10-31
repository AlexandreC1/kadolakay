"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEMES, THEME_COOKIE, type Theme } from "@/lib/theme";

const ICONS = { dark: Moon, light: Sun, system: Monitor } as const;

/** Switches the page instantly and remembers the choice for a year. */
function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Dark / light / system picker. Applies the choice instantly by setting
 * <html data-theme>, and saves it in a cookie so the server renders the
 * same theme on the next visit (no flash).
 */
export function ThemeSwitcher({ initial }: { initial: Theme }) {
  const t = useTranslations("theme");
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div role="radiogroup" aria-label={t("label")} className="flex items-center rounded-full border border-gray-200 p-0.5">
      {THEMES.map((value) => {
        const Icon = ICONS[value];
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(value)}
            title={t(value)}
            onClick={() => choose(value)}
            className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${
              active ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
