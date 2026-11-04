import { OrderContact } from "@/components/business/OrderContact";
import { readOrderContact } from "@/services/order-contact";
import { requireBackoffice } from "@/services/backoffice-auth";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { workspaceCopy } from "@/lib/workspace-copy";
import { OrderOperationPanel } from "@/components/business/OrderOperationPanel";
import { entityIdSchema } from "@/lib/validators/entity-id";
export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireBackoffice();
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    id = entityIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const o = await db.order.findUnique({
    where: { id: id.data },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      payment: {
        select: { status: true, currency: true, provider: true, paidAt: true },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          priceUSD: true,
          priceHTG: true,
          product: {
            select: { business: { select: { id: true, name: true } } },
          },
          registryItem: {
            select: {
              title: true,
              business: { select: { id: true, name: true } },
            },
          },
        },
        take: 20,
      },
      fulfillments: {
        select: {
          businessId: true,
          state: true,
          method: true,
          instructions: true,
        },
      },
      refundRequests: {
        select: {
          id: true,
          businessId: true,
          state: true,
          kind: true,
          reason: true,
          refundMethod: true,
          refundReference: true,
          refundedAt: true,
        },
      },
    },
  });
  if (!o) notFound();
  const contact = await readOrderContact(actor.id, o.id, "ADMIN");
  const businesses = [
    ...new Map(
      o.items
        .map((i) => {
          const b = i.product?.business || i.registryItem.business;
          return b ? ([b.id, b] as const) : null;
        })
        .filter(
          (v): v is readonly [string, { id: string; name: string }] =>
            v !== null,
        ),
    ).values(),
  ];
  return (
    <div className="foundation-page">
      <header className="foundation-intro">
        <h1>{o.orderNumber}</h1>
        <p>
          {c.status}: {o.status}
        </p>
        <p>
          {o.payment?.provider} · {o.payment?.currency} · {o.payment?.status}
        </p>
      </header>
      <OrderContact locale={locale} orderId={o.id} contact={contact} />
      {businesses.map((b) => (
        <section className="foundation-panel workspace-section" key={b.id}>
          <h2>{b.name}</h2>
          <ul>
            {o.items
              .filter(
                (i) =>
                  (i.product?.business || i.registryItem.business)?.id === b.id,
              )
              .map((i) => (
                <li key={i.id}>
                  {i.registryItem.title} × {i.quantity}
                </li>
              ))}
          </ul>
          {o.payment?.status === "COMPLETED" ? (
            <OrderOperationPanel
              locale={locale}
              orderId={o.id}
              businessId={b.id}
              current={
                o.fulfillments.find((f) => f.businessId === b.id) || null
              }
              request={
                o.refundRequests.find((r) => r.businessId === b.id) || null
              }
              override
              canFulfill={[
                "PAID",
                "CONFIRMED",
                "SHIPPED",
                "DELIVERED",
              ].includes(o.status)}
            />
          ) : (
            <p>{c.paidOnly}</p>
          )}
        </section>
      ))}
      <p className="foundation-note">{c.refundNotice}</p>
    </div>
  );
}
