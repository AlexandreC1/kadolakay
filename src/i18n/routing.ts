import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ht", "fr", "en"],
  defaultLocale: "ht",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
