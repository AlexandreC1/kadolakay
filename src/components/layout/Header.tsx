import { useTranslations, useLocale } from "next-intl";
import { catalogCopy } from "@/lib/catalog-copy";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNav } from "./MobileNav";
import { auth } from "@/lib/auth";
import { UserMenu } from "./UserMenu";
import { Brand } from "./Brand";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import type { Role } from "@prisma/client";
import { featureNavCopy } from "@/lib/feature-nav-copy";
import { ExploreMenu } from "./ExploreMenu";

export async function Header() {
  const session = await auth();
  return <HeaderContent user={session?.user} />;
}

function HeaderContent({ user }: { user?: { name?: string | null; image?: string | null; email?: string | null; role?: Role } }) {
  const t = useTranslations();
  const copy = catalogCopy(useLocale());
  const navigation = featureNavCopy(useLocale());
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand-link" aria-label={`Bayou · ${navigation.home}`}><Brand /></Link>
        <nav className="desktop-nav" aria-label={t("landing.mainNavigation")}>
          <Link href="/">{navigation.home}</Link>
          <Link href="/find">{copy.find}</Link>
          <Link href="/create">{t("nav.createRegistry")}</Link>
          <Link href="/discover">{navigation.discover}</Link>
          <ExploreMenu />
        </nav>
        <div className="header-actions">
          <LocaleSwitcher />
          <div className="desktop-theme"><ThemeSwitcher /></div>
          <div className="desktop-account">{user ? <UserMenu user={user} /> : <Link href="/login" className="header-signin">{t("common.signIn")}</Link>}</div>
          <MobileNav user={user} />
        </div>
      </div>
    </header>
  );
}
