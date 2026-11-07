import { formatEventDate } from "@web/event-date";
import { guestCopy } from "@web/guest-copy";
import { homeCopy } from "@web/home-copy";
import { occasionLabel } from "@web/occasions";
import { onboardingCopy } from "@web/onboarding-copy";
import { shellCopy } from "@web/shell-copy";
import { listCopy, wishlistCopy } from "@web/wishlist-copy";
import { useMemo } from "react";
import { useStore } from "@/data/StoreProvider";
import type { Locale } from "@/data/types";
import { appCopy } from "./app";
import { formatMoney, formatMonthYear } from "./money";

export { formatMoney, formatMonthYear };

/** Everything a screen needs to speak the person's language. */
export function copyFor(locale: Locale) {
  return {
    locale,
    t: appCopy[locale],
    home: homeCopy(locale),
    list: listCopy(locale),
    wishlist: wishlistCopy(locale),
    guest: guestCopy(locale),
    welcome: onboardingCopy(locale),
    shell: shellCopy(locale),
    occasion: (type: string) => occasionLabel(type, locale),
    date: (iso: string) => formatEventDate(`${iso}T00:00:00Z`, locale),
    money: (amount: number | undefined, currency: "HTG" | "USD") => formatMoney(amount, currency, locale),
    monthYear: (ym: string) => formatMonthYear(ym, locale),
  };
}

export function useCopy() {
  const { state } = useStore();
  return useMemo(() => copyFor(state.locale), [state.locale]);
}

export type Copy = ReturnType<typeof copyFor>;
