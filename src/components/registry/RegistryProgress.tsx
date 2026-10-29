import { registryProgress, type ProgressGift } from "@/lib/registry-progress";
import { progressCaption, wishlistCopy } from "@/lib/wishlist-copy";
import "./wishlist.css";

export function RegistryProgress({ items, locale, compact = false }: { items: ProgressGift[]; locale: string; compact?: boolean }) {
  const p = registryProgress(items), c = wishlistCopy(locale);
  return <section className={`wishlist-progress${compact ? " is-compact" : ""}`} aria-label={c.progress}>
    <div className="wishlist-progress-heading"><span>{c.progress}</span><strong>{p.percent}%</strong></div>
    <progress value={p.confirmed} max={p.requested || 1} aria-label={c.progress} />
    <p className="wishlist-progress-count">{progressCaption(locale, p.confirmed, p.requested)}</p>
    <div className="wishlist-progress-breakdown"><span><b>{p.available}</b> {locale === "fr" && p.available === 1 ? "Disponible" : c.available}</span><span><b>{p.held}</b> {c.held}</span></div>
    {!compact && <p className="wishlist-progress-note">{c.progressNote}</p>}
  </section>;
}
