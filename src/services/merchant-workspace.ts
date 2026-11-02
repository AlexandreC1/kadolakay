import { z } from "zod";
import { db } from "@/lib/db";
import { parseEntityId } from "@/lib/validators/entity-id";
import { registerBusinessSchema } from "@/lib/validators/business";
import { webUrl } from "@/lib/validators/shared";
import { lockActor } from "./locked-actor";
import { auditOperation } from "./operation-audit";
export const businessProfileSchema = registerBusinessSchema
  .omit({ moncashNumber: true, natcashNumber: true })
  .extend({ fulfillmentPolicy: z.string().trim().max(2000).optional() });
export async function editBusinessProfile(actorId: string, input: unknown) {
  actorId = parseEntityId(actorId);
  const data = businessProfileSchema.parse(input);
  return db.$transaction(async (tx) => {
    await lockActor(tx, actorId, "business:edit");
    await tx.$queryRaw`SELECT id FROM businesses WHERE "ownerId"=${actorId} FOR UPDATE`;
    const b = await tx.business.findUnique({ where: { ownerId: actorId } });
    if (!b || b.status === "SUSPENDED") throw new Error("BUSINESS_UNAVAILABLE");
    const current = b as unknown as Record<string, unknown>;
    if (
      Object.entries(data).every(
        ([key, value]) => (current[key] ?? "") === (value ?? ""),
      )
    )
      return;
    await tx.business.update({
      where: { id: b.id },
      data: {
        ...data,
        ...(b.status === "APPROVED"
          ? { status: "PENDING_REVIEW" as const }
          : {}),
      },
    });
    if (b.status === "APPROVED")
      await tx.securityAuditEvent.create({
        data: {
          actorId,
          action: "BUSINESS_STATUS_CHANGED",
          targetId: b.id,
          previousStatus: b.status,
          nextStatus: "PENDING_REVIEW",
        },
      });
    await auditOperation(
      tx,
      actorId,
      "BUSINESS_PROFILE_EDITED",
      "BUSINESS",
      b.id,
      b.status,
      b.status === "APPROVED" ? "PENDING_REVIEW" : b.status,
    );
  });
}
export const mediaSchema = z.strictObject({
  urls: z
    .array(webUrl.refine((v) => v.startsWith("https://")))
    .max(8)
    .refine((urls) => new Set(urls).size === urls.length),
  alt: z.string().trim().max(200),
});
export async function replaceProductMedia(
  actorId: string,
  productId: string,
  input: unknown,
) {
  actorId = parseEntityId(actorId);
  productId = parseEntityId(productId);
  const data = mediaSchema.parse(input);
  await db.$transaction(async (tx) => {
    await lockActor(tx, actorId, "product:edit");
    await tx.$queryRaw`SELECT id FROM products WHERE id=${productId} FOR UPDATE`;
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        business: { ownerId: actorId, status: { not: "SUSPENDED" } },
      },
      select: { id: true, name: true },
    });
    if (!product) throw new Error("PRODUCT_UNAVAILABLE");
    await tx.productMedia.deleteMany({ where: { productId } });
    if (data.urls.length)
      await tx.productMedia.createMany({
        data: data.urls.map((url, position) => ({
          productId,
          url,
          position,
          alt: data.alt || product.name,
        })),
      });
    await tx.product.update({
      where: { id: productId },
      data: { imageUrl: data.urls[0] || null },
    });
    await auditOperation(
      tx,
      actorId,
      "PRODUCT_MEDIA_CHANGED",
      "PRODUCT",
      productId,
      undefined,
      String(data.urls.length),
    );
  });
}
