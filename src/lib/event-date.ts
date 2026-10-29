/** Registry dates are calendar days stored at UTC midnight, not viewer-local timestamps. */
export function formatEventDate(value: Date | string, locale: string) {
  const date = new Date(value);
  if (locale === "ht") {
    // Intl does not consistently ship Haitian Creole month names across runtimes.
    const months = ["janvye", "fevriye", "mas", "avril", "me", "jen", "jiyè", "out", "septanm", "oktòb", "novanm", "desanm"];
    return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  }
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  }).format(date);
}
