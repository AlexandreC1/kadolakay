"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const localeLabels: Record<Locale, string> = { ht: "Kreyòl", fr: "Français", en: "English" };
const accessibleLabels: Record<Locale, string> = { ht: "Chwazi lang", fr: "Choisir la langue", en: "Choose language" };

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <select className="locale-select" aria-label={accessibleLabels[locale]} value={locale} disabled={pending} onChange={event => { const next = event.target.value as Locale; const query = search.toString(); startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { locale: next })); }}>{routing.locales.map(loc => <option value={loc} key={loc}>{localeLabels[loc]}</option>)}</select>;
}
