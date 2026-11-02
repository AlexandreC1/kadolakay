import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { BasketDetails } from "@/components/registry/BasketDetails";
import { PrivacyForm } from "@/components/registry/PrivacyForm";
import { workspaceCopy } from "@/lib/workspace-copy";
import { Link } from "@/i18n/navigation";
import { entityIdSchema } from "@/lib/validators/entity-id";
export default async function BasketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const parsed = entityIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const b = await db.registry.findFirst({
    where: {
      id: parsed.data,
      userId: session.user.id,
      kind: { in: ["BASKET_PERSONAL", "BASKET_SHARED"] },
      status: { not: "ARCHIVED" },
    },
    select: {
      id: true,
      title: true,
      recipientName: true,
      recipientMessage: true,
      kind: true,
      type: true,
      visibility: true,
      searchable: true,
      slug: true,
      status: true,
      _count: { select: { items: true } },
    },
  });
  if (!b) notFound();
  return (
    <div className="foundation-page">
      <Link href="/baskets">{c.baskets}</Link>
      <header className="workspace-heading">
        <h1>{b.title}</h1>
        <Link href={`/r/${b.slug}/edit`} className="foundation-primary">
          {c.editGifts} ({b._count.items})
        </Link>
      </header>
      <div className="workspace-columns">
        <section>
          <BasketDetails locale={locale} basket={b} />
        </section>
        <PrivacyForm locale={locale} registry={b} />
      </div>
      <p className="foundation-note">{c.privateHint}</p>
      {b.status === "PUBLISHED" && b.visibility !== "PRIVATE" && (
        <Link href={`/r/${b.slug}`}>{c.preview}</Link>
      )}
    </div>
  );
}
