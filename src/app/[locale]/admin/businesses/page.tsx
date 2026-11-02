import { requireBackoffice } from "@/services/backoffice-auth";
import { Link } from "@/i18n/navigation";
import { workspaceCopy } from "@/lib/workspace-copy";
import { getLocale } from "next-intl/server";
import { entityIdSchema } from "@/lib/validators/entity-id";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AdminBusinessList } from "./AdminBusinessList";
import { isAdministrator } from "@/services/permissions";

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  await requireBackoffice();
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check admin role
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!isAdministrator(user?.role)) {
    redirect("/dashboard");
  }

  const locale = await getLocale(),
    raw = (await searchParams).after,
    after = entityIdSchema.safeParse(raw);
  const businesses = await db.business.findMany({
    where: after.success ? { id: { gt: after.data } } : {},
    take: 31,
    include: {
      owner: { select: { name: true, email: true } },
      _count: { select: { products: true } },
    },
    orderBy: { id: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Admin: Business Review
      </h1>

      <AdminBusinessList
        businesses={businesses.slice(0, 30).map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          category: b.category,
          patenteNumber: b.patenteNumber,
          city: b.city,
          status: b.status,
          ownerName: b.owner.name,
          ownerEmail: b.owner.email,
          productCount: b._count.products,
          createdAt: b.createdAt.toISOString(),
        }))}
      />
      {businesses.length > 30 && (
        <Link href={`/admin/businesses?after=${businesses[29].id}`}>
          {workspaceCopy(locale).next}
        </Link>
      )}
    </div>
  );
}
