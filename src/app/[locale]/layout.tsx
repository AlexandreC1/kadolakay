import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Figtree, Fraunces } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { cookies } from "next/headers";
import { parseTheme, themeCookie } from "@/lib/theme";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppBackground } from "@/components/theme/AppBackground";
import { currentSeason, parseSeasonPreference, seasonCookie } from "@/lib/seasons";
import { SeasonalBanner } from "@/components/theme/SeasonalBanner";
import "../foundations.css";

const bodyFont = Figtree({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const displayFont = Fraunces({
  variable: "--font-display",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();
  const jar = await cookies();
  const initialTheme = parseTheme(jar.get(themeCookie)?.value);
  const season = currentSeason(new Date(),parseSeasonPreference(jar.get(seasonCookie)?.value));

  return (
    <html
      lang={locale}
      data-theme={initialTheme}
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider initialTheme={initialTheme}>
          <a href="#main-content" className="skip-link">{locale === "ht" ? "Ale nan kontni an" : locale === "fr" ? "Aller au contenu" : "Skip to content"}</a><Header />
          <main id="main-content" className="flex-1"><SeasonalBanner season={season} locale={locale}/>{children}</main>
          <Footer />
          <AppBackground />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
