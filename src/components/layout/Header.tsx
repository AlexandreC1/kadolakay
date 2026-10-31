import { useTranslations } from "next-intl";
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/70 bg-night/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-2xl font-semibold tracking-tight text-gray-900">
            Kado<span className="italic text-gold-400">Lakay</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
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

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ThemeSwitcher initial={theme} />
          </div>
          <LocaleSwitcher />
          <div className="hidden md:block">
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
                  className="text-sm font-semibold bg-gold-400 text-brand-950 px-4 py-2 rounded-full hover:bg-[#ffc95c] transition-colors"
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
