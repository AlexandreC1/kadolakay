import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getRegistryBySlug } from "@/actions/registry";
import { wishlistCopy } from "@/lib/wishlist-copy";
import { RegistryShareButton } from "./RegistryShareButton";
import { WishlistGallery } from "./WishlistGallery";
import { RegistryProgress } from "@/components/registry/RegistryProgress";
import { stripeCheckoutAvailable } from "@/services/checkout";
import { formatEventDate } from "@/lib/event-date";
import { registryShareUrl } from "@/lib/registry-share-url";
import { occasionLabel } from "@/lib/occasions";

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

export default async function RegistryPage({ params }: PageProps) {
  const { slug, locale } = await params;
  const registry = await getRegistryBySlug(slug);

  if (!registry || registry.status === "DRAFT") {
    notFound();
  }

  const c = wishlistCopy(locale);
  const t = await getTranslations("registry");
  const registryUrl = registryShareUrl(registry.slug, locale, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  return <div className="wishlist-page">
    <section className="wishlist-hero" aria-labelledby="wishlist-title">
      <div className="wishlist-introduction">
        <p className="wishlist-eyebrow">{c.eyebrow}</p>
        <div className="wishlist-occasion"><span>{occasionLabel(registry.type, locale)}</span>{registry.eventDate && <time dateTime={registry.eventDate.toISOString()}>{formatEventDate(registry.eventDate, locale)}</time>}</div>
        <h1 id="wishlist-title">{registry.title}</h1>
        {registry.description && <p className="wishlist-description">{registry.description}</p>}
        {registry.user?.name && <p className="wishlist-owner">{registry.user.name}</p>}
        <div className="wishlist-share"><RegistryShareButton url={registryUrl} title={registry.title} slug={registry.slug} /></div>
      </div>
      <RegistryProgress items={registry.items} locale={locale} />
    </section>
    {registry.amazonWishlistUrl && <div className="wishlist-external"><a href={registry.amazonWishlistUrl} target="_blank" rel="noopener noreferrer">{t("amazonWishlist")}</a></div>}
    <WishlistGallery items={registry.items} locale={locale} paymentAvailable={stripeCheckoutAvailable()} />
  </div>;
}
