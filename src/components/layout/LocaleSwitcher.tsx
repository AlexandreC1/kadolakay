"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const localeLabels: Record<Locale, string> = {
  ht: "Kreyol",
  fr: "Fran\u00e7ais",
  en: "English",
};

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("header");
  const pathname = usePathname();
  const router = useRouter();

  function handleChange(newLocale: Locale) {
    // Preserve private share tokens, search filters, and page anchors.
    router.replace(`${pathname}${window.location.search}${window.location.hash}`, { locale: newLocale });
  }

  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{t("language")}</span>
      <select value={locale} onChange={(event) => handleChange(event.target.value as Locale)} className="min-h-11 max-w-28 rounded-full border border-gray-300 bg-surface px-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
        {routing.locales.map((loc) => <option key={loc} value={loc}>{localeLabels[loc]}</option>)}
      </select>
    </label>
  );
}
