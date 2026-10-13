"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, revokeUserSessions, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { log } from "@/lib/log";
import { enqueueEmail, enqueueEmailWith } from "@/lib/email/outbox";
import { emailDedupeKey } from "@/lib/contracts/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  contactSchema,
  deleteAccountSchema,
  deletedEmail,
  deletionConfirmed,
  DELETED_USER_NAME,
  updateProfileSchema,
} from "@/lib/validators/user";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Pick only the fields we accept. Anything else in the FormData is ignored,
  // so a crafted request can't reach other User columns.
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    preferredLocale: formData.get("preferredLocale") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Invalid profile data");
  }

  await db.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/** "Sign out of all devices": bumps tokenVersion so every JWT dies on its next re-check, then ends this session. */
export async function signOutEverywhere() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await revokeUserSessions(session.user.id);
  await db.auditLog.create({
    data: { actorId: session.user.id, action: "user.sign_out_everywhere", targetType: "user", targetId: session.user.id },
  });
  await signOut({ redirectTo: "/" });
}

export type DeleteAccountResult = { ok: false; error: "CONFIRMATION" | "UNSETTLED_BUSINESS_ORDERS" };

const UNSETTLED = ["PENDING", "PAID", "CONFIRMED", "SHIPPED"] as const;

/**
 * Delete (anonymise) the signed-in account (plan WS6 task 1).
 * - Orders stay for accounting; the user's buyer details on them are anonymised.
 * - Registries with orders are archived, made private and stripped of personal
 *   text; registries without orders are deleted.
 * - Blocked while the user's business has unsettled orders.
 * - The goodbye email is queued BEFORE the address is anonymised.
 */
export async function deleteAccount(formData: FormData): Promise<DeleteAccountResult | void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, deletedAt: true, business: { select: { id: true } } },
  });
  if (!user || user.deletedAt) throw new Error("Unauthorized");

  const parsed = deleteAccountSchema.safeParse({ confirmEmail: formData.get("confirmEmail") ?? "" });
  if (!parsed.success || !deletionConfirmed(parsed.data.confirmEmail, user.email)) {
    return { ok: false, error: "CONFIRMATION" };
  }

  if (user.business) {
    const unsettled = await db.order.count({
      where: {
        status: { in: [...UNSETTLED] },
        items: { some: { registryItem: { businessId: user.business.id } } },
      },
    });
    if (unsettled > 0) return { ok: false, error: "UNSETTLED_BUSINESS_ORDERS" };
  }

  const anonEmail = deletedEmail(userId);
  await db.$transaction(async (tx) => {
    await enqueueEmailWith(tx, {
      template: "account-deleted",
      to: user.email,
      payload: { name: user.name },
      dedupeKey: emailDedupeKey("user", userId, "account-deleted"),
    });

    // Orders this user placed: keep amounts, drop who they are.
    await tx.order.updateMany({
      where: { buyerId: userId },
      data: { buyerId: null, buyerName: DELETED_USER_NAME, buyerEmail: anonEmail, buyerPhone: null },
    });

    // Registries: delete if never ordered from, otherwise archive + anonymise.
    const registries = await tx.registry.findMany({
      where: { userId },
      select: { id: true, _count: { select: { orders: true } } },
    });
    const withOrders = registries.filter((r) => r._count.orders > 0).map((r) => r.id);
    const without = registries.filter((r) => r._count.orders === 0).map((r) => r.id);
    if (without.length) await tx.registry.deleteMany({ where: { id: { in: without } } });
    if (withOrders.length) {
      await tx.registry.updateMany({
        where: { id: { in: withOrders } },
        data: { status: "ARCHIVED", isPublic: false, description: null, coverImage: null, amazonWishlistUrl: null },
      });
    }

    if (user.business) {
      await tx.business.update({
        where: { id: user.business.id },
        data: { status: "SUSPENDED", phone: null, whatsapp: null, email: null, address: null, moncashNumber: null, natcashNumber: null },
      });
      await tx.product.updateMany({ where: { businessId: user.business.id, deletedAt: null }, data: { deletedAt: new Date() } });
    }

    await tx.account.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.verificationToken.deleteMany({ where: { identifier: user.email } });

    await tx.user.update({
      where: { id: userId },
      data: {
        name: null,
        email: anonEmail,
        emailVerified: null,
        phone: null,
        image: null,
        deletedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "user.delete_account",
        targetType: "user",
        targetId: userId,
        meta: { registriesDeleted: without.length, registriesArchived: withOrders.length, business: Boolean(user.business) },
      },
    });
  });

  log.info("user.account_deleted", { userId });
  await signOut({ redirectTo: "/" });
}

export type ContactResult = { ok: true } | { ok: false; error: "INVALID" | "RATE_LIMITED" };

/** Public contact form → queued email to support. */
export async function submitContact(formData: FormData): Promise<ContactResult> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    message: formData.get("message") ?? "",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "INVALID" };
  const { name, email, message, website } = parsed.data;
  if (website) return { ok: true }; // honeypot: pretend success

  const ip = getClientIp(await headers());
  const [byIp, byEmail] = await Promise.all([
    checkRateLimit("magicLink", `contact:ip:${ip}`),
    checkRateLimit("magicLink", `contact:email:${email}`),
  ]);
  if (!byIp.ok || !byEmail.ok) return { ok: false, error: "RATE_LIMITED" };

  // One message per (sender, content) — a double submit is a no-op.
  const digest = createHash("sha256").update(`${email}\n${message}`).digest("hex").slice(0, 32);
  await enqueueEmail({
    template: "contact-form",
    to: process.env.SUPPORT_EMAIL || "support@kadolakay.com",
    payload: { fromName: name, fromEmail: email, message },
    dedupeKey: emailDedupeKey("contact", digest, "contact-form"),
    locale: "en",
  });
  return { ok: true };
}
