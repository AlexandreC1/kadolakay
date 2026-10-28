/** Builds the "my data" export (see route.ts). */
import { db } from "@/lib/db";

export const EXPORT_WINDOW_MS = 24 * 3_600_000;

export async function buildUserExport(userId: string) {
  const [user, registries, ordersPlaced, ordersReceived, business] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, image: true, role: true, preferredLocale: true, createdAt: true },
    }),
    db.registry.findMany({
      where: { userId },
      select: {
        id: true, slug: true, type: true, status: true, title: true, description: true, eventDate: true,
        isPublic: true, locale: true, amazonWishlistUrl: true, createdAt: true,
        items: { select: { id: true, title: true, description: true, source: true, externalUrl: true, priceHTG: true, priceUSD: true, quantity: true, fulfilledQty: true, status: true } },
      },
    }),
    db.order.findMany({
      where: { buyerId: userId },
      select: {
        orderNumber: true, status: true, buyerName: true, buyerEmail: true, buyerPhone: true, giftMessage: true, isAnonymous: true,
        totalHTG: true, totalUSD: true, platformFee: true, createdAt: true,
        payment: { select: { provider: true, status: true, currency: true } },
        items: { select: { quantity: true, priceHTG: true, priceUSD: true, registryItem: { select: { title: true } } } },
      },
    }),
    db.order.findMany({
      where: { registry: { userId }, status: { in: ["PAID", "CONFIRMED", "SHIPPED", "DELIVERED", "REFUNDED"] } },
      select: {
        orderNumber: true, status: true, buyerName: true, isAnonymous: true, giftMessage: true, createdAt: true,
        items: { select: { quantity: true, registryItem: { select: { title: true } } } },
      },
    }),
    db.business.findUnique({
      where: { ownerId: userId },
      include: { products: { select: { id: true, name: true, description: true, priceHTG: true, priceUSD: true, inStock: true, deletedAt: true } } },
    }),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    profile: user,
    registries,
    ordersPlaced,
    // Buyer contact details are omitted; anonymous gifts stay anonymous.
    ordersReceived: ordersReceived.map((o) => ({ ...o, buyerName: o.isAnonymous ? null : o.buyerName })),
    business,
  };
}
