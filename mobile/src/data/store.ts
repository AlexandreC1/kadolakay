import { giftQuantities } from "@web/registry-progress";
import type { Occasion } from "@web/occasions";
import { businesses, demoMerchant, demoUser, orders, products, registries } from "./fixtures";
import type { Business, Gift, Locale, Order, OrderStatus, PaymentMethod, Product, Registry, ThemeChoice, User, Visibility } from "./types";

/**
 * The app's state and every change it can make, as a pure reducer. In demo mode
 * this is the source of truth; once the mobile API exists each action becomes a
 * request and the reducer applies the server's answer. Rules mirror the web app:
 * up to 20 catalog gifts per save, only shop gifts can be paid in the app, and a
 * gift can never be given beyond what is still needed.
 */
export interface State {
  user: User | null;
  locale: Locale;
  theme: ThemeChoice;
  currency: "HTG" | "USD";
  registries: Registry[];
  businesses: Business[];
  products: Product[];
  orders: Order[];
  /** Lists this person opened as a guest, most recent first. */
  visited: string[];
  seq: number;
}

export type ListDraft = { type: Occasion; title: string; eventDate?: string; place?: string; description?: string; visibility: Visibility };
export type Offer = { slug: string; giftId: string; quantity: number; buyerName: string; anonymous: boolean; message?: string; currency: "HTG" | "USD"; method: PaymentMethod };

export type Action =
  | { type: "signIn"; as: "host" | "merchant" }
  | { type: "signOut" }
  | { type: "setLocale"; locale: Locale }
  | { type: "setTheme"; theme: ThemeChoice }
  | { type: "setCurrency"; currency: "HTG" | "USD" }
  | { type: "visit"; slug: string }
  | { type: "createList"; draft: ListDraft }
  | { type: "updateList"; slug: string; patch: Partial<ListDraft> }
  | { type: "publishList"; slug: string }
  | { type: "addProducts"; slug: string; productIds: string[] }
  | { type: "addCustom"; slug: string; title: string; priceHTG?: number; quantity: number }
  | { type: "removeGift"; slug: string; giftId: string }
  | { type: "togglePriority"; slug: string; giftId: string }
  | { type: "offer"; offer: Offer }
  | { type: "orderStatus"; orderId: string; status: OrderStatus }
  | { type: "setStock"; productId: string; stockQuantity: number | null };

export const MAX_BATCH = 20;

export function initialState(locale: Locale = "fr"): State {
  return {
    user: null, locale, theme: "system", currency: "HTG",
    registries: structuredClone(registries), businesses: structuredClone(businesses),
    products: structuredClone(products), orders: structuredClone(orders),
    visited: ["maryaj-jean-rose"], seq: 1,
  };
}

/** Same rules as src/lib/slug.ts generateSlug, without the database lookup. */
export function slugify(text: string) {
  const s = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60).replace(/^-|-$/g, "");
  return s || "gift-list";
}

/** The link a new list will get, so a screen can open it right after creating it. */
export function nextListSlug(state: State, title: string) {
  return uniqueSlug(title.trim(), state.registries);
}

function uniqueSlug(base: string, taken: Registry[]) {
  let slug = slugify(base);
  for (let n = 2; taken.some((r) => r.slug === slug); n++) slug = `${slugify(base)}-${n}`;
  return slug;
}

const mapList = (state: State, slug: string, fn: (r: Registry) => Registry): State => ({
  ...state, registries: state.registries.map((r) => (r.slug === slug ? fn(r) : r)),
});

