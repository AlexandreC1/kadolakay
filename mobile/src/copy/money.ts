import type { Locale } from "@/data/types";

/** Display only; the server computes payable totals. Whole amounts drop the cents. */
export function formatMoney(amount: number | undefined, currency: "HTG" | "USD", locale: Locale) {
  if (amount === undefined || !Number.isFinite(amount)) return "";
  const whole = Number.isInteger(amount);
  const digits = { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 };
  if (currency === "USD") return `$${amount.toLocaleString("en-US", digits)}`;
  // Group with a space in every language, the usual way prices are written in Haiti.
  const n = amount.toLocaleString("en-US", digits).replace(/,/g, " ");
  return `${locale === "en" ? n : n.replace(".", ",")} HTG`;
}

const months = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  ht: ["janvye", "fevriye", "mas", "avril", "me", "jen", "jiyè", "out", "septanm", "oktòb", "novanm", "desanm"],
};
export function formatMonthYear(ym: string, locale: Locale) {
  const [y, m] = ym.split("-").map(Number);
  return `${months[locale][(m || 1) - 1]} ${y}`;
}
