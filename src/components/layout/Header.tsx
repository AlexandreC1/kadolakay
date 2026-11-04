import { useTranslations, useLocale } from "next-intl";
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
import { AppNav, NewListButton, TabBar } from "./AppNav";
import styles from "./app-shell.module.css";

export async function Header() {
  const session = await auth();
  return <HeaderContent user={session?.user} />;
}

function HeaderContent({ user }: { user?: { name?: string | null; image?: string | null; email?: string | null; role?: Role } }) {
  const t = useTranslations();
  const navigation = featureNavCopy(useLocale());
  return (
    <>
      <header className={styles.bar}>
        <div className={styles.inner}>
          <Link href="/" className={styles.brand} aria-label={`Bayou, ${navigation.home}`}>
            <Brand />
          </Link>
          <div className={styles.center}>
            <AppNav />
            <div className={styles.explore}>
              <ExploreMenu />
            </div>
          </div>
          <div className={styles.actions}>
            <LocaleSwitcher />
            <div className={styles.wideOnly}>
              <ThemeSwitcher />
            </div>
            <div className={styles.wideOnly}>
              <NewListButton />
            </div>
            <div className={styles.wideOnly}>
              {user ? <UserMenu user={user} /> : <Link href="/login" className={styles.signIn}>{t("common.signIn")}</Link>}
            </div>
            <div className={styles.narrowOnly}>
              <MobileNav user={user} />
            </div>
          </div>
        </div>
      </header>
      <TabBar signedIn={Boolean(user)} />
    </>
  );
}
