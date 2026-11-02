import { requireBackoffice } from "@/services/backoffice-auth";
import { adminOverview } from "@/services/backoffice";
import { getLocale } from "next-intl/server";
import { workspaceCopy } from "@/lib/workspace-copy";
import { Link } from "@/i18n/navigation";
export default async function AdminOverviewPage() {
  await requireBackoffice();
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    m = await adminOverview();
  const volume =
    locale === "fr"
      ? "Volume des paiements vérifiés, par devise"
      : locale === "ht"
        ? "Volim peman verifye, selon lajan"
        : "Verified payment volume, by currency";
  return (
    <div className="foundation-page">
      <header className="foundation-intro">
        <h1>{c.admin}</h1>
        <p>{c.overview}</p>
      </header>
      <div className="workspace-metrics">
        {[
          [c.users, m.users],
          [c.registries, m.registries],
          [c.products, m.products],
          [c.refunds, m.requests],
        ].map(([label, value]) => (
          <section key={label} className="foundation-panel">
            <h2>{label}</h2>
            <p className="workspace-metric">{value}</p>
          </section>
        ))}
      </div>
      <section className="workspace-section">
        <h2>{c.merchants}</h2>
        <ul className="workspace-facts">
          {m.businesses.map((b) => (
            <li key={b.status}>
              {b.status}: {b._count}
            </li>
          ))}
        </ul>
        <Link href="/admin/businesses">{c.manage}</Link>
      </section>
      <section className="workspace-section">
        <h2>{volume}</h2>
        <p className="foundation-note">
          {locale === "fr"
            ? "Ce volume représente les paiements des vendeurs, pas le revenu de Bayou."
            : locale === "ht"
              ? "Volim sa a se peman machann yo, se pa revni Bayou."
              : "This represents merchant payments, not Bayou revenue."}
        </p>
        {m.payments.map((p) => (
          <p key={p.currency}>
            {p.amount} {p.currency} ({p.count})
          </p>
        ))}
        {!m.payments.length && <p>{c.noResults}</p>}
      </section>
      <section className="workspace-section">
        <h2>{c.operations}</h2>
        <ul>
          {m.fulfillments.map((f) => (
            <li key={f.state}>
              {c[f.state as "NEW"] || f.state}: {f._count}
            </li>
          ))}
        </ul>
        <Link href="/admin/orders">{c.manage}</Link>
      </section>
    </div>
  );
}
