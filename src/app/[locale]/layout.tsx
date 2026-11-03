import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { routing } from "@/i18n/routing";
import localFont from "next/font/local";
import { Header } from "@/components/layout/Header";
import { AppBackground } from "@/components/theme/AppBackground";
import { Footer } from "@/components/layout/Footer";

// Owner-approved Figtree UI with Fraunces headings.
const figtree = localFont({src:"../fonts/Figtree-Latin.woff2",weight:"300 900",style:"normal",variable:"--font-figtree",display:"swap"});

const fraunces = localFont({src:[{path:"../fonts/Fraunces-Latin.woff2",weight:"100 900",style:"normal"},{path:"../fonts/Fraunces-Latin-Italic.woff2",weight:"100 900",style:"italic"}],variable:"--font-fraunces",display:"swap"});

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
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${figtree.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-night text-gray-900">
        <AppBackground />
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
