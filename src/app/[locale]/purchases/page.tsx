import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { workspaceCopy } from "@/lib/workspace-copy";
import { buyerPurchases } from "@/services/order-reads";
import { Link } from "@/i18n/navigation";
export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    session = await auth();
  if (!session?.user?.id)
    redirect(
      `/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/purchases`)}`,
    );
  let result: Awaited<ReturnType<typeof buyerPurchases>> | null = null;
  try {
    result = await buyerPurchases(session.user.id, (await searchParams).after);
  } catch {
    /* Keep invalid cursor input bounded. */
  }
  return (
    <div className="foundation-page">
      <header className="foundation-intro">
        <h1>
          {locale === "fr"
            ? "Mes achats"
            : locale === "ht"
              ? "Acha mwen yo"
              : "My purchases"}
        </h1>
      </header>
      <div className="workspace-list">
        {result?.items.map((o) => (
          <article key={o.id} className="foundation-panel">
            <h2>
              <Link href={`/purchases/${o.id}`}>{o.orderNumber}</Link>
            </h2>
            <p>
              {c.status}: {o.status}
            </p>
            <time dateTime={o.createdAt.toISOString()}>
              {o.createdAt.toISOString().slice(0, 10)}
            </time>
          </article>
        ))}
      </div>
      {!result?.items.length && <p>{c.noResults}</p>}
      {result?.next && (
        <Link href={`/purchases?after=${result.next}`}>{c.next}</Link>
      )}
    </div>
  );
}
