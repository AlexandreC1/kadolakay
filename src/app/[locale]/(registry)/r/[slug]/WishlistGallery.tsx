"use client";
import { useState } from "react";
import { matchesGiftFilter, type GiftFilter } from "@/lib/registry-progress";
import { wishlistCopy } from "@/lib/wishlist-copy";
import { RegistryItemCard, type RegistryItemCardProps } from "./RegistryItemCard";

export function WishlistGallery({ items, locale, paymentAvailable }: { items: RegistryItemCardProps["item"][]; locale: string; paymentAvailable: boolean }) {
  const [filter, setFilter] = useState<GiftFilter>("all");
  const c = wishlistCopy(locale);
  const counts = { all: items.length, available: 0, held: 0, confirmed: 0 };
  items.forEach(item => { for (const key of ["available", "held", "confirmed"] as const) if (matchesGiftFilter(item, key)) counts[key]++; });
  const shown = items.filter(item => matchesGiftFilter(item, filter));
  return <section className="wishlist-gallery" aria-labelledby="wishlist-gifts-title">
    <header><h2 id="wishlist-gifts-title">{c.gifts}</h2><p>{c.intro}</p></header>
    <div className="wishlist-filters" role="group" aria-label={c.filter}>{(["all", "available", "held", "confirmed"] as const).map(key => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{c[key]}<span>{counts[key]}</span></button>)}</div>
    <div className="wishlist-grid" aria-live="polite">{shown.map(item => <RegistryItemCard key={item.id} item={item} locale={locale} paymentAvailable={paymentAvailable} />)}</div>
    {!shown.length && <p className="wishlist-empty" role="status">{items.length ? c.noMatches : c.empty}</p>}
  </section>;
}
