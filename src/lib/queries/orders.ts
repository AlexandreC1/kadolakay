/**
 * Orders list queries (WS7). Bounded, cursor-paginated, minimal selects.
 * "Received" uses Order.registryId (index [registryId, status, createdAt])
 * instead of the old items→registryItem→registry join.
 */
import { db } from "@/lib/db";
import { cursorArgs, toPage, type PageRequest } from "@/lib/pagination";

/** Statuses that mean "the gift was paid for". */
export const PAID_LIKE = ["PAID", "CONFIRMED", "SHIPPED", "DELIVERED"] as const;

const orderSelect = {
  id: true,
  orderNumber: true,
  publicToken: true,
  status: true,
  buyerName: true,
  isAnonymous: true,
  giftMessage: true,
  totalHTG: true,
  totalUSD: true,
  createdAt: true,
  registry: { select: { title: true, slug: true, type: true } },
  payment: { select: { provider: true, currency: true } },
  items: {
    select: {
      id: true,
      quantity: true,
      priceHTG: true,
      priceUSD: true,
      registryItem: { select: { title: true } },
    },
    take: 50,
  },
} as const;

const order = [{ createdAt: "desc" as const }, { id: "desc" as const }];

export async function getReceivedOrders(userId: string, page: PageRequest) {
  const rows = await db.order.findMany({
    where: { status: { in: [...PAID_LIKE] }, registry: { userId } },
    select: orderSelect,
    orderBy: order,
    ...cursorArgs(page),
  });
  return toPage(rows, page.take);
}

export async function getPlacedOrders(userId: string, page: PageRequest) {
  const rows = await db.order.findMany({
    where: { buyerId: userId },
    select: orderSelect,
    orderBy: order,
    ...cursorArgs(page),
  });
  return toPage(rows, page.take);
}

export type OrderListItem = Awaited<ReturnType<typeof getReceivedOrders>>["items"][number];
