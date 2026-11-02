import { requireBackoffice } from "@/services/backoffice-auth";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { workspaceCopy } from "@/lib/workspace-copy";
import { Link } from "@/i18n/navigation";
import { entityIdSchema } from "@/lib/validators/entity-id";
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  await requireBackoffice();
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    { after } = await searchParams;
  const cursor =
    after && entityIdSchema.safeParse(after).success
      ? await db.order.findUnique({
          where: { id: after },
          select: { id: true, createdAt: true },
        })
      : null;
  const rows = await db.order.findMany({
    where: cursor
      ? {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }
      : {},
    select: {
      id: true,
      orderNumber: true,
      status: true,
      createdAt: true,
      payment: { select: { status: true, currency: true } },
      _count: { select: { refundRequests: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
  });
  return (
    <div className="foundation-page">
      <h1>{c.orders}</h1>
      <div className="workspace-list">
        {rows.slice(0, 20).map((o) => (
          <article className="foundation-panel" key={o.id}>
            <h2>
              <Link href={`/admin/orders/${o.id}`}>{o.orderNumber}</Link>
            </h2>
            <p>
              {c.status}: {o.status}
            </p>
            <p>
              {o.payment?.currency} · {o.payment?.status}
            </p>
            <p>
              {c.refunds}: {o._count.refundRequests}
            </p>
          </article>
        ))}
      </div>
      {!rows.length && <p>{c.noResults}</p>}
      {rows.length > 20 && (
        <Link href={`/admin/orders?after=${rows[19].id}`}>{c.next}</Link>
      )}
    </div>
  );
}
