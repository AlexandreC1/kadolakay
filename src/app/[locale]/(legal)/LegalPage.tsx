import { Link } from "@/i18n/navigation";
import {
  LEGAL_VERSION,
  legalShared,
  supportEmail,
  type LegalDocument,
} from "@/lib/legal-copy";
import styles from "./legal.module.css";

export function LegalPage({ doc, locale, eyebrow }: { doc: LegalDocument; locale: string; eyebrow: string }) {
  const shared = legalShared(locale);
  const email = supportEmail();
  return (
    <article className="foundation-page foundation-narrow">
      <header className="foundation-intro">
        <p className="foundation-eyebrow">{eyebrow}</p>
        <h1>{doc.title}</h1>
        <p>{doc.intro}</p>
      </header>
      <p className={styles.draft} role="note">{shared.draft}</p>
      <div className={styles.sections}>
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body.length > 1 ? (
              <ul>{section.body.map((line) => <li key={line}>{line}</li>)}</ul>
            ) : (
              <p>{section.body[0]}</p>
            )}
          </section>
        ))}
        <section>
          <p>
            {email ? (
              <>
                {shared.contactPrompt} <a href={`mailto:${email}`}>{email}</a>
              </>
            ) : (
              <Link href="/contact">{shared.contactPending}</Link>
            )}
          </p>
        </section>
      </div>
      <p className={styles.meta}>{shared.version} {LEGAL_VERSION}</p>
    </article>
  );
}
