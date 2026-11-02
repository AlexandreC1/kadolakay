import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseEntityId } from "@/lib/validators/entity-id";
import { decryptField } from "@/lib/security-crypto";
import { auditOperation } from "./operation-audit";
import { deliverySchema } from "./order-contact";

export const ACCOUNT_EXPORT_VERSION = 1;

/** Reasons an account cannot be deleted from the web. Each one is shown to the user. */
export type AccountDeletionBlock =
  | "ADMIN_ACCOUNT"
  | "ACTIVE_ORDERS"
  | "OPEN_REFUNDS"
  | "MERCHANT_RECORDS";

export class AccountDeletionBlocked extends Error {
  constructor(public readonly reason: AccountDeletionBlock) {
    super(reason);
    this.name = "AccountDeletionBlocked";
  }
}

/** Placeholder address on a deleted account or scrubbed order. The .invalid TLD can never receive mail. */
export const deletedEmail = (id: string) => `deleted+${id}@deleted.invalid`;

const FINISHED_ORDER = ["CANCELLED", "REFUNDED", "DELIVERED"] as const;
const OPEN_REFUND = ["REQUESTED", "ACCEPTED"];

function readDelivery(encrypted: string | null, orderId: string) {
  if (!encrypted) return null;
  try {
    return deliverySchema
      .omit({ orderId: true })
      .parse(JSON.parse(decryptField(encrypted, `order-contact:${orderId}`)));
  } catch {
    // Never fail the whole export over one field; say so instead of guessing.
    return { unavailable: true };
  }
}

/**
 * Everything Bayou stores about this person, as JSON they can keep.
 * Secrets are never included: no OAuth tokens, authenticator secret, recovery codes or list passwords.
 * Caller identity must come from requireActor, never from a request parameter.
 */
export async function exportAccountData(actorId: string) {
  const id = parseEntityId(actorId);
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      phone: true,
      preferredLocale: true,
      role: true,
      onboardingCompletedAt: true,
      createdAt: true,
      updatedAt: true,
      mfaSecret: true,
      accounts: { select: { provider: true, type: true } },
      deviceSessions: {
        select: { label: true, createdAt: true, expiresAt: true, revokedAt: true },
        orderBy: { createdAt: "desc" },
      },
      premiumGrant: { select: { expiresAt: true } },
      registries: {
        orderBy: { createdAt: "asc" },
        select: {
          slug: true,
          kind: true,
          type: true,
          status: true,
          title: true,
          description: true,
          eventDate: true,
          recipientName: true,
          recipientMessage: true,
          visibility: true,
          searchable: true,
          locale: true,
          coverImage: true,
          amazonWishlistUrl: true,
          externalLinks: true,
          password: true,
          createdAt: true,
          updatedAt: true,
          items: {
            orderBy: { createdAt: "asc" },
            select: {
              title: true,
              description: true,
              imageUrl: true,
              externalUrl: true,
              source: true,
              priceHTG: true,
              priceUSD: true,
              quantity: true,
              fulfilledQty: true,
              status: true,
              createdAt: true,
            },
          },
        },
      },
      orders: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          orderNumber: true,
          buyerName: true,
          buyerEmail: true,
          buyerPhone: true,
          giftMessage: true,
          isAnonymous: true,
          deliveryContactEncrypted: true,
          totalHTG: true,
          totalUSD: true,
          status: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
              priceHTG: true,
              priceUSD: true,
              registryItem: { select: { title: true } },
            },
          },
          payment: { select: { provider: true, status: true, currency: true, paidAt: true } },
        },
      },
      business: {
        select: {
          name: true,
          slug: true,
          description: true,
          category: true,
          patenteNumber: true,
          city: true,
          department: true,
          address: true,
          phone: true,
          whatsapp: true,
          email: true,
          website: true,
          status: true,
          fulfillmentPolicy: true,
          createdAt: true,
          products: {
            orderBy: { createdAt: "asc" },
            select: {
              name: true,
              description: true,
              imageUrl: true,
              priceHTG: true,
              priceUSD: true,
              inStock: true,
              stockQuantity: true,
              category: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });
  if (!user) throw new Error("ACCOUNT_UNAVAILABLE");
  const { mfaSecret, registries, orders, ...profile } = user;
  return {
    format: "bayou-account-export",
    version: ACCOUNT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile: { ...profile, authenticatorEnabled: Boolean(mfaSecret) },
    lists: registries.map(({ password, ...list }) => ({
      ...list,
      passwordProtected: Boolean(password),
    })),
    purchases: orders.map(({ deliveryContactEncrypted, id: orderId, ...order }) => ({
      ...order,
      deliveryContact: readDelivery(deliveryContactEncrypted, orderId),
    })),
  };
}

/**
 * Deletes the person's account.
 *
 * The user row stays as an empty, permanently disabled tombstone because orders,
 * audit events and lists that received gifts point at it; every personal field on it
 * is cleared and every sign-in method is removed. Lists that never received a gift are
 * deleted; lists that did are archived and stripped of personal text. Orders the person
 * placed keep their amounts and items for the merchants, without the buyer's details.
 *
 * Blocked (nothing changes) for administrators, while one of the person's orders is
 * still being prepared, while a refund request is open, and for merchants with order
 * history: those need support to close out first.
 */
export async function deleteAccount(actorId: string, confirmation: unknown) {
  const id = parseEntityId(actorId);
  const typed = z.string().trim().toLowerCase().max(320).parse(confirmation);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
    const user = await tx.user.findUnique({
      where: { id },
      select: { email: true, role: true, suspendedAt: true, business: { select: { id: true } } },
    });
    if (!user || user.suspendedAt) throw new Error("ACCOUNT_UNAVAILABLE");
    if (typed !== user.email.toLowerCase()) throw new Error("CONFIRMATION_MISMATCH");
    // Administrator roles are removed by another administrator first, with their own audit trail.
    if (user.role === "ADMIN" || user.role === "SUPERADMIN")
      throw new AccountDeletionBlocked("ADMIN_ACCOUNT");

    const purchases = await tx.order.findMany({
      where: { buyerId: id },
      select: {
        id: true,
        status: true,
        fulfillments: { select: { state: true } },
        refundRequests: { select: { state: true } },
      },
    });
    for (const order of purchases) {
      if (order.refundRequests.some((r) => OPEN_REFUND.includes(r.state)))
        throw new AccountDeletionBlocked("OPEN_REFUNDS");
      const finished =
        (FINISHED_ORDER as readonly string[]).includes(order.status) ||
        (order.fulfillments.length > 0 && order.fulfillments.every((f) => f.state === "DELIVERED"));
      if (order.status !== "PENDING" && !finished) throw new AccountDeletionBlocked("ACTIVE_ORDERS");
    }

    if (user.business) await removeBusinessOrBlock(tx, user.business.id);
    await removeOrArchiveLists(tx, id);

    for (const order of purchases) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          buyerId: null,
          buyerName: "Anonymous",
          buyerEmail: deletedEmail(order.id),
          buyerPhone: null,
          giftMessage: null,
          isAnonymous: true,
          deliveryContactEncrypted: null,
          checkoutRequestId: null,
          checkoutRequestHash: null,
        },
      });
    }

    await tx.account.deleteMany({ where: { userId: id } });
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.deviceSession.deleteMany({ where: { userId: id } });
    await tx.mfaEnrollment.deleteMany({ where: { userId: id } });
    await tx.premiumGrant.deleteMany({ where: { userId: id } });
    await tx.verificationToken.deleteMany({ where: { identifier: user.email } });
    await tx.user.update({
      where: { id },
      data: {
        email: deletedEmail(id),
        emailVerified: null,
        name: null,
        image: null,
        phone: null,
        suspendedAt: new Date(),
        mfaSecret: null,
        recoveryHashes: [],
        onboardingStep: 0,
        onboardingCompletedAt: null,
        onboardingDeferredAt: null,
        sessionVersion: { increment: 1 },
      },
    });
    await auditOperation(tx, id, "ACCOUNT_DELETED", "USER", id, "ACTIVE", "DELETED");
  });
}

