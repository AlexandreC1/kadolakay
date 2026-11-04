import { Link } from "@/i18n/navigation";
import { homeCopy } from "@/lib/home-copy";
import { listShelfProducts } from "@/services/catalog";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { ShelfScroller } from "./ShelfScroller";
import { GiftArt } from "@/components/shared/GiftArt";
import styles from "./home.module.css";

/** Real, in-stock gifts from approved shops. Shows an honest empty state when there are none. */
export async function GiftShelf({ locale }: { locale: string }) {
  const c = homeCopy(locale);
  let products: Awaited<ReturnType<typeof listShelfProducts>> = [];
  let failed = false;
  try {
    products = await listShelfProducts();
  } catch {
    failed = true;
  }
  return (
    <section className={styles.shelf} aria-labelledby="shelf-title">
      <div className={styles.shelfHead}>
        <div>
          <h2 id="shelf-title">{c.shelfTitle}</h2>
          <p>{c.shelfIntro}</p>
        </div>
        {/* One "see all": shops and budget ideas already have their own shortcuts above. */}
        <Link href="/discover" className={styles.shelfLinks}>
          {c.seeAll}
        </Link>
      </div>
      {failed ? (
        <p className={styles.shelfEmpty} role="status">{c.failed}</p>
      ) : !products.length ? (
        <div className={styles.shelfEmpty}>
          <p>{c.shelfEmpty}</p>
          <Link href="/business">{c.merchantCta}</Link>
        </div>
      ) : (
        <ShelfScroller labels={{ prev: c.shelfPrev, next: c.shelfNext, region: c.shelfTitle }}>
          {products.map((p) => (
            <li key={p.id} className={styles.tile}>
              <Link href={`/gifts/${p.id}`} className={styles.tileLink} transitionTypes={["nav-forward"]}>
                <GiftArt id={p.id} name={p.name} imageUrl={p.imageUrl} square />
                {p.imageUrl ? <span className={styles.tileName}>{p.name}</span> : null}
                <span className={styles.tileShop}>
                  {p.shop.name}
                  {p.shop.city ? <span>{p.shop.city}</span> : null}
                </span>
                <CurrencyDisplay priceHTG={p.priceHTG} priceUSD={p.priceUSD} preferred={locale === "ht" ? "HTG" : "USD"} className={styles.tilePrice} />
              </Link>
            </li>
          ))}
        </ShelfScroller>
      )}
    </section>
  );
}
