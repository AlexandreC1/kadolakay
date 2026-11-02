import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isProtectedPublishedRegistry } from "@/services/registry";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { unlockList } from "@/actions/baskets";
import { workspaceCopy } from "@/lib/workspace-copy";
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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const registry = await getRegistryBySlug(slug);

  if (!registry) return { title: "Not Found" };

  return {
    title: registry.title,
    description: registry.description || `${registry.title} | Bayou`,
    openGraph: {
      title: registry.title,
      description: registry.description || undefined,
      images: [`/api/og/${registry.slug}`],
      type: "website",
      siteName: "Bayou",
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
    if (await isProtectedPublishedRegistry(slug)) {
      const c = workspaceCopy(locale);
      return (
        <div className="foundation-page foundation-narrow">
          <header className="foundation-intro">
            <h1>{c.unlock}</h1>
            <p>{c.protectedIntro}</p>
          </header>
          <FoundationForm action={unlockList} label={c.unlock} locale={locale}>
            <input type="hidden" name="slug" value={slug} />
            <label htmlFor="list-password">{c.password}</label>
            <input
              id="list-password"
              name="password"
              type="password"
              maxLength={128}
              required
              autoComplete="current-password"
            />
          </FoundationForm>
        </div>
      );
    }
    notFound();
  }

  const c = wishlistCopy(locale);
  let personalBuyer = false;
  if (registry.kind === "BASKET_PERSONAL") {
    const session = await auth();
    personalBuyer = Boolean(
      session?.user?.id &&
        (await db.registry.findFirst({
          where: { id: registry.id, userId: session.user.id },
          select: { id: true },
        })),
    );
  }
  const t = await getTranslations("registry");
  const registryUrl = registryShareUrl(
    registry.slug,
    locale,
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  );
  return (
    <div className="wishlist-page" data-palette={registry.palette}>
      <section className="wishlist-hero" aria-labelledby="wishlist-title">
        <div className="wishlist-introduction">
          <p className="wishlist-eyebrow">{c.eyebrow}</p>
          <div className="wishlist-occasion">
            <span>{occasionLabel(registry.type, locale)}</span>
            {registry.eventDate && (
              <time dateTime={registry.eventDate.toISOString()}>
                {formatEventDate(registry.eventDate, locale)}
              </time>
            )}
          </div>
          <h1 id="wishlist-title">{registry.title}</h1>
          {registry.recipientName && (
            <p className="wishlist-description">
              {workspaceCopy(locale).recipient}: {registry.recipientName}
            </p>
          )}
          {registry.recipientMessage && (
            <p className="wishlist-description">{registry.recipientMessage}</p>
          )}
          {registry.kind === "BASKET_PERSONAL" && (
            <p className="foundation-note">
              {locale === "fr"
                ? "La personne qui a créé ce panier achètera les cadeaux."
                : locale === "ht"
                  ? "Se moun ki kreye panyen an k ap achte kado yo."
                  : "The creator of this basket will buy the gifts."}
            </p>
          )}
          {registry.description && (
            <p className="wishlist-description">{registry.description}</p>
          )}
          {registry.user?.name && (
            <p className="wishlist-owner">{registry.user.name}</p>
          )}
          <div className="wishlist-share">
            <RegistryShareButton
              url={registryUrl}
              title={registry.title}
              slug={registry.slug}
            />
          </div>
        </div>
        <RegistryProgress items={registry.items} locale={locale} />
      </section>
      {registry.amazonWishlistUrl && (
        <div className="wishlist-external">
          <a
            href={registry.amazonWishlistUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("amazonWishlist")}
          </a>
        </div>
      )}
      <WishlistGallery
        items={registry.items}
        locale={locale}
        paymentAvailable={
          stripeCheckoutAvailable() &&
          (registry.kind !== "BASKET_PERSONAL" || personalBuyer)
        }
      />
    </div>
  );
}
