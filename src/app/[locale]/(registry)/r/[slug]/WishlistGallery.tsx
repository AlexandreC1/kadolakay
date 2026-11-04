"use client";
import { startTransition, useState, ViewTransition } from "react";
import { Info } from "lucide-react";
import { giftState, matchesGiftFilter, type GiftFilter } from "@/lib/registry-progress";
import { listCopy, wishlistCopy } from "@/lib/wishlist-copy";
import { RegistryItemCard, type RegistryItemCardProps } from "./RegistryItemCard";
import styles from "./list.module.css";

const order = { available: 0, held: 1, confirmed: 2 } as const;

export function WishlistGallery({ items, locale, paymentAvailable }: { items: RegistryItemCardProps["item"][]; locale: string; paymentAvailable: boolean }) {
  const [filter, setFilter] = useState<GiftFilter>("all");
  const c = wishlistCopy(locale), l = listCopy(locale);
  const counts = { all: items.length, available: 0, held: 0, confirmed: 0 };
  items.forEach((item) => {
    for (const key of ["available", "held", "confirmed"] as const) if (matchesGiftFilter(item, key)) counts[key]++;
  });
  // What is still needed comes first; given gifts settle at the end.
  const rank = (item: RegistryItemCardProps["item"]) => order[giftState(item)];
  // A shop gift's picture shares its name with the gift page, so it can travel there.
  // Each name may appear once per page, so only the first listing of a product gets it.
  const artIds = new Map<string, string>();
  const claimed = new Set<string>();
  for (const item of items) {
    const productId = item.source === "LOCAL_BUSINESS" ? item.productId : null;
    if (productId && !claimed.has(productId)) {
      claimed.add(productId);
      artIds.set(item.id, productId);
    }
  }
  const shown = items.filter((item) => matchesGiftFilter(item, filter)).sort((a, b) => rank(a) - rank(b));
  return (
    <section className={styles.gallery} aria-labelledby="wishlist-gifts-title">
      <div className={styles.galleryHead}>
        <div>
          <h2 id="wishlist-gifts-title">{c.gifts}</h2>
          <p>{c.intro}</p>
        </div>
        <div className={styles.filters} role="group" aria-label={c.filter}>
          {(["all", "available", "held", "confirmed"] as const).map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={filter === key}
              disabled={key !== "all" && counts[key] === 0}
              // A transition lets the cards glide to their new places instead of jumping.
              onClick={() => startTransition(() => setFilter(key))}
            >
              {c[key]}
              <span>{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>
      {!paymentAvailable && (
        <p className={styles.notice}>
          <Info size={18} strokeWidth={1.8} aria-hidden="true" />
          {l.notice}
        </p>
      )}
      <div className={styles.grid} aria-live="polite">
        {shown.map((item) => (
          <ViewTransition key={item.id} name={`list-gift-${item.id}`} update="gift-move" enter="gift-in" exit="gift-out" default="none">
            <RegistryItemCard item={item} locale={locale} paymentAvailable={paymentAvailable} artId={artIds.get(item.id)} />
          </ViewTransition>
        ))}
      </div>
      {!shown.length && (
        <p className={styles.empty} role="status">
          {items.length ? c.noMatches : c.empty}
        </p>
      )}
    </section>
  );
}
