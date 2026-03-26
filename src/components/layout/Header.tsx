import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNav } from "./MobileNav";
import { auth } from "@/lib/auth";
import { UserMenu } from "./UserMenu";

export async function Header() {
  const session = await auth();

  return <HeaderContent user={session?.user} />;
}

function HeaderContent({
  user,
}: {
  user?: { name?: string | null; image?: string | null; email?: string | null };
}) {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-blue-700">Kado</span>
          <span className="text-2xl font-bold text-amber-500">Lakay</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/create"
            className="text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors"
          >
            {t("nav.createRegistry")}
          </Link>
          <Link
            href="/browse"
            className="text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors"
          >
            {t("nav.businesses")}
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <div className="hidden md:block">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-700 hover:text-blue-700 px-3 py-2"
                >
                  {t("common.signIn")}
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
                >
                  {t("common.signUp")}
                </Link>
              </div>
            )}
          </div>
          <MobileNav user={user} />
        </div>
      </div>
    </header>
  );
}
