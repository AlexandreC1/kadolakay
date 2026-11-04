"use server";
import { foundationReason } from "@/lib/foundation-feedback";
import { saveOrderContact } from "@/services/order-contact";
import { z } from "zod";
import { refresh, revalidateTag } from "next/cache";
import { requireActor } from "@/services/authorization";
import { parseFormFields } from "@/lib/validators/shared";
import { entityIdSchema } from "@/lib/validators/entity-id";
import {
  editBusinessProfile,
  replaceProductMedia,
} from "@/services/merchant-workspace";
import {
  transitionFulfillment,
  requestOrderResolution,
  decideOrderResolution,
  recordRefundSent,
} from "@/services/order-operations";
import { changeAccount } from "@/services/backoffice";
import { saveCampaign, setSeasonalEnabled } from "@/services/campaigns";
import {
  beginMfaEnrollment,
  confirmMfaEnrollment,
  verifyMfaStepUp,
} from "@/services/mfa";
import { revokeDeviceSession } from "@/services/device-sessions";
import { checkRateLimit } from "@/lib/rate-limit";
import type { FoundationResult } from "@/lib/foundation-result";
function failed(error: unknown): FoundationResult {
  return {
    reason: foundationReason(error),
    status:
      error instanceof z.ZodError ||
      (error instanceof Error && error.message === "Invalid form fields")
        ? "invalid"
        : error instanceof Error && error.message === "MFA_REQUIRED"
          ? "mfa"
          : "unavailable",
  };
}
function saved(tag?: string): FoundationResult {
  try {
    if (tag) revalidateTag(tag, { expire: 0 });
    refresh();
  } catch {
    /* Mutation committed; a cache refresh failure must not claim a failed save. */
  }
  return { status: "saved" };
}
export async function saveBusinessProfile(
  _s: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("business:edit");
    await editBusinessProfile(
      actor.id,
      parseFormFields(form, [
        "name",
        "description",
        "category",
        "patenteNumber",
        "city",
        "department",
        "address",
        "phone",
        "whatsapp",
        "email",
        "website",
        "fulfillmentPolicy",
      ]),
    );
    return saved("public-catalog");
  } catch (e) {
    return failed(e);
  }
}
export async function savePhotos(
  _s: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("product:edit"),
      raw = parseFormFields(form, ["productId", "urls", "alt"]);
    await replaceProductMedia(actor.id, entityIdSchema.parse(raw.productId), {
      urls:
        raw.urls
          ?.split(/\r?\n/)
          .map((v) => v.trim())
          .filter(Boolean) || [],
      alt: raw.alt || "",
    });
    return saved("public-catalog");
  } catch (e) {
    return failed(e);
  }
}
export async function saveFulfillment(
  _s: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const raw = parseFormFields(form, [
        "orderId",
        "state",
        "method",
        "instructions",
        "businessId",
      ]),
      actor = await requireActor(
        raw.businessId ? "admin:order" : "order:fulfill",
      );
    await transitionFulfillment(actor.id, raw);
    return saved();
  } catch (e) {
    return failed(e);
  }
}
export async function saveOrderRequest(
  _s: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("order:request");
    await requestOrderResolution(
      actor.id,
      parseFormFields(form, ["orderId", "businessId", "kind", "reason"]),
    );
    return saved();
  } catch (e) {
    return failed(e);
  }
}
export async function saveRequestDecision(
  _s: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const raw = parseFormFields(form, ["requestId", "state", "businessId"]),
      actor = await requireActor(
        raw.businessId ? "admin:order" : "order:refund",
      );
    await decideOrderResolution(actor.id, raw);
    return saved();
  } catch (e) {
    return failed(e);
  }
}
export async function saveRefundRecord(
  _s: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const raw = parseFormFields(form, [
        "requestId",
        "method",
        "reference",
        "businessId",
      ]),
      actor = await requireActor(
        raw.businessId ? "admin:order" : "order:refund",
      );
    await recordRefundSent(actor.id, raw);
    return saved();
  } catch (e) {
    return failed(e);
  }
}
export async function saveAccount(
  _s: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("admin:user");
    await changeAccount(
      actor.id,
      parseFormFields(form, ["targetId", "operation", "role"]),
    );
    return saved("public-catalog");
  } catch (e) {
    return failed(e);
  }
}
export async function saveSeasonCampaign(
  _s: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("admin:season"),
      raw = parseFormFields(form, [
        "id",
        "titleEN",
        "titleFR",
        "titleHT",
        "season",
        "kind",
        "occasion",
        "startDate",
        "endDate",
        "priority",
        "enabled",
      ]);
    await saveCampaign(actor.id, {
      ...raw,
      id: raw.id || undefined,
      priority: Number(raw.priority),
      enabled: raw.enabled === "true",
    });
    return saved("season-campaigns");
  } catch (e) {
    return failed(e);
  }
}
export async function saveSeasonSwitch(
  _s: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("admin:season"),
      raw = z
        .strictObject({ enabled: z.enum(["true", "false"]) })
        .parse(parseFormFields(form, ["enabled"]));
    await setSeasonalEnabled(actor.id, raw.enabled === "true");
    return saved("season-campaigns");
  } catch (e) {
    return failed(e);
  }
}
async function securityActor() {
  const actor = await requireActor("security:verify");
  if (!(await checkRateLimit("auth", `mfa:${actor.id}`)).ok)
    throw new Error("RATE_LIMITED");
  return actor;
}
export async function startAuthenticator(
  _s: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    parseFormFields(form, []);
    const actor = await securityActor();
    await beginMfaEnrollment(actor.id, actor.deviceId);
    return saved();
  } catch (e) {
    return failed(e);
  }
}
export type RecoveryResult = FoundationResult & { codes?: string[] };
export async function confirmAuthenticator(
  _s: RecoveryResult,
  form: FormData,
): Promise<RecoveryResult> {
  try {
    const actor = await securityActor(),
      raw = z
        .strictObject({ code: z.string().regex(/^\d{6}$/) })
        .parse(parseFormFields(form, ["code"]));
    const codes = await confirmMfaEnrollment(
      actor.id,
      actor.deviceId,
      raw.code,
    );
    return { status: "saved", codes };
  } catch (e) {
    return failed(e);
  }
}
export async function verifyAuthenticator(
  _s: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await securityActor(),
      raw = z
        .strictObject({ code: z.string().trim().min(6).max(40) })
        .parse(parseFormFields(form, ["code"]));
    await verifyMfaStepUp(actor.id, actor.deviceId, raw.code);
    return saved();
  } catch (e) {
    return failed(e);
  }
}
export async function revokeBrowser(
  _s: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("session:revoke"),
      raw = z
        .strictObject({ deviceId: entityIdSchema })
        .parse(parseFormFields(form, ["deviceId"]));
    await revokeDeviceSession(actor.id, raw.deviceId);
    return saved();
  } catch (e) {
    return failed(e);
  }
}

export async function saveDeliveryContact(
  _s: FoundationResult,
  form: FormData,
): Promise<FoundationResult> {
  try {
    const actor = await requireActor("order:request");
    await saveOrderContact(
      actor.id,
      parseFormFields(form, [
        "orderId",
        "recipientName",
        "phone",
        "city",
        "address",
        "instructions",
      ]),
    );
    return saved();
  } catch (e) {
    return failed(e);
  }
}