async function removeBusinessOrBlock(tx: Prisma.TransactionClient, businessId: string) {
  const [lines, fulfillments, refunds] = await Promise.all([
    tx.orderItem.count({
      where: { OR: [{ product: { businessId } }, { registryItem: { businessId } }] },
    }),
    tx.merchantFulfillment.count({ where: { businessId } }),
    tx.refundRequest.count({ where: { businessId } }),
  ]);
  if (lines + fulfillments + refunds > 0) throw new AccountDeletionBlocked("MERCHANT_RECORDS");
  await tx.registryItem.updateMany({ where: { businessId }, data: { businessId: null } });
  await tx.business.delete({ where: { id: businessId } });
}

async function removeOrArchiveLists(tx: Prisma.TransactionClient, userId: string) {
  const lists = await tx.registry.findMany({
    where: { userId },
    select: { id: true, items: { select: { id: true, _count: { select: { orderItems: true } } } } },
  });
  for (const list of lists) {
    const gifted = list.items.filter((item) => item._count.orderItems > 0).map((item) => item.id);
    if (!gifted.length) {
      await tx.registry.delete({ where: { id: list.id } });
      continue;
    }
    await tx.registryItem.deleteMany({ where: { registryId: list.id, id: { notIn: gifted } } });
    await tx.registryItem.updateMany({
      where: { id: { in: gifted } },
      data: { description: null, imageUrl: null, externalUrl: null },
    });
    await tx.registry.update({
      where: { id: list.id },
      data: {
        title: "Archived list",
        description: null,
        eventDate: null,
        coverImage: null,
        recipientName: null,
        recipientMessage: null,
        ogImageUrl: null,
        amazonWishlistUrl: null,
        externalLinks: Prisma.DbNull,
        password: null,
        visibility: "PRIVATE",
        isPublic: false,
        searchable: false,
        status: "ARCHIVED",
      },
    });
  }
}
