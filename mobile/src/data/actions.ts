import { Platform } from "react-native";
import { GOOGLE_WEB_CLIENT_ID } from "@/config";
import { api, ApiError, hasToken, loadToken, saveToken } from "./api";
import type { Action, State } from "./store";
import type { Business, Locale, Pledge, Product, Registry, Shop, User, Visibility } from "./types";
import type { Occasion } from "@web/occasions";

type Dispatch = (a: Action) => void;
export type ListDraft = { type: Occasion; title: string; eventDate?: string; place?: string; description?: string; visibility: Visibility };

/**
 * Every change the app makes, as a request to the server followed by a refresh of
 * what it touched. Errors are ApiError with the server's code; screens turn them
 * into words with errorText().
 */
export function makeActions(dispatch: Dispatch, getState: () => State) {
  // Signed-in checks use the token: the cached user can lag a moment behind a fresh sign-in.
  const refreshMine = async () => {
    if (!hasToken()) return;
    const { lists } = await api<{ lists: Registry[] }>("GET", "/lists/mine");
    dispatch({ type: "mine", lists: lists.map((l) => ({ ...l, owner: true })) });
  };
  const refreshPledges = async () => {
    if (!hasToken()) return;
    const { pledges } = await api<{ pledges: Pledge[] }>("GET", "/me/pledges");
    dispatch({ type: "pledges", pledges });
  };
  const refreshShop = async (user: User | null = getState().user) => {
    if (!hasToken() || !user?.business) return dispatch({ type: "shop", shop: null });
    try {
      const { shop } = await api<{ shop: Shop }>("GET", "/shop");
      dispatch({ type: "shop", shop });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) dispatch({ type: "shop", shop: null });
      else throw e;
    }
  };
  const refreshCatalog = async () => {
    const data = await api<{ businesses: Business[]; products: Product[] }>("GET", "/catalog");
    dispatch({ type: "catalog", ...data });
  };
  const refreshMe = async () => {
    const { user } = await api<{ user: User }>("GET", "/me");
    dispatch({ type: "user", user });
    return user;
  };
  const afterSignIn = async (token: string, user: User) => {
    await saveToken(token);
    dispatch({ type: "signedIn", user });
    await Promise.allSettled([refreshMine(), refreshPledges(), refreshShop(user)]);
    return user;
  };
  const loadList = async (slug: string) => {
    try {
      const { list } = await api<{ list: Registry }>("GET", `/lists/${encodeURIComponent(slug)}`);
      dispatch({ type: "list", list });
      return list;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) { dispatch({ type: "gone", slug }); return null; }
      throw e;
    }
  };

  return {
    /** Restores a saved session and loads the catalog. Never throws: offline still boots. */
    async boot() {
      const [token] = await Promise.all([loadToken(), refreshCatalog().catch(() => {})]);
      let user: User | null = null;
      if (token) {
        try { user = (await api<{ user: User }>("GET", "/me")).user; } catch (e) { if (e instanceof ApiError && e.status === 401) await saveToken(null); }
      }
      dispatch({ type: "booted", user });
      if (user) await Promise.allSettled([refreshMine(), refreshPledges(), refreshShop(user)]);
    },
    refreshCatalog, refreshMine, refreshPledges, refreshShop, refreshMe, loadList,

    async startEmail(email: string) {
      await api("POST", "/auth/email/start", { email, locale: getState().locale });
    },
    async verifyEmail(email: string, code: string) {
      const r = await api<{ token: string; user: User }>("POST", "/auth/email/verify", { email, code, locale: getState().locale, device: `Bayou ${Platform.OS}` });
      return afterSignIn(r.token, r.user);
    },
    googleAvailable: Platform.OS !== "web" && !!GOOGLE_WEB_CLIENT_ID,
    /** Native Google sign-in; returns null if the person backed out. */
    async google() {
      // Loaded lazily: the native module does not exist on web or in Expo Go.
      const g = await import("@react-native-google-signin/google-signin");
      g.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
      await g.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res = await g.GoogleSignin.signIn();
      if (!g.isSuccessResponse(res)) return null;
      if (!res.data.idToken) throw new ApiError("INVALID_TOKEN", 401);
      const r = await api<{ token: string; user: User }>("POST", "/auth/google", { idToken: res.data.idToken, locale: getState().locale, device: `Bayou ${Platform.OS}` });
      return afterSignIn(r.token, r.user);
    },
    async signOut() {
      await api("POST", "/auth/sign-out").catch(() => {});
      await saveToken(null);
      if (Platform.OS !== "web" && GOOGLE_WEB_CLIENT_ID) {
        try { (await import("@react-native-google-signin/google-signin")).GoogleSignin.signOut(); } catch { /* not signed in with Google */ }
      }
      dispatch({ type: "signOut" });
    },

    async saveProfile(name: string, locale: Locale) {
      dispatch({ type: "setLocale", locale });
      await api("PATCH", "/me", { name, locale });
      return refreshMe();
    },
    async finishOnboarding(choice: Occasion | "EXPLORE" | "SKIP") {
      await api("POST", "/me/onboarding", { choice, locale: getState().locale });
      return refreshMe();
    },

    async createList(draft: ListDraft, gifts: { productIds: string[]; ideas: { title: string; priceHTG?: number; quantity: number }[] }) {
      const { slug } = await api<{ slug: string }>("POST", "/lists", { ...draft, locale: getState().locale });
      if (gifts.productIds.length) await api("POST", `/lists/${slug}/gifts`, { productIds: gifts.productIds });
      for (const idea of gifts.ideas) await api("POST", `/lists/${slug}/gifts`, { custom: idea });
      await Promise.all([loadList(slug), refreshMine()]);
      return slug;
    },
    async updateList(slug: string, patch: Partial<ListDraft> & { eventDate?: string }) {
      await api("PATCH", `/lists/${slug}`, patch);
      await loadList(slug);
    },
    async publish(slug: string) {
      await api("POST", `/lists/${slug}/publish`);
      await loadList(slug);
    },
    async addProducts(slug: string, productIds: string[]) {
      await api("POST", `/lists/${slug}/gifts`, { productIds });
      await loadList(slug);
    },
    async removeGift(slug: string, giftId: string) {
      await api("DELETE", `/lists/${slug}/gifts/${giftId}`);
      await loadList(slug);
    },
    async setWanted(slug: string, giftId: string, wanted: boolean) {
      await api("POST", `/lists/${slug}/gifts/${giftId}/priority`, { wanted });
      await loadList(slug);
    },

    async search(q: string) {
      const { lists } = await api<{ lists: Registry[] }>("GET", `/lists/search?q=${encodeURIComponent(q)}`);
      dispatch({ type: "lists", lists });
      return lists.map((l) => l.slug);
    },
    async publicLists(type: Occasion | null) {
      const { lists } = await api<{ lists: Registry[] }>("GET", `/lists/public${type ? `?type=${type}` : ""}`);
      dispatch({ type: "lists", lists });
      return lists.map((l) => l.slug);
    },

    async pledge(slug: string, giftId: string, input: { quantity: number; anonymous: boolean; message?: string }) {
      const r = await api<{ pledge: { id: string } }>("POST", `/lists/${slug}/gifts/${giftId}/pledge`, input);
      await Promise.allSettled([loadList(slug), refreshPledges()]);
      return r.pledge.id;
    },
    async cancelPledge(id: string, slug: string) {
      await api("DELETE", `/pledges/${id}`);
      await Promise.allSettled([loadList(slug), refreshPledges()]);
    },

    async setStock(productId: string, stockQuantity: number | null) {
      await api("PATCH", `/shop/products/${productId}/stock`, { stockQuantity });
      await Promise.allSettled([refreshShop(getState().user), refreshCatalog()]);
    },
  };
}

export type Actions = ReturnType<typeof makeActions>;
