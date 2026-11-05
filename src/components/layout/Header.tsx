import {Brand} from "@/components/layout/Brand";
import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNav } from "./MobileNav";
import { auth } from "@/lib/auth";
import { UserMenu } from "./UserMenu";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

export async function Header() {
  const session = await auth();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return <HeaderContent user={session?.user} theme={theme} />;
}

function HeaderContent({
  user,
  theme,
}: {
  user?: { name?: string | null; image?: string | null; email?: string | null };
  theme: Theme;
}) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/70 bg-night/70 backdrop-blur-xl">
      <div className="mx-auto max-w-[1600px] flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Brand />
        </Link>

        {/* Desktop Nav */}
        <nav aria-label={t("header.navigation")} className="hidden xl:ml-4 xl:flex items-center gap-4 whitespace-nowrap">
          <Link href="/find" className="py-2 text-sm font-medium text-gray-700 hover:text-gray-900">{t("header.findRegistry")}</Link>
            <Link href="/gifts" className="py-2 text-sm font-medium text-gray-700">{t("giftFinder.nav")}</Link>
          <Link
            href="/create"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            {t("nav.createRegistry")}
          </Link>
          <Link
            href="/browse"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            {t("nav.businesses")}
          </Link>
        </nav>

        <form action={`/${locale}/gifts`} method="get" role="search" className="hidden min-w-0 max-w-56 flex-1 xl:ml-auto xl:flex">
          <label className="sr-only" htmlFor="header-product-search">{t("header.searchProducts")}</label>
          <div className="flex w-full items-center rounded-full border border-gray-300 bg-surface px-3 focus-within:ring-2 focus-within:ring-brand-500">
            <input id="header-product-search" name="q" maxLength={64} placeholder={t("header.searchProducts")} className="min-w-0 flex-1 bg-transparent py-2 text-sm text-gray-900 outline-none" />
            <button type="submit" aria-label={t("header.searchProducts")} className="grid h-10 w-10 shrink-0 place-items-center text-gray-700"><Search size={18} aria-hidden="true" /></button>
          </div>
        </form>
        {/* Right side */}
        <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-0">
          <div className="hidden sm:block">
            <ThemeSwitcher initial={theme} />
          </div>
          <LocaleSwitcher />
          <div className="hidden xl:block">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2"
                >
                  {t("common.signIn")}
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold bg-gold-400 text-brand-950 px-4 py-2 rounded-full hover:bg-[var(--brand-action-hover)] transition-colors"
                >
                  {t("common.signUp")}
                </Link>
              </div>
            )}
          </div>
          <MobileNav user={user} theme={theme} />
        </div>
      </div>
    </header>
  );
}