export function canPayInApp(gift: Gift) {
  return gift.source === "LOCAL_BUSINESS" && !!gift.productId;
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "signIn":
      return { ...state, user: action.as === "merchant" ? demoMerchant : demoUser };
    case "signOut":
      return { ...state, user: null };
    case "setLocale":
      return { ...state, locale: action.locale };
    case "setTheme":
      return { ...state, theme: action.theme };
    case "setCurrency":
      return { ...state, currency: action.currency };
    case "visit":
      return { ...state, visited: [action.slug, ...state.visited.filter((s) => s !== action.slug)].slice(0, 8) };
    case "createList": {
      if (!state.user || !action.draft.title.trim()) return state;
      const slug = uniqueSlug(action.draft.title, state.registries);
      const list: Registry = {
        slug, ownerId: state.user.id, ownerName: state.user.name, status: "DRAFT", items: [], createdAt: today(),
        ...action.draft, title: action.draft.title.trim(),
      };
      return { ...state, registries: [list, ...state.registries], seq: state.seq + 1 };
    }
    case "updateList":
      return mapList(state, action.slug, (r) => (owns(state, r) ? { ...r, ...action.patch } : r));
    case "publishList":
      return mapList(state, action.slug, (r) => (owns(state, r) ? { ...r, status: "PUBLISHED" } : r));
    case "addProducts": {
      // All or nothing, like addCatalogGifts on the server.
      const list = state.registries.find((r) => r.slug === action.slug);
      if (!list || !owns(state, list)) return state;
      const ids = [...new Set(action.productIds)];
      if (ids.length === 0 || ids.length > MAX_BATCH) return state;
      if (ids.some((id) => list.items.some((g) => g.productId === id))) return state;
      const picked = ids.map((id) => state.products.find((p) => p.id === id));
      if (picked.some((p) => !p || p.stockQuantity === 0)) return state;
      let seq = state.seq;
      const added: Gift[] = (picked as Product[]).map((p) => ({
        id: `g-${seq++}`, title: p.name, description: p.description, priceHTG: p.priceHTG, priceUSD: p.priceUSD,
        quantity: 1, fulfilledQty: 0, reservedQty: 0, source: "LOCAL_BUSINESS", businessSlug: p.businessSlug, productId: p.id, priority: 0,
      }));
      return { ...mapList(state, action.slug, (r) => ({ ...r, items: [...r.items, ...added] })), seq };
    }
    case "addCustom": {
      const list = state.registries.find((r) => r.slug === action.slug);
      if (!list || !owns(state, list) || !action.title.trim()) return state;
      const quantity = Math.min(99, Math.max(1, Math.floor(action.quantity)));
      const gift: Gift = { id: `g-${state.seq}`, title: action.title.trim(), priceHTG: action.priceHTG, quantity, fulfilledQty: 0, reservedQty: 0, source: "CUSTOM", priority: 0 };
      return { ...mapList(state, action.slug, (r) => ({ ...r, items: [...r.items, gift] })), seq: state.seq + 1 };
    }
    case "removeGift":
      // A gift someone already gave stays on the list, as on the web.
      return mapList(state, action.slug, (r) => (owns(state, r)
        ? { ...r, items: r.items.filter((g) => g.id !== action.giftId || g.fulfilledQty > 0 || g.reservedQty > 0) }
        : r));
    case "togglePriority":
      return mapList(state, action.slug, (r) => (owns(state, r)
        ? { ...r, items: r.items.map((g) => (g.id === action.giftId ? { ...g, priority: g.priority ? 0 : 1 } : g)) }
        : r));
    case "offer":
      return applyOffer(state, action.offer);
    case "orderStatus": {
      const biz = state.user?.businessSlug;
      return { ...state, orders: state.orders.map((o) => (o.id === action.orderId && o.businessSlug === biz && nextStatus(o.status) === action.status ? { ...o, status: action.status } : o)) };
    }
    case "setStock": {
      const biz = state.user?.businessSlug;
      const qty = action.stockQuantity === null ? null : Math.max(0, Math.floor(action.stockQuantity));
      return { ...state, products: state.products.map((p) => (p.id === action.productId && p.businessSlug === biz ? { ...p, stockQuantity: qty } : p)) };
    }
  }
}

function applyOffer(state: State, offer: Offer): State {
  const list = state.registries.find((r) => r.slug === offer.slug);
  const gift = list?.items.find((g) => g.id === offer.giftId);
  if (!list || list.status !== "PUBLISHED" || !gift || !canPayInApp(gift) || !offer.buyerName.trim()) return state;
  const { available } = giftQuantities({ quantity: gift.quantity, fulfilledQty: gift.fulfilledQty, availableQty: gift.quantity - gift.fulfilledQty - gift.reservedQty });
  const quantity = Math.floor(offer.quantity);
  if (quantity < 1 || quantity > available) return state;
  const order: Order = {
    id: `o-${state.seq}`, orderNumber: orderNumberFor(state.seq),
    registrySlug: list.slug, businessSlug: gift.businessSlug ?? "", buyerId: state.user?.id, buyerName: offer.buyerName.trim(),
    isAnonymous: offer.anonymous, giftMessage: offer.message?.trim() || undefined,
    lines: [{ giftId: gift.id, title: gift.title, quantity, priceHTG: gift.priceHTG ?? 0, priceUSD: gift.priceUSD ?? 0 }],
    currency: offer.currency, method: offer.method, status: "PAID", createdAt: today(),
  };
  return {
    ...mapList(state, list.slug, (r) => ({ ...r, items: r.items.map((g) => (g.id === gift.id ? { ...g, fulfilledQty: g.fulfilledQty + quantity } : g)) })),
    orders: [order, ...state.orders], seq: state.seq + 1,
  };
}

/** Demo order numbers: BY- plus five characters, like the server's. */
export function orderNumberFor(seq: number) {
  return `BY-${(1679616 + seq * 7919).toString(36).toUpperCase().slice(-5)}`;
}

const flow: OrderStatus[] = ["PAID", "CONFIRMED", "SHIPPED", "DELIVERED"];
export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = flow.indexOf(status);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}
export const orderFlow = flow;

function owns(state: State, list: Registry) {
  return !!state.user && state.user.id === list.ownerId;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- Selectors ---------- */

export function availableOf(g: Gift) {
  return giftQuantities({ quantity: g.quantity, fulfilledQty: g.fulfilledQty, availableQty: g.quantity - g.fulfilledQty - g.reservedQty });
}

export function findList(state: State, slug: string) {
  return state.registries.find((r) => r.slug === slug);
}

/** Public, published lists matching a name or a pasted link (…/r/<slug>). */
export function searchLists(state: State, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const fromLink = q.match(/\/r\/([a-z0-9-]+)/)?.[1];
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return state.registries.filter((r) => r.status === "PUBLISHED" && (fromLink
    ? r.slug === fromLink && r.visibility !== "PRIVATE"
    : r.visibility === "PUBLIC" && (norm(r.title).includes(norm(q)) || norm(r.ownerName).includes(norm(q)))));
}

export function myLists(state: State) {
  return state.user ? state.registries.filter((r) => r.ownerId === state.user!.id) : [];
}

export function productsOf(state: State, businessSlug: string) {
  return state.products.filter((p) => p.businessSlug === businessSlug);
}

export function businessOf(state: State, slug?: string) {
  return slug ? state.businesses.find((b) => b.slug === slug) : undefined;
}
