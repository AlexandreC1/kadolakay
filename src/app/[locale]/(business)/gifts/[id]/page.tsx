import { notFound } from "next/navigation";
import { Check, CircleSlash, MapPin, Truck } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { findPublicBusiness, findPublicProduct } from "@/services/catalog";
import { Link } from "@/i18n/navigation";
import { catalogCopy, giftPageCopy } from "@/lib/catalog-copy";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { GiftArt } from "@/components/shared/GiftArt";
import { PageTransition } from "@/components/shared/PageTransition";
import { AddCatalogGift } from "@/components/registry/AddCatalogGift";
import { GiftPhotos } from "./GiftPhotos";
import styles from "./gift.module.css";

export default async function GiftPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const product = await findPublicProduct(id);
  if (!product) notFound();
  const t = catalogCopy(locale), g = giftPageCopy(locale);
  const session = await auth();
  const [registries, shop] = await Promise.all([
    session?.user?.id
      ? db.registry.findMany({
          where: { userId: session.user.id, status: { not: "ARCHIVED" } },
          select: { id: true, title: true },
          take: 50,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    findPublicBusiness(product.business.slug),
  ]);
  const more = (shop?.products ?? []).filter((p) => p.id !== product.id && p.inStock).slice(0, 4);
  const preferred = locale === "ht" ? "HTG" : "USD";
  return (
    <PageTransition>
      <div className={styles.page}>
        <article className={styles.detail}>
          <GiftPhotos
            id={product.id}
            name={product.name}
            cover={product.imageUrl}
            media={product.media}
            locale={locale}
          />
          <div className={styles.info}>
            <Link className={styles.shop} href={`/businesses/${product.business.slug}`} transitionTypes={["nav-forward"]}>
              {g.fromShop} {product.business.name}
              {product.business.city && (
                <span>
                  <MapPin size={14} strokeWidth={1.9} aria-hidden="true" />
                  {product.business.city}
                </span>
              )}
            </Link>
            <h1 className={styles.title}>{product.name}</h1>
            <div className={styles.priceRow}>
              <CurrencyDisplay priceHTG={product.priceHTG} priceUSD={product.priceUSD} preferred={preferred} className={styles.price} />
              <span className={styles.stock} data-in={product.inStock || undefined}>
                {product.inStock ? <Check size={15} strokeWidth={2.4} aria-hidden="true" /> : <CircleSlash size={15} strokeWidth={2} aria-hidden="true" />}
                {product.inStock ? t.available : t.unavailable}
              </span>
            </div>
            {product.description && <p className={styles.description}>{product.description}</p>}
            {product.business.fulfillmentPolicy && (
              <section className={styles.policy} aria-labelledby="gift-policy">
                <h2 id="gift-policy">
                  <Truck size={18} strokeWidth={1.8} aria-hidden="true" />
                  {g.policy}
                </h2>
                <p>{product.business.fulfillmentPolicy}</p>
              </section>
            )}
            {product.inStock && (
              <section className={styles.add} aria-labelledby="gift-add">
                {session?.user ? (
                  <>
                    <h2 id="gift-add">{g.addTitle}</h2>
                    <p>{g.addIntro}</p>
                    {registries.length ? (
                      <AddCatalogGift productId={product.id} registries={registries} />
                    ) : (
                      <Link className={styles.primary} href="/create">
                        {t.create}
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <h2 id="gift-add">{g.guestTitle}</h2>
                    <p>{g.guestIntro}</p>
                    <div className={styles.addActions}>
                      <Link className={styles.primary} href={`/login?callbackUrl=${encodeURIComponent(`/${locale}/gifts/${product.id}`)}`}>
                        {t.signIn}
                      </Link>
                      <Link className={styles.secondary} href="/find">
                        {g.findList}
                      </Link>
                    </div>
                  </>
                )}
              </section>
            )}
            <p className={styles.terms}>{t.terms}</p>
          </div>
        </article>
        {more.length > 0 && (
          <section className={styles.more} aria-labelledby="gift-more">
            <div className={styles.moreHead}>
              <h2 id="gift-more">{g.moreFromShop}</h2>
              <Link href={`/businesses/${product.business.slug}`} transitionTypes={["nav-forward"]}>
                {g.seeShop}
              </Link>
            </div>
            <ul className={styles.moreGrid}>
              {more.map((p) => (
                <li key={p.id}>
                  <Link href={`/gifts/${p.id}`} className={styles.moreLink} transitionTypes={["nav-forward"]}>
                    <GiftArt id={p.id} name={p.name} imageUrl={p.imageUrl} />
                    {p.imageUrl && <span className={styles.moreName}>{p.name}</span>}
                    <CurrencyDisplay
                      priceHTG={p.priceHTG == null ? null : Number(p.priceHTG)}
                      priceUSD={p.priceUSD == null ? null : Number(p.priceUSD)}
                      preferred={preferred}
                      className={styles.morePrice}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageTransition>
  );
}
