import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { findPublicBusiness } from "@/services/catalog";
import { catalogCopy } from "@/lib/catalog-copy";
import { guestCopy } from "@/lib/guest-copy";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { GiftArt } from "@/components/shared/GiftArt";
import { PageTransition } from "@/components/shared/PageTransition";
import guest from "@/components/guest/guest.module.css";
import styles from "./shop.module.css";

export default async function BusinessStorefront({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const business = await findPublicBusiness(slug);
  if (!business) notFound();
  const t = catalogCopy(locale), g = guestCopy(locale);
  const categories = await getTranslations("business.categories");
  const category = business.category && categories.has(business.category) ? categories(business.category) : business.category;
  const place = [business.city, business.department].filter(Boolean).join(", ");
  const preferred = locale === "ht" ? "HTG" : "USD";
  return (
    <PageTransition>
      <div className={guest.page}>
        <Link href="/browse" className={styles.back} transitionTypes={["nav-back"]}>
          {g.allShops}
        </Link>
        <header className={styles.hero} data-cover={business.coverUrl ? "" : undefined}>
          {business.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.cover} src={business.coverUrl} alt="" />
          )}
          <div className={styles.heroText}>
            {business.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.logo} src={business.logoUrl} alt="" width={72} height={72} />
            )}
            <div className={styles.facts}>
              {category && <span>{category}</span>}
              {place && (
                <span>
                  <MapPin size={15} strokeWidth={1.9} aria-hidden="true" />
                  {place}
                </span>
              )}
            </div>
            <h1 className={guest.title}>{business.name}</h1>
            {business.description && <p className={styles.description}>{business.description}</p>}
          </div>
        </header>
        <section className={styles.gifts} aria-labelledby="shop-gifts">
          <div className={guest.resultsHead}>
            <h2 id="shop-gifts">{g.giftsHere}</h2>
            <p>{g.giftCount(business.products.length)}</p>
          </div>
          {!business.products.length ? (
            <div className={guest.empty}>
              <p>{t.empty}</p>
            </div>
          ) : (
            <ul className={guest.tiles}>
              {business.products.map((product, i) => (
                <li key={product.id} className={styles.item} style={{ ["--i" as string]: Math.min(i, 12) }}>
                  <Link href={`/gifts/${product.id}`} className={guest.tile} transitionTypes={["nav-forward"]}>
                    <GiftArt id={product.id} name={product.name} imageUrl={product.imageUrl} />
                    {product.imageUrl && <span className={guest.tileName}>{product.name}</span>}
                    <CurrencyDisplay
                      priceHTG={product.priceHTG == null ? null : Number(product.priceHTG)}
                      priceUSD={product.priceUSD == null ? null : Number(product.priceUSD)}
                      preferred={preferred}
                      className={guest.tilePrice}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
