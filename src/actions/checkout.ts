"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkoutSchema } from "@/lib/validators/checkout";
import { checkRateLimit } from "@/lib/rate-limit";
import { beginCheckout, resumeCheckout, CheckoutError } from "@/services/checkout";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const resumeSchema = z.strictObject({ checkoutRequestId: checkoutSchema.shape.checkoutRequestId, registrySlug: checkoutSchema.shape.registrySlug });

export async function resumeOrder(input: unknown) {
  const session = await auth();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = await checkRateLimit("checkout", session?.user?.id ? `user:${session.user.id}` : `ip:${ip}`);
  if (!rl.ok) return { error: "RATE_LIMITED" };
  const parsed = resumeSchema.safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  try { return await resumeCheckout(parsed.data, session?.user?.id); }
  catch (error) {
    if (error instanceof CheckoutError) return { error: error.message };
    console.error("Checkout resume failed", { code: "CHECKOUT_FAILED" });
    return { error: "CHECKOUT_FAILED" };
  }
}

export async function createOrder(formData: FormData) {
  const session = await auth();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = await checkRateLimit("checkout", session?.user?.id ? `user:${session.user.id}` : `ip:${ip}`);
  if (!rl.ok) return { error: "RATE_LIMITED" };
  const allowed = new Set(["checkoutRequestId", "registrySlug", "locale", "registryItemIds", "quantities", "buyerName", "buyerEmail", "buyerPhone", "giftMessage", "isAnonymous", "paymentProvider"]);
  if ([...formData.keys()].some((key) => !key.startsWith("$ACTION_") && !allowed.has(key))) return { error: "INVALID_INPUT" };
  if ([...allowed].some(key => formData.getAll(key).length > 1)) return { error: "INVALID_INPUT" };
  try {
    const parsed = checkoutSchema.safeParse({
      checkoutRequestId: formData.get("checkoutRequestId"),
      registrySlug: formData.get("registrySlug"), locale: formData.get("locale"),
      registryItemIds: JSON.parse(String(formData.get("registryItemIds"))),
      quantities: JSON.parse(String(formData.get("quantities"))),
      buyerName: formData.get("buyerName"), buyerEmail: formData.get("buyerEmail"),
      buyerPhone: formData.get("buyerPhone") || undefined,
      giftMessage: formData.get("giftMessage") || undefined,
      isAnonymous: formData.get("isAnonymous") === "true",
      paymentProvider: formData.get("paymentProvider"),
    });
    if (!parsed.success) return { error: "INVALID_INPUT" };
    return await beginCheckout(parsed.data, session?.user?.id);
  } catch (error) {
    if (error instanceof SyntaxError) return { error: "INVALID_INPUT" };
    if (error instanceof CheckoutError) return { error: error.message };
    console.error("Checkout failed", { code: "CHECKOUT_FAILED" });
    return { error: "CHECKOUT_FAILED" };
  }
}

// External purchases are owner-confirmed, never anonymous client assertions.
export async function confirmExternalPurchase(registryItemId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "UNAUTHORIZED" };
  if (typeof registryItemId !== "string" || registryItemId.length > 100) return { error: "INVALID_INPUT" };
  const item = await db.registryItem.findFirst({
    where: { id: registryItemId, registry: { userId: session.user.id }, source: { in: ["AMAZON", "EXTERNAL"] } },
    select: { registry: { select: { slug: true } } },
  });
  if (!item) return { error: "ITEM_UNAVAILABLE" };
  const count = await db.$executeRaw`
    UPDATE registry_items SET "fulfilledQty" = "fulfilledQty" + 1,
      status = CASE WHEN "fulfilledQty" + 1 = quantity THEN 'FULFILLED'::"ItemStatus" ELSE 'PARTIALLY_FULFILLED'::"ItemStatus" END,
      "updatedAt" = NOW()
    WHERE id = ${registryItemId} AND "fulfilledQty" + "reservedQty" < quantity
  `;
  if (!count) return { error: "ITEM_UNAVAILABLE" };
  revalidatePath(`/r/${item.registry.slug}`, "page");
  return { success: true };
}
