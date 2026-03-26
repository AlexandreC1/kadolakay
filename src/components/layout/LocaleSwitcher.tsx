"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const localeLabels: Record<Locale, string> = {
  ht: "Kreyol",
  fr: "Fran\u00e7ais",
  en: "English",
};

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function handleChange(newLocale: Locale) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="flex items-center gap-1">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleChange(loc)}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            loc === locale
              ? "bg-blue-700 text-white font-medium"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {localeLabels[loc]}
        </button>
      ))}
    </div>
  );
}
