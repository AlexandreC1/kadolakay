import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getRegistryBySlug } from "@/actions/registry";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { RegistryShareButton } from "./RegistryShareButton";
import { RegistryItemCard } from "./RegistryItemCard";

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const registry = await getRegistryBySlug(slug);

  if (!registry) return { title: "Not Found" };

  return {
    title: registry.title,
    description: registry.description || `${registry.title} | KadoLakay`,
    openGraph: {
      title: registry.title,
      description: registry.description || undefined,
      images: [`/api/og/${registry.slug}`],
      type: "website",
      siteName: "KadoLakay",
    },
    twitter: {
      card: "summary_large_image",
      title: registry.title,
      images: [`/api/og/${registry.slug}`],
    },
  };
}

const registryTypeLabels: Record<string, Record<string, string>> = {
  BABY_SHOWER: { ht: "Fèt Ti Bebe", fr: "Baby Shower", en: "Baby Shower" },
  WEDDING: { ht: "Maryaj", fr: "Mariage", en: "Wedding" },
  BIRTHDAY: { ht: "Fèt Anivesè", fr: "Anniversaire", en: "Birthday" },
};

export default async function RegistryPage({ params }: PageProps) {
  const { slug, locale } = await params;
  const registry = await getRegistryBySlug(slug);

  if (!registry || registry.status === "DRAFT") {
    notFound();
  }

  const t = await getTranslations("registry");
  const totalItems = registry.items.length;
  const fulfilledItems = registry.items.filter(
    (item) => item.status === "FULFILLED"
  ).length;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const registryUrl = `${appUrl}/r/${registry.slug}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-block rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-sm font-medium mb-4">
          {registryTypeLabels[registry.type]?.[locale] || registry.type}
        </span>

        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          {registry.title}
        </h1>

        {registry.description && (
          <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
            {registry.description}
          </p>
        )}

        {registry.eventDate && (
          <p className="mt-2 text-sm text-gray-500">
            {new Date(registry.eventDate).toLocaleDateString(
              locale === "ht" ? "fr-HT" : locale === "fr" ? "fr-FR" : "en-US",
              { year: "numeric", month: "long", day: "numeric" }
            )}
          </p>
        )}

        {registry.user && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {registry.user.image && (
              <img
                src={registry.user.image}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            )}
            <span className="text-sm text-gray-500">
              {registry.user.name}
            </span>
          </div>
        )}

        {/* Progress bar */}
        {totalItems > 0 && (
          <div className="mt-6 max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>
                {t("giftCount", {
                  count: fulfilledItems,
                  total: totalItems,
                })}
              </span>
              <span>
                {Math.round((fulfilledItems / totalItems) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{
                  width: `${(fulfilledItems / totalItems) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Share button */}
        <div className="mt-6">
          <RegistryShareButton url={registryUrl} title={registry.title} />
        </div>
      </div>

      {/* Amazon wishlist link */}
      {registry.amazonWishlistUrl && (
        <div className="mb-8 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <p className="font-medium text-gray-900">
                {t("amazonWishlist")}
              </p>
              <a
                href={registry.amazonWishlistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                {registry.amazonWishlistUrl}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Items grid */}
      {registry.items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {registry.items.map((item) => (
            <RegistryItemCard key={item.id} item={item} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>{t("noItems")}</p>
        </div>
      )}
    </div>
  );
}
