"use server";
import { rateLimitClientKey } from "@/lib/client-ip";
import { refresh } from "next/cache";
import { entityIdSchema } from "@/lib/validators/entity-id";
import { saveGuestOrderContact } from "@/services/order-contact";
import { requestGuestOrderResolution } from "@/services/order-operations";
import { z } from "zod";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { parseFormFields } from "@/lib/validators/shared";
import { checkRateLimit } from "@/lib/rate-limit";
import { unlockGuestOrder } from "@/services/guest-orders";
import { orderAccessCookie } from "@/lib/order-access";
import type { FoundationResult } from "@/lib/foundation-result";
export async function openGuestPurchase(
  _state: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  let id: string;
  try {
    const raw = z
      .strictObject({ code: z.uuid() })
      .parse(parseFormFields(form, ["code"]));
    const ip = rateLimitClientKey(await headers());
    if (!(await checkRateLimit("auth", "track:" + ip)).ok)
      return { status: "unavailable" };
    const opened = await unlockGuestOrder(raw.code);
    id = opened.id;
    (await cookies()).set(orderAccessCookie(id), opened.grant, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1800,
      path: "/",
    });
  } catch (error) {
    return { status: error instanceof z.ZodError ? "invalid" : "unavailable" };
  }
  redirect(`/${await getLocale()}/track/${id}`);
}

async function guestMutation(
  form: FormData,
  fields: string[],
  save: (grant: string, input: unknown) => Promise<unknown>,
): Promise<FoundationResult> {
  try {
    const raw = parseFormFields(form, fields),
      id = entityIdSchema.parse(raw.orderId),
      ip = rateLimitClientKey(await headers());
    if (!(await checkRateLimit("auth", "guest-write:" + ip)).ok)
      return { status: "unavailable" };
    const grant = (await cookies()).get(orderAccessCookie(id))?.value;
    if (!grant) return { status: "unavailable" };
    await save(grant, raw);
    try {
      refresh();
    } catch {
      /* Committed mutation. */
    }
    return { status: "saved" };
  } catch (error) {
    return { status: error instanceof z.ZodError ? "invalid" : "unavailable" };
  }
}
export async function saveGuestDelivery(_s: FoundationResult, form: FormData) {
  return guestMutation(
    form,
    ["orderId", "recipientName", "phone", "city", "address", "instructions"],
    saveGuestOrderContact,
  );
}
export async function saveGuestRequest(_s: FoundationResult, form: FormData) {
  return guestMutation(
    form,
    ["orderId", "businessId", "kind", "reason"],
    requestGuestOrderResolution,
  );
}
