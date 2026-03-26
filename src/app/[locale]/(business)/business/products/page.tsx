import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { ProductList } from "./ProductList";

export default async function BusinessProductsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/business/products");
  }

  const business = await db.business.findUnique({
    where: { ownerId: session.user.id },
    include: {
      products: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!business) {
    redirect("/business/signup");
  }

  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {t("business.products")}
      </h1>

      <ProductList
        businessId={business.id}
        products={business.products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          priceHTG: p.priceHTG ? Number(p.priceHTG) : null,
          priceUSD: p.priceUSD ? Number(p.priceUSD) : null,
          imageUrl: p.imageUrl,
          inStock: p.inStock,
          category: p.category,
        }))}
      />
    </div>
  );
}
