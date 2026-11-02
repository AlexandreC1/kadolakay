"use server";
import { foundationReason } from "@/lib/foundation-feedback";
import { z } from "zod";
import { cookies, headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireActor } from "@/services/authorization";
import {
  createBasket,
  updateBasket,
  saveRegistryPrivacy,
  unlockRegistry,
} from "@/services/baskets-privacy";
import { parseFormFields } from "@/lib/validators/shared";
import { entityIdSchema, entitySlugSchema } from "@/lib/validators/entity-id";
import { registryAccessCookie } from "@/lib/registry-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { rateLimitClientKey } from "@/lib/client-ip";
import type { FoundationResult } from "@/lib/foundation-result";
function failure(error: unknown): FoundationResult {
  return {
    reason: foundationReason(error),
    status:
      error instanceof z.ZodError ||
      (error instanceof Error && error.message === "Invalid form fields")
        ? "invalid"
        : "unavailable",
  };
}
const fields = ["title", "recipientName", "recipientMessage", "kind", "type"];
export async function saveNewBasket(
  _state: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  let destination: string;
  try {
    const actor = await requireActor("basket:manage"),
      locale = await getLocale();
    const basket = await createBasket(actor.id, {
      ...parseFormFields(form, fields),
      locale,
    });
    destination = `/${locale}/baskets/${basket.id}`;
  } catch (error) {
    return failure(error);
  }
  redirect(destination);
}
export async function saveBasketDetails(
  _state: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("basket:manage"),
      raw = parseFormFields(form, [...fields, "basketId"]);
    const { basketId, ...input } = raw;
    await updateBasket(actor.id, entityIdSchema.parse(basketId), input);
    refresh();
    return { status: "saved" };
  } catch (error) {
    return failure(error);
  }
}
export async function savePrivacy(
  _state: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("registry:privacy"),
      raw = parseFormFields(form, [
        "registryId",
        "visibility",
        "searchable",
        "password",
      ]);
    await saveRegistryPrivacy(actor.id, {
      ...raw,
      searchable: raw.searchable === "true",
    });
    refresh();
    return { status: "saved" };
  } catch (error) {
    return failure(error);
  }
}
export async function unlockList(
  _state: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  let destination: string;
  try {
    const raw = z
      .strictObject({
        slug: entitySlugSchema,
        password: z.string().min(1).max(128),
      })
      .parse(parseFormFields(form, ["slug", "password"]));
    const key = rateLimitClientKey(await headers());
    if (!(await checkRateLimit("auth", `list-unlock:${key}`)).ok)
      return { status: "unavailable" };
    const grant = await unlockRegistry(raw.slug, raw.password);
    (await cookies()).set(registryAccessCookie(raw.slug), grant, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 1800,
    });
    destination = `/${await getLocale()}/r/${raw.slug}`;
  } catch (error) {
    return failure(error);
  }
  redirect(destination);
}
