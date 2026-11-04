import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./footer.module.css";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className={styles.footer}>
      <span>© {new Date().getFullYear()} Bayou.</span>
      <nav className={styles.links} aria-label={t("legalNavigation")}>
        <Link href="/privacy">{t("privacy")}</Link>
        <Link href="/terms">{t("terms")}</Link>
        <Link href="/contact">{t("contact")}</Link>
      </nav>
    </footer>
  );
}
