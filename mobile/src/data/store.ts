import { giftQuantities } from "@web/registry-progress";
import type { Business, Gift, Locale, Pledge, Product, Registry, Shop, ThemeChoice, User } from "./types";

/**
 * What the app currently knows, as returned by the server. The server is the
 * source of truth: every change is a request (see actions.ts), and this reducer
 * only stores the answers plus the person's display preferences.
 */
export interface State {
  booted: boolean;
  user: User | null;
  locale: Locale;
  theme: ThemeChoice;
  currency: "HTG" | "USD";
  /** Lists this app has loaded: the person's own and any they opened. */
  registries: Registry[];
  /** Slugs of the person's own lists, newest activity first. */
  mine: string[];
  businesses: Business[];
  products: Product[];
  catalogLoaded: boolean;
  pledges: Pledge[];
  shop: Shop | null;
  /** Lists this person opened as a guest, most recent first. */
  visited: string[];
}

export type Action =
  | { type: "booted"; user: User | null }
  | { type: "signedIn"; user: User }
  | { type: "signOut" }
  | { type: "user"; user: User }
  | { type: "setLocale"; locale: Locale }
  | { type: "setTheme"; theme: ThemeChoice }
  | { type: "setCurrency"; currency: "HTG" | "USD" }
  | { type: "catalog"; businesses: Business[]; products: Product[] }
  | { type: "mine"; lists: Registry[] }
  | { type: "list"; list: Registry }
  | { type: "lists"; lists: Registry[] }
  | { type: "gone"; slug: string }
  | { type: "pledges"; pledges: Pledge[] }
  | { type: "shop"; shop: Shop | null }
  | { type: "visit"; slug: string };

export const MAX_BATCH = 20;

export function initialState(locale: Locale = "fr"): State {
  return {
    booted: false, user: null, locale, theme: "system", currency: "HTG",
    registries: [], mine: [], businesses: [], products: [], catalogLoaded: false, pledges: [], shop: null, visited: [],
  };
}

function upsert(lists: Registry[], incoming: Registry[]) {
  const bySlug = new Map(lists.map((l) => [l.slug, l]));
  for (const l of incoming) bySlug.set(l.slug, { ...bySlug.get(l.slug), ...l });
  return [...bySlug.values()];
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "booted":
      return { ...state, booted: true, user: action.user, locale: action.user?.locale ?? state.locale };
    case "signedIn":
      return { ...state, user: action.user, locale: action.user.locale };
    case "signOut":
      // Keep public data; forget everything that belonged to the account.
      return {
        ...state, user: null, mine: [], pledges: [], shop: null,
        registries: state.registries.filter((r) => !state.mine.includes(r.slug)).map(({ pledges: _p, owner: _o, ...r }) => r),
      };
    case "user":
      return { ...state, user: action.user, locale: action.user.locale };
    case "setLocale":
      return { ...state, locale: action.locale };
    case "setTheme":
      return { ...state, theme: action.theme };
    case "setCurrency":
      return { ...state, currency: action.currency };
    case "catalog":
      return { ...state, businesses: action.businesses, products: action.products, catalogLoaded: true };
    case "mine":
      return { ...state, registries: upsert(state.registries, action.lists), mine: action.lists.map((l) => l.slug) };
    case "list":
      return {
        ...state,
        registries: upsert(state.registries, [action.list]),
        mine: action.list.owner && !state.mine.includes(action.list.slug) ? [action.list.slug, ...state.mine] : state.mine,
      };
    case "lists":
      return { ...state, registries: upsert(state.registries, action.lists) };
    case "gone":
      return { ...state, registries: state.registries.filter((r) => r.slug !== action.slug), mine: state.mine.filter((s) => s !== action.slug), visited: state.visited.filter((s) => s !== action.slug) };
    case "pledges":
      return { ...state, pledges: action.pledges };
    case "shop":
      return { ...state, shop: action.shop };
    case "visit":
      return { ...state, visited: [action.slug, ...state.visited.filter((s) => s !== action.slug)].slice(0, 8) };
  }
}

/* ---------- Selectors and rules the screens share ---------- */

export function availableOf(g: Pick<Gift, "quantity" | "fulfilledQty" | "reservedQty">) {
  return giftQuantities({ quantity: g.quantity, fulfilledQty: g.fulfilledQty, availableQty: g.quantity - g.fulfilledQty - g.reservedQty });
}

/** Any gift on someone else's published list can be promised while units remain. */
export function canPledge(list: Registry, gift: Gift, userId: string | undefined) {
  return list.status === "PUBLISHED" && list.ownerId !== userId && !list.owner && availableOf(gift).available > 0;
}

export function findList(state: State, slug: string) {
  return state.registries.find((r) => r.slug === slug);
}

export function myLists(state: State) {
  return state.mine.map((s) => findList(state, s)).filter((l): l is Registry => !!l);
}

export function productsOf(state: State, businessSlug: string) {
  return state.products.filter((p) => p.businessSlug === businessSlug);
}

export function businessOf(state: State, slug?: string) {
  return slug ? state.businesses.find((b) => b.slug === slug) : undefined;
}

/** The list a pasted link points to, if any (…/r/<slug>). */
export function slugFromLink(text: string) {
  return text.trim().toLowerCase().match(/\/r\/([a-z0-9-]+)/)?.[1] ?? null;
}
