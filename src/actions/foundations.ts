"use server";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActor } from "@/services/authorization";
import {
  grantPremium,
  revokePremium,
  personalizeRegistry,
  requestMerchantPaymentSetup,
} from "@/services/product-foundations";
import { merchantProviderSchema } from "@/services/payment-foundation";
import { parseFormFields } from "@/lib/validators/shared";
import { entityIdSchema } from "@/lib/validators/entity-id";
import { palettes, seasonCookie } from "@/lib/seasons";
import { checkRateLimit } from "@/lib/rate-limit";
import { rateLimitClientKey } from "@/lib/client-ip";
import type { FoundationResult } from "@/lib/foundation-result";

function failure(error: unknown): FoundationResult {
  return {
    status:
      error instanceof z.ZodError ||
      (error instanceof Error && error.message === "Invalid form fields")
        ? "invalid"
        : error instanceof Error && error.message === "PREMIUM_REQUIRED"
          ? "premium"
          : "unavailable",
  };
}
export async function saveMerchantPreference(
  _previous: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("payment:setup");
    const parsed = z
      .object({ provider: merchantProviderSchema })
      .strict()
      .parse(parseFormFields(form, ["provider"]));
    await requestMerchantPaymentSetup(actor.id, parsed.provider);
    revalidatePath("/", "layout");
    return { status: "saved" };
  } catch (error) {
    return failure(error);
  }
}
export async function saveRegistryPalette(
  _previous: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("premium:personalize");
    const parsed = z
      .object({ registryId: entityIdSchema, palette: z.enum(palettes) })
      .strict()
      .parse(parseFormFields(form, ["registryId", "palette"]));
    await personalizeRegistry(actor.id, parsed.registryId, parsed.palette);
    revalidatePath("/", "layout");
    return { status: "saved" };
  } catch (error) {
    return failure(error);
  }
}
export async function savePremiumGrant(
  _previous: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("premium:grant");
    const parsed = z
      .object({
        targetId: entityIdSchema,
        days: z
          .string()
          .regex(/^\d{1,3}$/)
          .transform(Number)
          .pipe(z.number().int().min(1).max(365)),
      })
      .strict()
      .parse(parseFormFields(form, ["targetId", "days"]));
    await grantPremium(
      actor.id,
      parsed.targetId,
      new Date(Date.now() + parsed.days * 86400000),
    );
    revalidatePath("/", "layout");
    return { status: "saved" };
  } catch (error) {
    return failure(error);
  }
}
export async function saveSeasonPreference(
  _previous: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const parsed = z
      .object({ preference: z.enum(["auto", "off"]) })
      .strict()
      .parse(parseFormFields(form, ["preference"]));
    if (
      !(
        await checkRateLimit(
          "general",
          `season:${rateLimitClientKey(await headers())}`,
        )
      ).ok
    )
      return { status: "unavailable" };
    (await cookies()).set(seasonCookie, parsed.preference, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return { status: "saved" };
  } catch (error) {
    return failure(error);
  }
}
export async function removePremiumGrant(
  _previous: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("premium:grant");
    const parsed = z
      .object({ targetId: entityIdSchema })
      .strict()
      .parse(parseFormFields(form, ["targetId"]));
    await revokePremium(actor.id, parsed.targetId);
    revalidatePath("/", "layout");
    return { status: "saved" };
  } catch (error) {
    return failure(error);
  }
}
