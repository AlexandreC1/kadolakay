import type { Occasion } from "@web/occasions";

/** Shapes mirror prisma/schema.prisma so the demo store can be swapped for the API. */
export type Locale = "fr" | "en" | "ht";
export type ThemeChoice = "light" | "dark" | "system";
export type Visibility = "PUBLIC" | "LINK" | "PRIVATE";
export type ItemSource = "CUSTOM" | "LOCAL_BUSINESS" | "EXTERNAL";
export type OrderStatus = "PAID" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type PaymentMethod = "MONCASH" | "NATCASH" | "CARD";

export interface Gift {
  id: string;
  title: string;
  description?: string;
  priceHTG?: number;
  priceUSD?: number;
  quantity: number;
  fulfilledQty: number;
  /** Units held by a checkout that has not been paid yet. */
  reservedQty: number;
  source: ItemSource;
  businessSlug?: string;
  productId?: string;
  /** Marked by the host as the most wanted. */
  priority: number;
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
}

export interface Business {
  slug: string;
  ownerId: string;
  name: string;
  category: string;
  city: string;
  department: string;
  description: string;
  phone?: string;
  whatsapp?: string;
  fulfillmentPolicy: string;
  status: "PENDING_REVIEW" | "APPROVED";
  since: string;
}

export interface Product {
  id: string;
  businessSlug: string;
  name: string;
  description: string;
  priceHTG: number;
  priceUSD: number;
  /** Unsold units. Null means the shop has not confirmed stock. */
  stockQuantity: number | null;
  category: string;
}

export interface OrderLine { giftId: string; title: string; quantity: number; priceHTG: number; priceUSD: number }

export interface Order {
  id: string;
  orderNumber: string;
  registrySlug: string;
  businessSlug: string;
  buyerId?: string;
  buyerName: string;
  isAnonymous: boolean;
  giftMessage?: string;
  lines: OrderLine[];
  currency: "HTG" | "USD";
  method: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  businessSlug?: string;
}
