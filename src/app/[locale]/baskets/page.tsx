import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { workspaceCopy } from "@/lib/workspace-copy";
import { entityIdSchema } from "@/lib/validators/entity-id";
export default async function BasketsPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    session = await auth();
  if (!session?.user?.id)
    redirect(
      `/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/baskets`)}`,
    );
  const { after } = await searchParams;
  const cursor =
    after && entityIdSchema.safeParse(after).success
      ? await db.registry.findFirst({
          where: { id: after, userId: session.user.id },
          select: { id: true, updatedAt: true },
        })
      : null;
  const rows = await db.registry.findMany({
    where: {
      userId: session.user.id,
      kind: { in: ["BASKET_PERSONAL", "BASKET_SHARED"] },
      status: { not: "ARCHIVED" },
      ...(cursor
        ? {
            OR: [
              { updatedAt: { lt: cursor.updatedAt } },
              { updatedAt: cursor.updatedAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      recipientName: true,
      kind: true,
      visibility: true,
      status: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 21,
  });
  return (
    <div className="foundation-page">
      <header className="workspace-heading">
        <div>
          <h1>{c.baskets}</h1>
          <p>{c.basketIntro}</p>
        </div>
        <Link className="foundation-primary" href="/baskets/new">
          {c.createBasket}
        </Link>
      </header>
      <div className="workspace-list">
        {rows.slice(0, 20).map((b) => (
          <article className="foundation-panel" key={b.id}>
            <h2>
              <Link href={`/baskets/${b.id}`}>{b.title}</Link>
            </h2>
            <p>{b.recipientName}</p>
            <p>{b.kind === "BASKET_PERSONAL" ? c.personal : c.shared}</p>
            <p>
              {b.visibility === "PRIVATE"
                ? c.PRIVATE
                : c[b.visibility as "PUBLIC" | "UNLISTED" | "PROTECTED"]}
            </p>
          </article>
        ))}
      </div>
      {!rows.length && <p>{c.empty}</p>}
      {rows.length > 20 && (
        <Link href={`/baskets?after=${rows[19].id}`}>{c.next}</Link>
      )}
    </div>
  );
}
