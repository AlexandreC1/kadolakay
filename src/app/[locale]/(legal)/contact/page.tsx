import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { contactPageCopy, legalShared, supportEmail } from "@/lib/legal-copy";
import styles from "../legal.module.css";

export async function generateMetadata() {
  return { title: contactPageCopy(await getLocale()).title };
}

export default async function ContactPage() {
  const locale = await getLocale();
  const c = contactPageCopy(locale);
  const email = supportEmail();
  return (
    <article className="foundation-page foundation-narrow">
      <header className="foundation-intro">
        <h1>{c.title}</h1>
        <p>{c.intro}</p>
      </header>
      <section className="foundation-panel">
        {email ? (
          <a className={styles.email} href={`mailto:${email}`}>{email}</a>
        ) : (
          <p>{legalShared(locale).contactPending}</p>
        )}
      </section>
      <div className={`${styles.sections} ${styles.contactNotes}`}>
        <p>{c.merchants}</p>
        <p>
          <Link href="/settings">{c.privacy}</Link>
        </p>
      </div>
    </article>
  );
}
