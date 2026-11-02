import { OrderContact } from "@/components/business/OrderContact";
import { saveGuestDelivery, saveGuestRequest } from "@/actions/tracking";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { guestOrder } from "@/services/guest-orders";
import { orderAccessCookie } from "@/lib/order-access";
import { trackingCopy } from "@/lib/tracking-copy";
import { workspaceCopy } from "@/lib/workspace-copy";
import { Link } from "@/i18n/navigation";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function TrackedPurchase({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getLocale(),
    c = trackingCopy(locale),
    w = workspaceCopy(locale),
    id = (await params).id;
  let order;
  try {
    order = await guestOrder(
      id,
      (await cookies()).get(orderAccessCookie(id))?.value,
    );
  } catch {
    order = null;
  }
  if (!order)
    return (
      <div className="foundation-page">
        <p role="alert">{c.missing}</p>
        <Link href="/track">{c.title}</Link>
      </div>
    );
  return (
    <div className="foundation-page foundation-narrow">
      <header className="foundation-intro">
        <h1>{order.orderNumber}</h1>
        <p>
          {c.status}: {order.status}
        </p>
        <p>
          {order.payment?.status} · {order.payment?.currency}
        </p>
      </header>
      <section className="foundation-panel">
        <ul>
          {order.items.map((i) => (
            <li key={i.id}>
              {i.registryItem.title} × {i.quantity}
            </li>
          ))}
        </ul>
      </section>
      <OrderContact
        locale={locale}
        orderId={order.id}
        contact={order.contact}
        action={saveGuestDelivery}
        editable={
          ["PENDING", "PAID", "CONFIRMED"].includes(order.status) &&
          !order.fulfillments.some((f) => f.state !== "NEW")
        }
      />
      {order.payment?.status === "COMPLETED" &&
        [
          ...new Map(
            order.items
              .map((i) => {
                const b = i.product?.business || i.registryItem.business;
                return b ? ([b.id, b] as const) : null;
              })
              .filter(
                (v): v is readonly [string, { id: string; name: string }] =>
                  v !== null,
              ),
          ).values(),
        ].map((b) => {
          const request = order.refundRequests.find(
            (r) => r.businessId === b.id,
          );
          return (
            <section className="foundation-panel workspace-section" key={b.id}>
              <h2>{b.name}</h2>
              {request ? (
                <p>
                  {w.refunds}: {w[request.state as "REQUESTED"]}
                </p>
              ) : (
                <FoundationForm
                  action={saveGuestRequest}
                  locale={locale}
                  label={w.save}
                >
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="businessId" value={b.id} />
                  <input type="hidden" name="kind" value="REFUND" />
                  <label htmlFor={`reason-${b.id}`}>{w.reason}</label>
                  <textarea
                    id={`reason-${b.id}`}
                    name="reason"
                    required
                    minLength={5}
                    maxLength={1000}
                  />
                </FoundationForm>
              )}
              <p className="foundation-note">{w.refundNotice}</p>
            </section>
          );
        })}
      {order.fulfillments.map((f, n) => (
        <section className="foundation-panel workspace-section" key={n}>
          <h2>{f.business.name}</h2>
          <p>{w[f.state as "NEW"]}</p>
          <p>{f.instructions}</p>
        </section>
      ))}
      <Link href="/track">{c.title}</Link>
    </div>
  );
}
