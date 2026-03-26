import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AdminBusinessList } from "./AdminBusinessList";

export default async function AdminBusinessesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check admin role
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const businesses = await db.business.findMany({
    include: {
      owner: { select: { name: true, email: true } },
      _count: { select: { products: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Admin: Business Review
      </h1>

      <AdminBusinessList
        businesses={businesses.map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          category: b.category,
          city: b.city,
          status: b.status,
          ownerName: b.owner.name,
          ownerEmail: b.owner.email,
          productCount: b._count.products,
          createdAt: b.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
