"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  extensionForContentType,
  generatePresignedUploadUrl,
  getUploadKey,
} from "@/lib/storage";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const MIN_SIZE = 64; // anything smaller can't be a real image

type UploadContext = "registry" | "product" | "business" | "avatar";

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
}

export async function getUploadUrl(
  context: UploadContext,
  contextId: string,
  contentType: string,
  fileSize: number
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!ALLOWED_TYPES.includes(contentType) || !extensionForContentType(contentType)) {
    throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP, GIF");
  }
  if (!Number.isFinite(fileSize) || fileSize < MIN_SIZE || fileSize > MAX_SIZE) {
    throw new Error("File size out of range (64 B – 5 MB)");
  }

  await assertContextOwnership(
    context,
    contextId,
    session.user.id,
    session.user.role === "ADMIN"
  );

  const key = getUploadKey(context, contextId, contentType);
  return generatePresignedUploadUrl(key, contentType, fileSize);
}
