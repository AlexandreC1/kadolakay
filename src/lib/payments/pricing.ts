/**
 * Pure checkout pricing (reviews C2, H5). No DB, no float money.
 * createOrder loads the rows, this decides whether the order is valid and
 * what it costs.
 */
import { ActionError } from "@/lib/contracts/action";
import { money, multiply, percentOf, sum, type Currency, type Money } from "@/lib/money";

export const MAX_QTY_PER_ITEM = 100;
export const MAX_ITEMS_PER_ORDER = 50;
export const PLATFORM_FEE_PERCENT = 5;

export interface PricedItemRow {
  id: string;
  registryId: string;
  priceHTG: { toString(): string } | null;
  priceUSD: { toString(): string } | null;
  quantity: number;
  fulfilledQty: number;
  status: string;
  registry: { id: string; slug: string; status: string };
}

export interface OrderLine {
  registryItemId: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  priceHTG: Money | null;
  priceUSD: Money | null;
}

export interface PricedOrder {
  registryId: string;
  registrySlug: string;
  currency: Currency;
  lines: OrderLine[];
  total: Money;
  platformFee: Money;
}

export function priceOrder(input: {
  requestedIds: string[];
  quantities: Record<string, number>;
  currency: Currency;
  rows: PricedItemRow[];
}): PricedOrder {
  const ids = [...new Set(input.requestedIds)];
  if (ids.length === 0 || ids.length > MAX_ITEMS_PER_ORDER) throw new ActionError("INVALID_INPUT", "registryItemIds");

  const byId = new Map(input.rows.map((r) => [r.id, r]));
  // Every requested item must exist; silently dropping some would charge for a different cart.
  if (ids.some((id) => !byId.has(id))) throw new ActionError("NOT_FOUND", "registryItemIds");

  const rows = ids.map((id) => byId.get(id)!);
  const registryIds = new Set(rows.map((r) => r.registryId));
  if (registryIds.size !== 1) throw new ActionError("INVALID_INPUT", "registryItemIds");
  const registry = rows[0].registry;
  if (registry.status !== "PUBLISHED") throw new ActionError("NOT_FOUND", "registryItemIds");

  const lines: OrderLine[] = rows.map((r) => {
    if (r.status === "FULFILLED") throw new ActionError("CONFLICT", "registryItemIds");
    const remaining = r.quantity - r.fulfilledQty;
    const qty = input.quantities[r.id] ?? 1;
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM || qty > remaining) {
      throw new ActionError("INVALID_INPUT", "quantities");
    }
    const priceHTG = r.priceHTG == null ? null : money(r.priceHTG.toString());
    const priceUSD = r.priceUSD == null ? null : money(r.priceUSD.toString());
    const unit = input.currency === "HTG" ? priceHTG : priceUSD;
    // C2: an item with no price in the charged currency would be fulfilled for free.
    if (!unit || !unit.greaterThan(0)) throw new ActionError("INVALID_INPUT", "paymentProvider");
    return { registryItemId: r.id, quantity: qty, unitPrice: unit, lineTotal: multiply(unit, qty), priceHTG, priceUSD };
  });

  const total = sum(lines.map((l) => l.lineTotal));
  return {
    registryId: registry.id,
    registrySlug: registry.slug,
    currency: input.currency,
    lines,
    total,
    platformFee: percentOf(total, PLATFORM_FEE_PERCENT),
  };
}
