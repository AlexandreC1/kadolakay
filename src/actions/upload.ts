"use server";

import { requireActor } from "@/services/authorization";
import { isAdministrator } from "@/services/permissions";
import { db } from "@/lib/db";
import {
  extensionForContentType,
  generatePresignedUploadUrl,
  getUploadKey,
} from "@/lib/storage";
import { uploadRequestSchema, type UploadRequest } from "@/lib/validators/upload";

type UploadContext = UploadRequest["context"];

/**
 * Verifies that the signed-in user is allowed to upload media into the given
 * context. Avatar uploads target the user themselves; everything else must
 * trace back to a row owned by the user (or an admin).
 */
async function assertContextOwnership(
  context: UploadContext,
  contextId: string,
  userId: string,
  isAdmin: boolean
) {
  if (context === "avatar") {
    if (contextId !== userId) throw new Error("Forbidden");
    return;
  }
  if (isAdmin) return;

  if (context === "registry") {
    const row = await db.registry.findUnique({
      where: { id: contextId },
      select: { userId: true },
    });
    if (!row || row.userId !== userId) throw new Error("Forbidden");
    return;
  }
  if (context === "business") {
    const row = await db.business.findUnique({
      where: { id: contextId },
      select: { ownerId: true },
    });
    if (!row || row.ownerId !== userId) throw new Error("Forbidden");
    return;
  }
  if (context === "product") {
    const row = await db.product.findUnique({
      where: { id: contextId },
      select: { business: { select: { ownerId: true } } },
    });
    if (!row || row.business.ownerId !== userId) throw new Error("Forbidden");
    return;
  }
  // Deny by default: a context nobody wrote a branch for is not allowed.
  throw new Error("Forbidden");
}

export async function getUploadUrl(
  context: UploadContext,
  contextId: string,
  contentType: string,
  fileSize: number
) {
  const actor = await requireActor("upload");

  // Validate every argument at runtime; the TypeScript signature is not
  // enforced for callers of a Server Action.
  const parsed = uploadRequestSchema.safeParse({
    context,
    contextId,
    contentType,
    fileSize,
  });
  if (!parsed.success) {
    throw new Error("Invalid upload request (JPEG, PNG, WebP or GIF, 64 B to 5 MB)");
  }
  const input = parsed.data;

  await assertContextOwnership(
    input.context,
    input.contextId,
    actor.id,
    isAdministrator(actor.role)
  );

  if (!extensionForContentType(input.contentType)) {
    throw new Error("Invalid file type");
  }
  const key = getUploadKey(input.context, input.contextId, input.contentType);
  return generatePresignedUploadUrl(key, input.contentType, input.fileSize);
}
