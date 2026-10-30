import { getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { foundationsCopy } from "@/lib/foundations-copy";
import { getPremiumAccess } from "@/services/product-foundations";
import { Link } from "@/i18n/navigation";

export default async function PremiumPage() {
  const [locale, session] = await Promise.all([getLocale(), auth()]);
  const c = foundationsCopy(locale);
  const access = session?.user?.id
    ? await getPremiumAccess(session.user.id)
    : null;
  return (
    <div className="foundation-page foundation-narrow">
      <header className="foundation-intro">
        <p className="foundation-eyebrow">{c.premium}</p>
        <h1>{c.premiumIntro}</h1>
        <p>{c.premiumDetails}</p>
      </header>
      <div className="premium-benefits">
        <section>
          <h2>{c.personalization}</h2>
          <div className="palette-preview" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <p>{c.reset}</p>
        </section>
        <section>
          <h2>{c.insights}</h2>
          <p>{c.scope}</p>
        </section>
      </div>
      <section className="foundation-panel">
        <h2>{access?.active ? c.premiumActive : c.premium}</h2>
        <p>
          {access?.active
            ? `${c.expires}: ${access.expiresAt!.toISOString().slice(0, 10)} UTC`
            : c.premiumInactive}
        </p>
        {access?.active && (
          <Link className="foundation-primary" href="/premium/manage">
            {c.manage}
          </Link>
        )}
      </section>
    </div>
  );
}
