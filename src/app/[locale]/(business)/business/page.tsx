import { getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { foundationsCopy } from "@/lib/foundations-copy";

export default async function MerchantLandingPage() {
  const [locale, session] = await Promise.all([getLocale(), auth()]);
  const c = foundationsCopy(locale);
  const business = session?.user?.id
    ? await db.business.findUnique({
        where: { ownerId: session.user.id },
        select: { id: true },
      })
    : null;
  return (
    <div className="foundation-page merchant-entry">
      <header className="foundation-intro">
        <p className="foundation-eyebrow">Bayou / {c.businessLink}</p>
        <h1>{c.merchant}</h1>
        <p>{c.merchantIntro}</p>
        <Link
          className="foundation-primary"
          href={business ? "/business/dashboard" : "/business/signup"}
        >
          {business ? c.merchantDashboard : c.apply}
        </Link>
      </header>
      <section className="merchant-requirements">
        <h2>{c.requirements}</h2>
        <p>{c.requiredCopy}</p>
      </section>
      <ol className="foundation-steps">
        {[
          [c.review, c.reviewCopy],
          [c.catalog, c.catalogCopy],
          [c.payments, c.paymentCopy],
        ].map(([title, text], i) => (
          <li key={title}>
            <span className="foundation-step-number">0{i + 1}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </li>
        ))}
      </ol>
      <p className="foundation-note">{c.noFees}</p>
    </div>
  );
}
