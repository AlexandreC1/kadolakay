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
import { daysUntil, listCopy, wishlistCopy } from "@/lib/wishlist-copy";
import { RegistryShareButton } from "./RegistryShareButton";
import { WishlistGallery } from "./WishlistGallery";
import { strandsFor, WovenProgress } from "@/components/registry/WovenProgress";
import { PageTransition } from "@/components/shared/PageTransition";
import { giftQuantities, registryProgress } from "@/lib/registry-progress";
import styles from "./list.module.css";
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
  const l = listCopy(locale);
  const registryUrl = registryShareUrl(
    registry.slug,
    locale,
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  );
  const progress = registryProgress(registry.items);
  const strands = strandsFor(
    registry.items.map((item) => {
      const q = giftQuantities(item);
      return { quantity: q.requested, fulfilledQty: q.confirmed, reservedQty: q.held };
    }),
  );
  const days = registry.eventDate ? daysUntil(registry.eventDate) : null;
  return (
    <PageTransition>
      <div className={styles.page} data-palette={registry.palette}>
        <section className={styles.hero} aria-labelledby="wishlist-title">
          <div className={styles.heroMain}>
            <p className={styles.occasion}>
              <span>{occasionLabel(registry.type, locale)}</span>
              {registry.eventDate && (
                <time dateTime={registry.eventDate.toISOString()}>
                  {formatEventDate(registry.eventDate, locale)}
                </time>
              )}
              {days != null && <span className={styles.countdown} data-past={days < 0 || undefined}>{l.countdown(days)}</span>}
            </p>
            <h1 id="wishlist-title" className={styles.title}>{registry.title}</h1>
            {registry.user?.name && <p className={styles.owner}>{l.owner(registry.user.name)}</p>}
            {registry.recipientName && (
              <p className={styles.text}>
                {workspaceCopy(locale).recipient}: {registry.recipientName}
              </p>
            )}
            {registry.recipientMessage && <blockquote className={styles.message}>{registry.recipientMessage}</blockquote>}
            {registry.description && <p className={styles.text}>{registry.description}</p>}
            {registry.kind === "BASKET_PERSONAL" && (
              <p className={styles.text}>
                {locale === "fr"
                  ? "La personne qui a créé ce panier achètera les cadeaux."
                  : locale === "ht"
                    ? "Se moun ki kreye panyen an k ap achte kado yo."
                    : "The creator of this basket will buy the gifts."}
              </p>
            )}
            <div className={styles.actions}>
              <RegistryShareButton url={registryUrl} title={registry.title} slug={registry.slug} label={l.share} />
              {registry.amazonWishlistUrl && (
                <a className={styles.secondary} href={registry.amazonWishlistUrl} target="_blank" rel="noopener noreferrer">
                  {t("amazonWishlist")}
                </a>
              )}
            </div>
          </div>
          <aside className={styles.progress} aria-label={c.progress}>
            <WovenProgress strands={strands} label={l.weave(progress.confirmed, progress.requested)} size="large" />
            <p className={styles.progressSummary}>{l.summary(progress.confirmed, progress.requested)}</p>
            <dl className={styles.progressFacts}>
              <div>
                <dt>{c.available}</dt>
                <dd>{progress.available}</dd>
              </div>
              <div>
                <dt>{c.held}</dt>
                <dd>{progress.held}</dd>
              </div>
              <div>
                <dt>{c.confirmed}</dt>
                <dd>{progress.confirmed}</dd>
              </div>
            </dl>
            {progress.held > 0 && <p className={styles.progressNote}>{l.heldNote(progress.held)} {c.progressNote}</p>}
          </aside>
        </section>
        <WishlistGallery
          items={registry.items}
          locale={locale}
          paymentAvailable={
            stripeCheckoutAvailable() &&
            (registry.kind !== "BASKET_PERSONAL" || personalBuyer)
          }
        />
      </div>
    </PageTransition>
  );
}
