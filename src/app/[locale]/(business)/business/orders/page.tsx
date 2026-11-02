import { contactCopy } from "@/lib/contact-copy";
import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { workspaceCopy } from "@/lib/workspace-copy";
import { merchantOrders } from "@/services/order-reads";
import { OrderOperationPanel } from "@/components/business/OrderOperationPanel";
import { Link } from "@/i18n/navigation";
export default async function MerchantOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const result = await merchantOrders(
    session.user.id,
    (await searchParams).after,
  );
  if (!result) redirect(`/${locale}/business/signup`);
  return (
    <div className="foundation-page">
      <header className="foundation-intro">
        <h1>{c.operations}</h1>
        <p>{c.merchantOnly}</p>
      </header>
      <div className="workspace-list">
        {result.items.map((o) => (
          <article className="foundation-panel" key={o.id}>
            <h2>{o.orderNumber}</h2>
            <Link href={`/business/orders/${o.id}`}>
              {contactCopy(locale).view}
            </Link>
            <time dateTime={o.createdAt.toISOString()}>
              {o.createdAt.toISOString().slice(0, 10)}
            </time>
            <ul>
              {o.items.map((i) => (
                <li key={i.id}>
                  {i.registryItem.title} × {i.quantity}
                </li>
              ))}
            </ul>
            <OrderOperationPanel
              locale={locale}
              orderId={o.id}
              businessId={result.business.id}
              current={o.fulfillments[0] || null}
              request={o.refundRequests[0] || null}
              canFulfill={[
                "PAID",
                "CONFIRMED",
                "SHIPPED",
                "DELIVERED",
              ].includes(o.status)}
            />
          </article>
        ))}
      </div>
      {!result.items.length && <p>{c.noResults}</p>}
      {result.next && (
        <Link href={`/business/orders?after=${result.next}`}>{c.next}</Link>
      )}
    </div>
  );
}
