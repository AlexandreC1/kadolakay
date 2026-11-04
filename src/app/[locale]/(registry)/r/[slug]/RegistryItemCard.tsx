"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, Clock, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { GiftArt } from "@/components/shared/GiftArt";
import { nativeGiftCopy } from "@/lib/catalog-copy";
import { giftQuantities, giftState } from "@/lib/registry-progress";
import { listCopy, wishlistCopy } from "@/lib/wishlist-copy";
import styles from "./list.module.css";

export interface RegistryItemCardProps {
  item: { id: string; title: string; description: string | null; imageUrl: string | null; priceHTG: unknown; priceUSD: unknown; quantity: number; availableQty: number; fulfilledQty: number; status: string; source: string; externalUrl: string | null; productId?: string | null; business: { name: string; slug: string } | null };
  locale: string;
  paymentAvailable?: boolean;
  /** Shared-element name for the picture; the gallery keeps it unique on the page. */
  artId?: string;
}

export function RegistryItemCard({ item, locale, paymentAvailable = false, artId }: RegistryItemCardProps) {
  const t = useTranslations(), c = nativeGiftCopy(locale), w = wishlistCopy(locale), l = listCopy(locale);
  const router = useRouter();
  const q = giftQuantities(item), state = giftState(item);
  const external = item.source === "AMAZON" || item.source === "EXTERNAL";
  const shopGift = item.source === "LOCAL_BUSINESS";
  const canBuy = paymentAvailable && shopGift && q.available > 0 && item.priceUSD != null;
  return (
    <article className={styles.gift} data-state={state}>
      <div className={styles.giftArt}>
        <GiftArt id={artId ?? `item-${item.id}`} name={item.title} imageUrl={item.imageUrl} />
        {state !== "available" && (
          <span className={styles.badge} data-state={state}>
            {state === "confirmed" ? <Check size={14} strokeWidth={2.4} aria-hidden="true" /> : <Clock size={14} strokeWidth={2.2} aria-hidden="true" />}
            {state === "confirmed" ? t("registry.fulfilled") : w.held}
          </span>
        )}
      </div>
      <div className={styles.giftBody}>
        {item.business && (
          <Link className={styles.giftShop} href={`/businesses/${item.business.slug}`}>
            {l.fromShop} {item.business.name}
          </Link>
        )}
        {item.imageUrl ? <h3 className={styles.giftTitle}>{item.title}</h3> : <h3 className="sr-only">{item.title}</h3>}
        {item.description && <p className={styles.giftDescription}>{item.description}</p>}
        <div className={styles.giftFacts}>
          {item.priceHTG != null || item.priceUSD != null ? (
            <CurrencyDisplay priceHTG={item.priceHTG == null ? null : Number(item.priceHTG)} priceUSD={item.priceUSD == null ? null : Number(item.priceUSD)} preferred={locale === "ht" ? "HTG" : "USD"} className={styles.giftPrice} />
          ) : (
            <span className={styles.giftNoPrice}>{w.unknownPrice}</span>
          )}
          <span className={styles.giftLeft}>{l.left(q.available, q.requested)}</span>
        </div>
        {q.requested > 1 && (
          <span className={styles.units} aria-hidden="true">
            {Array.from({ length: Math.min(q.requested, 12) }, (_, i) => (
              <span key={i} data-state={i < q.confirmed ? "confirmed" : i < q.confirmed + q.held ? "held" : "open"} />
            ))}
          </span>
        )}
      </div>
      <div className={styles.giftAction}>
        {state === "confirmed" ? null : state === "held" && q.available <= 0 ? (
          <p className={styles.giftMuted}>{t("registry.reserved")}</p>
        ) : canBuy ? (
          <button type="button" className={styles.primary} onClick={() => router.push(`${window.location.pathname}/checkout?items=${item.id}`)}>
            {t("checkout.buyGift")}
          </button>
        ) : external && item.externalUrl ? (
          <a className={styles.secondary} href={item.externalUrl} target="_blank" rel="noopener noreferrer">
            {c.externalStore}
            <ExternalLink size={15} strokeWidth={1.9} aria-hidden="true" />
          </a>
        ) : shopGift && item.productId ? (
          <Link className={styles.secondary} href={`/gifts/${item.productId}`} transitionTypes={["nav-forward"]}>
            {l.viewGift}
          </Link>
        ) : (
          <p className={styles.giftMuted}>{l.giveDirectly}</p>
        )}
      </div>
    </article>
  );
}
