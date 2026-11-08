import type { Occasion } from "@web/occasions";

/** Shapes returned by /api/mobile/v1 (src/services/mobile-api.ts on the server). */
export type Locale = "fr" | "en" | "ht";
export type ThemeChoice = "light" | "dark" | "system";
export type Visibility = "PUBLIC" | "LINK" | "PRIVATE";
export type ItemSource = "CUSTOM" | "LOCAL_BUSINESS" | "EXTERNAL";

export interface Gift {
  id: string;
  title: string;
  description?: string;
  priceHTG?: number;
  priceUSD?: number;
  quantity: number;
  /** Units given or promised. */
  fulfilledQty: number;
  /** Units held by an unpaid checkout. */
  reservedQty: number;
  source: ItemSource;
  businessSlug?: string;
  productId?: string;
  /** 1 when the family marked it most wanted. */
  priority: number;
  imageUrl?: string;
}

/** Who promised a gift, shown to the list's owner only. Anonymous guests have no name. */
export interface OwnerPledge {
  id: string;
  itemId: string;
  quantity: number;
  isAnonymous: boolean;
  message: string | null;
  createdAt: string;
  name: string | null;
}

export interface Registry {
  slug: string;
  ownerId: string;
  ownerName: string;
  type: Occasion;
  status: "DRAFT" | "PUBLISHED";
  title: string;
  description?: string;
  /** ISO calendar date, no time zone. */
  eventDate?: string;
  place?: string;
  visibility: Visibility;
  items: Gift[];
  createdAt: string;
  owner?: boolean;
  pledges?: OwnerPledge[];
}

export interface Business {
  slug: string;
  name: string;
  category: string;
  city: string;
  department: string;
  description: string;
  phone?: string;
  whatsapp?: string;
  fulfillmentPolicy: string;
  status: string;
  since: string;
  productCount?: number;
}

export interface Product {
  id: string;
  businessSlug: string;
  name: string;
  description: string;
  priceHTG: number;
  priceUSD: number;
  /** Units left. Null means the shop has not confirmed stock. */
  stockQuantity: number | null;
  category: string;
  imageUrl?: string;
}

/** A gift this person promised to bring. */
export interface Pledge {
  id: string;
  quantity: number;
  message?: string;
  anonymous: boolean;
  createdAt: string;
  gift: { id: string; title: string; priceHTG?: number; priceUSD?: number; productId?: string; businessSlug?: string };
  list: { slug: string; title: string; ownerName: string };
}

export interface User {
  id: string;
  name: string;
  email: string;
  locale: Locale;
  role: string;
  onboarding: "new" | "deferred" | "done";
  business: { slug: string; status: string } | null;
}

export interface ShopProduct {
  id: string; name: string; description: string; priceHTG: number; priceUSD: number; stockQuantity: number | null; inStock: boolean; category: string | null;
}

export interface Shop {
  slug: string;
  name: string;
  status: string;
  products: ShopProduct[];
  pledges: { id: string; quantity: number; title: string; list: string; place: string | null; createdAt: string }[];
}
