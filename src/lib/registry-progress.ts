export interface ProgressGift { quantity: number; fulfilledQty: number; availableQty: number }
export type GiftFilter = "all" | "available" | "held" | "confirmed";
const units = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
export function giftQuantities(item: ProgressGift) {
  const requested = units(item.quantity);
  const confirmed = Math.min(requested, units(item.fulfilledQty));
  const available = Math.min(requested - confirmed, units(item.availableQty));
  return { requested, confirmed, available, held: requested - confirmed - available };
}
export function giftState(item: ProgressGift): Exclude<GiftFilter, "all"> {
  const q = giftQuantities(item);
  return q.requested > 0 && q.confirmed === q.requested ? "confirmed" : q.available > 0 ? "available" : "held";
}
export function matchesGiftFilter(item: ProgressGift, filter: GiftFilter) {
  if (filter === "all") return true;
  return giftQuantities(item)[filter] > 0;
}
export function registryProgress(items: ProgressGift[]) {
  const totals = items.reduce((sum, item) => {
    const q = giftQuantities(item);
    return { requested: sum.requested + q.requested, confirmed: sum.confirmed + q.confirmed, available: sum.available + q.available, held: sum.held + q.held };
  }, { requested: 0, confirmed: 0, available: 0, held: 0 });
  return { ...totals, percent: totals.requested ? Math.round(totals.confirmed / totals.requested * 100) : 0 };
}
