import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { CheckoutForm } from "./CheckoutForm";

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ items?: string }>;
}

export default async function CheckoutPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, locale } = await params;
  const { items: itemIds } = await searchParams;

  const registry = await db.registry.findUnique({
    where: { slug },
    include: {
      items: {
        where: {
          status: { not: "FULFILLED" },
          ...(itemIds
            ? { id: { in: itemIds.split(",") } }
            : {}),
        },
        include: {
          business: { select: { name: true } },
        },
      },
    },
  });

  if (!registry || registry.status !== "PUBLISHED") {
    notFound();
  }

  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {t("checkout.buyGift")}
      </h1>
      <p className="text-gray-600 mb-8">{registry.title}</p>

      <CheckoutForm
        registrySlug={registry.slug}
        items={registry.items.map((item) => ({
          id: item.id,
          title: item.title,
          priceHTG: item.priceHTG ? Number(item.priceHTG) : null,
          priceUSD: item.priceUSD ? Number(item.priceUSD) : null,
          quantity: item.quantity - item.fulfilledQty,
          source: item.source,
          externalUrl: item.externalUrl,
          imageUrl: item.imageUrl,
          businessName: item.business?.name || null,
        }))}
        locale={locale}
      />
    </div>
  );
}
