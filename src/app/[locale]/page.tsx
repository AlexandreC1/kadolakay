import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { homeCopy } from "@/lib/home-copy";
import "../home-entry.css";

export default async function HomePage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations()]);
  const c = homeCopy(locale);
  return (
    <section className="home-entry" aria-labelledby="home-heading">
      <p className="home-entry-eyebrow">{t("landing.eyebrow")}</p>
      <h1 id="home-heading">
        {c.title}
        <span>{c.title2}</span>
      </h1>
      <p className="home-entry-intro">{c.intro}</p>
      <div className="home-entry-actions">
        <Link href="/create" className="home-entry-primary">
          {t("nav.createRegistry")}
        </Link>
        <Link href="/find" className="home-entry-secondary">
          {c.find}
        </Link>
      </div>
      <p className="home-entry-note">{c.note}</p>
    </section>
  );
}
