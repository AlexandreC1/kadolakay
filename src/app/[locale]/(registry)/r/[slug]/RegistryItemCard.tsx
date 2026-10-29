"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Package, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { nativeGiftCopy } from "@/lib/catalog-copy";
import { giftQuantities, giftState } from "@/lib/registry-progress";
import { availabilityCaption, wishlistCopy } from "@/lib/wishlist-copy";

export interface RegistryItemCardProps {
  item: { id: string; title: string; description: string | null; imageUrl: string | null; priceHTG: unknown; priceUSD: unknown; quantity: number; availableQty: number; fulfilledQty: number; status: string; source: string; externalUrl: string | null; business: { name: string; slug: string } | null };
  locale: string;
  paymentAvailable?: boolean;
}
export function RegistryItemCard({ item, locale, paymentAvailable = false }: RegistryItemCardProps) {
  const t = useTranslations(), c = nativeGiftCopy(locale), w = wishlistCopy(locale);
  const router = useRouter();
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const q = giftQuantities(item), state = giftState(item);
  const external = item.source === "AMAZON" || item.source === "EXTERNAL";
  const isConfirmed = state === "confirmed";
  const StatusIcon = isConfirmed ? Check : state === "held" ? Clock : Package;
  const stateLabel = state === "available" ? t(q.confirmed > 0 ? "registry.partiallyFulfilled" : "registry.available") : state === "confirmed" ? t("registry.fulfilled") : w.held;
  function handleBuy() {
    if (external && item.externalUrl) window.open(item.externalUrl, "_blank", "noopener,noreferrer");
    else router.push(`${window.location.pathname}/checkout?items=${item.id}`);
  }
  return <article className="wishlist-gift">
    <div className="wishlist-gift-art">
      {item.imageUrl && failedImage !== item.imageUrl ? <img src={item.imageUrl} alt={item.title} loading="lazy" onError={() => setFailedImage(item.imageUrl)} /> : <div className="wishlist-gift-placeholder" aria-hidden="true"><Package size={38} strokeWidth={1.2} /></div>}
      <span className={`wishlist-gift-status is-${state}`}><StatusIcon size={13} aria-hidden="true" />{stateLabel}</span>
    </div>
    <div className="wishlist-gift-body">
      {item.business && <Link className="wishlist-gift-store" href={`/businesses/${item.business.slug}`}>{item.business.name}</Link>}
      <h3>{item.title}</h3>
      {item.description && <p className="wishlist-gift-description">{item.description}</p>}
      <div className="wishlist-gift-price">{item.priceHTG != null || item.priceUSD != null ? <CurrencyDisplay priceHTG={item.priceHTG == null ? null : Number(item.priceHTG)} priceUSD={item.priceUSD == null ? null : Number(item.priceUSD)} preferred={locale === "ht" ? "HTG" : "USD"} /> : <span>{w.unknownPrice}</span>}</div>
      <p className="wishlist-gift-quantity">{availabilityCaption(locale, q.available, q.requested)}</p>
      {q.confirmed > 0 && !isConfirmed && <p className="wishlist-gift-partial">{q.confirmed} {w.confirmed.toLowerCase()}</p>}
      {q.held > 0 && <p className="wishlist-gift-partial">{q.held} {w.held.toLowerCase()}</p>}
    </div>
    <div className="wishlist-gift-action">
      {isConfirmed ? <p className="wishlist-gift-confirmed"><Check size={16} aria-hidden="true" />{t("registry.fulfilled")}</p> : state === "held" ? <p>{t("registry.reserved")}</p> : item.source === "CUSTOM" ? <p>{c.listOnly}</p> : !external && !paymentAvailable ? <p>{c.disabled}</p> : <Button variant={external ? "outline" : "default"} className="w-full" onClick={handleBuy} disabled={q.available <= 0 || (!external && (item.source !== "LOCAL_BUSINESS" || !item.priceUSD)) || (external && !item.externalUrl)}>{external ? c.externalStore : t("checkout.buyGift")}</Button>}
    </div>
  </article>;
}
