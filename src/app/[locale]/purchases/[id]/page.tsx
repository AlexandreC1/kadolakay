import { OrderContact } from "@/components/business/OrderContact";
import { readOrderContact } from "@/services/order-contact";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { redirect, notFound } from "next/navigation";
import { workspaceCopy } from "@/lib/workspace-copy";
import { entityIdSchema } from "@/lib/validators/entity-id";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { saveOrderRequest } from "@/actions/workspaces";
import { Link } from "@/i18n/navigation";
export default async function PurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const id = entityIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const order = await db.order.findFirst({
    where: { id: id.data, buyerId: session.user.id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      payment: { select: { status: true, currency: true } },
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
        },
      },
    },
  });
  if (!order) notFound();
  const contact = await readOrderContact(session.user.id, order.id, "BUYER");
  const businesses = [
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
  ];
  return (
    <div className="foundation-page">
      <Link href="/purchases">{c.orders}</Link>
      <header className="foundation-intro">
        <h1>{order.orderNumber}</h1>
        <p>
          {c.status}: {order.status}
        </p>
      </header>
      <OrderContact
        locale={locale}
        orderId={order.id}
        contact={contact}
        editable={
          ["PENDING", "PAID", "CONFIRMED"].includes(order.status) &&
          !order.fulfillments.some((f) => f.state !== "NEW")
        }
      />
      {businesses.map((b) => {
        const fulfillment = order.fulfillments.find(
            (f) => f.businessId === b.id,
          ),
          request = order.refundRequests.find((r) => r.businessId === b.id);
        return (
          <section className="foundation-panel workspace-section" key={b.id}>
            <h2>{b.name}</h2>
            <ul>
              {order.items
                .filter(
                  (i) =>
                    (i.product?.business || i.registryItem.business)?.id ===
                    b.id,
                )
                .map((i) => (
                  <li key={i.id}>
                    {i.registryItem.title} × {i.quantity}
                  </li>
                ))}
            </ul>
            <p>
              {c.status}: {c[(fulfillment?.state || "NEW") as "NEW"]}
            </p>
            {fulfillment?.instructions && <p>{fulfillment.instructions}</p>}
            {request ? (
              <>
                <p>
                  {c.refunds}: {c[request.state as "REQUESTED"]}
                </p>
                <p>{request.reason}</p>
                <p className="foundation-note">{c.refundNotice}</p>
              </>
            ) : (
              order.payment?.status === "COMPLETED" && (
                <FoundationForm
                  action={saveOrderRequest}
                  label={c.save}
                  locale={locale}
                >
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="businessId" value={b.id} />
                  <label htmlFor={`request-kind-${b.id}`}>{c.refunds}</label>
                  <select id={`request-kind-${b.id}`} name="kind">
                    <option value="REFUND">{c.requestRefund}</option>
                    {!["SHIPPED", "DELIVERED"].includes(
                      fulfillment?.state || "",
                    ) && (
                      <option value="CANCELLATION">
                        {c.requestCancellation}
                      </option>
                    )}
                  </select>
                  <label htmlFor={`reason-${b.id}`}>{c.reason}</label>
                  <textarea
                    id={`reason-${b.id}`}
                    name="reason"
                    required
                    minLength={5}
                    maxLength={1000}
                    rows={3}
                  />
                  <p className="foundation-note">{c.refundNotice}</p>
                </FoundationForm>
              )
            )}
          </section>
        );
      })}
    </div>
  );
}
